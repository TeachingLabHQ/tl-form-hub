// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { generateProjectPDF } from "./pdf-generator.ts";
import { sendProjectEmail } from "./utils.ts";
import { PersonProjectSummary } from "./types.ts";

// --- Configuration ---
const BATCH_SIZE = 5; // Process fewer project/person summaries per invocation
const SUBMISSION_PAGE_SIZE = 50; // Scan monthly submissions in pages to cap peak memory use
const EMAIL_DELAY_MS = 600; // 600ms between emails (Resend allows 2 requests/second)
const NEXT_BATCH_GRACE_MS = 2000; // Give the self-invocation request time to leave the worker

// --- Helper function for delay ---
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- Helper function to safely extract error message ---
const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }
  return 'Unknown error occurred';
};

interface SubmissionEntry {
  task_name: string;
  note?: string | null;
  project_name?: string | null;
  work_hours: number;
  rate: number;
  entry_pay: number | null;
}

interface SubmissionRecord {
  cf_email: string;
  cf_name: string;
  cf_tier: string;
  submission_date: string;
  entries: SubmissionEntry[] | null;
}

interface PendingCombo {
  projectName: string;
  personSummary: PersonProjectSummary;
}

const getComboKey = (projectName: string, personEmail: string): string =>
  `${projectName}|${personEmail}`;

const createPersonSummary = (submission: SubmissionRecord): PersonProjectSummary => ({
  cf_name: submission.cf_name,
  cf_email: submission.cf_email,
  cf_tier: submission.cf_tier,
  totalPayForProject: 0,
  detailedEntries: [],
  submission_date: submission.submission_date,
});

const updatePersonSummaryTotals = (
  personSummary: PersonProjectSummary,
  submission: SubmissionRecord,
  entry: SubmissionEntry,
) => {
  const entryPay =
    typeof entry.entry_pay === "number" && !Number.isNaN(entry.entry_pay) ? entry.entry_pay : 0;
  const taskName = entry.task_name;
  const note = entry.note;
  const existingEntryIndex = personSummary.detailedEntries.findIndex(
    (detailedEntry) =>
      detailedEntry.task_name === taskName &&
      detailedEntry.submission_date === submission.submission_date &&
      detailedEntry.note === note,
  );

  if (existingEntryIndex > -1) {
    personSummary.detailedEntries[existingEntryIndex].work_hours += entry.work_hours;
    personSummary.detailedEntries[existingEntryIndex].entry_pay += entryPay;
  } else {
    personSummary.detailedEntries.push({
      task_name: taskName,
      note,
      work_hours: entry.work_hours,
      rate: entry.rate,
      entry_pay: entryPay,
      submission_date: submission.submission_date,
    });
  }

  personSummary.totalPayForProject += entryPay;
}

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing required environment variables: SUPABASE_URL and SUPABASE_ANON_KEY');
}

console.log("Initializing Supabase client...");
console.log(`Supabase URL: ${supabaseUrl}`);
console.log(`Supabase Key exists: ${!!supabaseKey}`);

