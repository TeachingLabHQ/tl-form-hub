// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { generateProjectPDF } from "./pdf-generator.ts";
import { sendProjectEmail } from "./utils.ts";

// --- Configuration ---
const BATCH_SIZE = 15; // Process 15 emails per invocation
const EMAIL_DELAY_MS = 600; // 600ms between emails (Resend allows 2 requests/second)

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

// --- Define interfaces ---

//note to self: The function first fetch all submission entries available for the current month. By going through each submission and each entry, we are able to group the entries by project and then by person in the projectsMap.
//Then, we loop through each project and each person within the project. We check if we have already sent an email to this person for this project this month. If we have, we skip to the next person.
//If we have not sent an email to this person for this project this month, we generate a PDF and send an email to the person.
//We then update the email log to 'sent' status.

// Represents a single detailed work entry
interface DetailedEntry {
  task_name: string;
  work_hours: number;
  rate: number;
  entry_pay: number;
  submission_date?: string; // Include submission_date field
}

// Represents one person's summary for a specific project
export interface PersonProjectSummary {
  cf_name: string;
  cf_email: string;
  cf_tier: string;
  totalPayForProject: number; // This person's total pay for this project
  detailedEntries: DetailedEntry[]; // This person's entries for this project
  submission_date: string;
}

// Represents all data for a single project, grouped by person
interface ProjectGroupedData {
  projectName: string;
  peopleSummaries: PersonProjectSummary[]; // Array of summaries, one per person
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

      // Get all submissions for the previous month
      console.log("Fetching submissions from database...");
      const { data: submissions, error: submissionsError } = await supabase
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
            project_name,
            work_hours,
            rate,
            entry_pay
          )
        `)
        .gte("submission_date", previousMonthISO)
        //the current month's data won't be included until the 6th of the month
        .lt("submission_date", currentMonthISO);

      if (submissionsError) {
        console.error(`Error fetching submissions: ${JSON.stringify(submissionsError)}`);
        throw submissionsError;
      }

      console.log(`Found ${submissions?.length || 0} submissions`);
      if (!submissions || submissions.length === 0) {
        return new Response(
          JSON.stringify({ message: `No submissions found for the previous month. ${previousMonthISO} to ${currentMonthISO} + ${submissions}`  }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      // Group entries by project and then by person
      console.log("Grouping entries by project and person...");
      // Use: Map<string, ProjectGroupedData>
      const projectsMap = new Map<string, ProjectGroupedData>();

      for (const submission of submissions) {
        // Ensure submission.entries is an array before iterating
        const entries = Array.isArray(submission.entries) ? submission.entries : [];

        for (const entry of entries) {
          const projectName = entry.project_name || "Unassigned";
          const personEmail = submission.cf_email; // Key for the person

          // Ensure entry_pay is a valid number, default to 0 if not
          const entryPay = typeof entry.entry_pay === 'number' && !isNaN(entry.entry_pay) ? entry.entry_pay : 0;

          // Get or create project data
          let projectData = projectsMap.get(projectName);
          if (!projectData) {
            projectData = {
              projectName: projectName,
              peopleSummaries: [], // Initialize as empty array
            };
            projectsMap.set(projectName, projectData);
          }

          // Find or create person's summary within the project
          let personSummary = projectData.peopleSummaries.find(p => p.cf_email === personEmail);
          if (!personSummary) {
            personSummary = {
              cf_name: submission.cf_name,
              cf_email: submission.cf_email,
              cf_tier: submission.cf_tier,
              totalPayForProject: 0,
              detailedEntries: [],
              submission_date: submission.submission_date,
            };
            projectData.peopleSummaries.push(personSummary);
          }

          // Add or aggregate the detailed entry to the person's summary
          const taskName = entry.task_name;
          //only aggregate entries if they have the same submission_date and task_name
          const existingEntryIndex = personSummary.detailedEntries.findIndex(de => de.task_name === taskName && de.submission_date === submission.submission_date);

          if (existingEntryIndex > -1) {
            // Aggregate hours and pay if task already exists on the same day
            personSummary.detailedEntries[existingEntryIndex].work_hours += entry.work_hours; 
            personSummary.detailedEntries[existingEntryIndex].entry_pay += entryPay;
            // Assuming rate is consistent for the same task by the same person
          } else {
            // Push new entry if task doesn't exist
            personSummary.detailedEntries.push({
              task_name: taskName,
              work_hours: entry.work_hours, // Assuming these are valid numbers
              rate: entry.rate, // Assuming rate is valid
              entry_pay: entryPay,
              submission_date: submission.submission_date,
            });
          }

          // Update total pay for the person for this project
          personSummary.totalPayForProject += entryPay;
        }
      }
      console.log(`Grouped entries into ${projectsMap.size} projects.`);

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

      // --- NEW: Build list of pending person/project combinations ---
      console.log("Building list of pending email combinations...");
      interface PendingCombo {
        projectName: string;
        personSummary: PersonProjectSummary;
      }
      const pendingCombos: PendingCombo[] = [];

      for (const [projectName, projectData] of projectsMap.entries()) {
        for (const personSummary of projectData.peopleSummaries) {
          const key = `${projectName}|${personSummary.cf_email}`;
          if (!sentSet.has(key)) {
            pendingCombos.push({ projectName, personSummary });
          } else {
            console.log(`-- Skipping already-sent: ${personSummary.cf_email} / ${projectName}`);
          }
        }
      }

      console.log(`Total pending emails: ${pendingCombos.length}`);
      
      // --- NEW: Limit to batch size ---
      const batch = pendingCombos.slice(0, BATCH_SIZE);
      const remainingAfterBatch = pendingCombos.length - batch.length;
      console.log(`Processing batch of ${batch.length} emails (${remainingAfterBatch} will remain after this batch)`);

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
            
            console.log(`Successfully triggered next batch processing`);
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