try {
  const supabase = createClient(supabaseUrl, supabaseKey);
  console.log("Supabase client initialized successfully");

  serve(async (req) => {
    try {
      // Only allow POST requests
      if (req.method !== "POST") {
        console.log("Invalid request method");
        return new Response(
          JSON.stringify({ error: "Method not allowed" }),
          { status: 405, headers: { "Content-Type": "application/json" } }
        );
      }

      // Get previous month (since this function runs on the 6th of each month to process previous month's data)
      const currentDate = new Date();
      const previousMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
      const previousMonthISO = previousMonth.toISOString();
      const currentMonthISO = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString();
      console.log(`Processing submissions for previous month: ${previousMonthISO} to ${currentMonthISO}`);

      // --- NEW: Query existing email logs to filter out already-sent combinations ---
      console.log("Querying existing email logs to check what's already sent...");
      const { data: sentLogs, error: sentLogsError } = await supabase
        .from("vendor_payment_email_logs")
        .select('project_name, cf_email, status')
        .eq('month', previousMonthISO)
        .eq('status', 'sent');

      if (sentLogsError) {
        console.error(`Error fetching sent logs: ${JSON.stringify(sentLogsError)}`);
        // Continue anyway - worst case we'll try to insert and get duplicate error
      }

      // Create set of already-sent combinations for quick lookup
      const sentSet = new Set<string>();
      if (sentLogs && sentLogs.length > 0) {
        sentLogs.forEach(log => {
          const key = `${log.project_name}|${log.cf_email}`;
          sentSet.add(key);
        });
        console.log(`Found ${sentLogs.length} already-sent email logs`);
      } else {
        console.log("No previously sent emails found for this month");
      }

      // Scan submissions page-by-page and keep only a small set of unsent combos in memory.
      console.log("Selecting the next batch of pending email combinations...");
      const selectedCombos = new Map<string, PendingCombo>();
      const remainingPendingKeys = new Set<string>();
      let submissionOffset = 0;
      let totalSubmissionsScanned = 0;
      let foundAnySubmission = false;

      while (true) {
        const pageStart = submissionOffset;
        const pageEnd = submissionOffset + SUBMISSION_PAGE_SIZE - 1;
        console.log(`Fetching submissions page ${pageStart}-${pageEnd}...`);

        const { data: submissionsPage, error: submissionsError } = await supabase
          .from("vendor_payment_submissions")
          .select(`
            id,
            cf_email,
            cf_name,
            cf_tier,
            total_pay,
            created_at,
            submission_date,
            entries:vendor_payment_entries(
              task_name,
              note,
              project_name,
              work_hours,
              rate,
              entry_pay
            )
          `)
          .gte("submission_date", previousMonthISO)
          .lt("submission_date", currentMonthISO)
          .order("id", { ascending: true })
          .range(pageStart, pageEnd);

        if (submissionsError) {
          console.error(`Error fetching submissions page ${pageStart}-${pageEnd}: ${JSON.stringify(submissionsError)}`);
          throw submissionsError;
        }

        if (!submissionsPage || submissionsPage.length === 0) {
          break;
        }

        foundAnySubmission = true;
        totalSubmissionsScanned += submissionsPage.length;

        for (const submission of submissionsPage as SubmissionRecord[]) {
          const entries = Array.isArray(submission.entries) ? submission.entries : [];

          for (const entry of entries) {
            const projectName = entry.project_name || "Unassigned";
            const comboKey = getComboKey(projectName, submission.cf_email);

            if (sentSet.has(comboKey)) {
              continue;
            }

            let combo = selectedCombos.get(comboKey);
            if (!combo) {
              if (selectedCombos.size >= BATCH_SIZE) {
                remainingPendingKeys.add(comboKey);
                continue;
              }

              combo = {
                projectName,
                personSummary: createPersonSummary(submission),
              };
              selectedCombos.set(comboKey, combo);
            }

            updatePersonSummaryTotals(combo.personSummary, submission, entry);
          }
        }

        if (submissionsPage.length < SUBMISSION_PAGE_SIZE) {
          break;
        }

        submissionOffset += SUBMISSION_PAGE_SIZE;
      }

      console.log(`Scanned ${totalSubmissionsScanned} submissions to build the next batch.`);
      if (!foundAnySubmission) {
        return new Response(
          JSON.stringify({ message: `No submissions found for the previous month. ${previousMonthISO} to ${currentMonthISO}` }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      const batch = Array.from(selectedCombos.values());
      const remainingAfterBatch = remainingPendingKeys.size;
      console.log(`Processing batch of ${batch.length} emails (${remainingAfterBatch} additional combos remain)`); 

      // Process the batch
      let processedEmailCount = 0;
      let failedEmailCount = 0;
      let totalEmailsAttempted = 0;

      for (const { projectName, personSummary } of batch) {
        totalEmailsAttempted++;
        const personEmail = personSummary.cf_email;
        console.log(`-- Processing person: ${personEmail} for project: ${projectName}`);

        let logId: number | null = null;

        try {
          // Create 'pending' email log entry for the person/project
          console.log(`-- Creating 'pending' email log for ${personEmail} on project ${projectName}`);
          const { data: newLogData, error: logInsertError } = await supabase
            .from("vendor_payment_email_logs")
            .insert({
              project_name: projectName,
              cf_email: personEmail, // Add cf_email
              month: previousMonthISO,
              status: "pending",
            })
            .select('id')
            .single();

          if (logInsertError) {
            console.error(`-- Error creating 'pending' log for ${personEmail}/${projectName}: ${JSON.stringify(logInsertError)}`);
            failedEmailCount++;
            continue; // Skip this person/project combination
          }
          logId = newLogData?.id;
          console.log(`-- Pending log created with ID: ${logId} for ${personEmail}/${projectName}`);

          // Generate PDF for this person's entries in this project
          console.log(`-- Generating PDF for ${personEmail} on project ${projectName}`);
          const pdf = await generateProjectPDF(projectName, personSummary, logId); // Pass person-specific summary
          console.log(`-- PDF generated successfully for ${personEmail}/${projectName}`);

          // Send email to this person for this project
          console.log(`-- Sending email to ${personEmail} for project ${projectName}`);
          await sendProjectEmail(
            projectName,
            personSummary, // Pass the necessary summary details
            pdf,
          );
          console.log(`-- Email sent successfully to ${personEmail} for project ${projectName}`);

          // Update email log to 'sent' status
          console.log(`-- Updating log to 'sent' for ${personEmail}/${projectName} (Log ID: ${logId})`);
          const { error: updateSentError } = await supabase
            .from("vendor_payment_email_logs")
            .update({
              status: "sent",
              sent_at: new Date().toISOString(),
            })
            .eq("id", logId); // Update using the specific log ID

          if (updateSentError) {
            console.error(`-- Error updating log to 'sent' for ${personEmail}/${projectName}: ${JSON.stringify(updateSentError)}`);
            // Log the error, but count as processed as email was sent
          } else {
            console.log(`-- Log status updated to 'sent' for ${personEmail}/${projectName}`);
          }
          processedEmailCount++;

        } catch (error) {
          failedEmailCount++;
          console.error(`-- Error processing email for ${personEmail} on project ${projectName}: ${JSON.stringify(error)}`);
          // If an error occurred (PDF gen or email send), update log to 'failed' if logId exists
          if (logId) {
            console.log(`-- Updating log status to 'failed' for ${personEmail}/${projectName} (Log ID: ${logId})`);
            const { error: updateFailedError } = await supabase
              .from("vendor_payment_email_logs")
              .update({
                status: "failed",
                error_message: getErrorMessage(error), // Store error message
              })
              .eq("id", logId); // Update using the specific log ID

            if (updateFailedError) {
              console.error(`-- CRITICAL: Error updating email log to 'failed' for ${personEmail}/${projectName} after processing failure: ${JSON.stringify(updateFailedError)}`);
            } else {
              console.log(`-- Log status updated to 'failed' for ${personEmail}/${projectName}`);
            }
          } else {
            console.error(`-- Could not update log status to 'failed' for ${personEmail}/${projectName} because log ID was not obtained.`);
            // Consider inserting a 'failed' log here if possible/desired, including cf_email
            try {
              await supabase.from("vendor_payment_email_logs").insert({
                project_name: projectName,
                cf_email: personEmail,
                month: previousMonthISO,
                status: "failed",
                error_message: `Processing failed before log ID obtained: ${getErrorMessage(error)}`,
              });
              console.log(`-- Inserted substitute 'failed' log for ${personEmail}/${projectName}`);
            } catch (insertFailError) {
              console.error(`-- CRITICAL: Failed to insert substitute 'failed' log for ${personEmail}/${projectName}: ${JSON.stringify(insertFailError)}`);
            }
          }
        }
        
        // --- Add delay between sending emails to avoid rate limiting ---
        console.log(`-- Adding delay before next email...`);
        await sleep(EMAIL_DELAY_MS);
      } // End loop through batch

      // --- NEW: Self-invocation logic for remaining emails ---
      if (remainingAfterBatch > 0) {
        console.log(`\n=== TRIGGERING NEXT BATCH ===`);
        console.log(`Remaining emails to process: ${remainingAfterBatch}`);
        
        try {
          // Self-invoke the function to process next batch (async, don't wait for response)
          const supabaseUrl = Deno.env.get('SUPABASE_URL');
          const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
          
          if (supabaseUrl && supabaseAnonKey) {
            // Fire and forget - don't await the response
            fetch(`${supabaseUrl}/functions/v1/send-vendor-payment-summaries`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${supabaseAnonKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({})
            }).catch(err => {
              console.error('Failed to trigger next batch:', err);
            });
            
            console.log(`Started next batch request; waiting briefly before exit`);
            await sleep(NEXT_BATCH_GRACE_MS);
            console.log(`Finished handoff grace period for next batch request`);
          } else {
            console.error('Cannot trigger next batch: Missing SUPABASE_URL or SUPABASE_ANON_KEY');
          }
        } catch (error) {
          console.error('Error triggering next batch:', error);
          // Continue anyway - function can be manually re-run or triggered by next month's cron
        }
      } else {
        console.log(`\n=== ALL EMAILS PROCESSED ===`);
        console.log(`No remaining emails. Batch processing complete!`);
      }

      // Final Response with batch information
      const responseMessage = `Batch processing completed. Processed: ${processedEmailCount}, Failed: ${failedEmailCount}, Remaining: ${remainingAfterBatch}.`;
      console.log(responseMessage);
      return new Response(
        JSON.stringify({
          message: responseMessage,
          batchComplete: true,
          processedInThisBatch: processedEmailCount,
          failedInThisBatch: failedEmailCount,
          totalAttemptedInThisBatch: totalEmailsAttempted,
          remainingAfterBatch: remainingAfterBatch,
          allComplete: remainingAfterBatch === 0,
          nextBatchTriggered: remainingAfterBatch > 0
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );

    } catch (error) {
      console.error(`Global error: ${JSON.stringify(error)}`);
      return new Response(
        JSON.stringify({ 
          error: getErrorMessage(error),
          stack: error instanceof Error ? error.stack : undefined,
          name: error instanceof Error ? error.name : typeof error
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  });
} catch (error) {
  console.error("Failed to initialize Supabase client:", error);
  throw error;
}

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/send-vendor-payment-summaries' \
    --header 'Authorization: Bearer ' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
