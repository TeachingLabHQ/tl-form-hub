import { Resend } from "https://esm.sh/resend@2.0.0";
import { PersonProjectSummary } from "./types.ts";

// Initialize Resend client
const resend = new Resend(Deno.env.get("RESEND_API_KEY")); // Env var dones't work for localhost testing

const escHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");



// --- Updated Email Sending Function ---
export async function sendProjectEmail(
    projectName: string,
    personSummary: PersonProjectSummary, // Pass the person's summary object
    pdf: Uint8Array,
    docx: Uint8Array,
  ): Promise<void> {
    const recipientEmail = ["yancheng.pan@teachinglab.org", "accountspayable@teachinglab.org", personSummary.cf_email];
    console.log(`Starting email sending for ${personSummary.cf_name} (${personSummary.cf_email}) on project: ${projectName}`);
    try {
      const supportEmail = Deno.env.get("SUPPORT_EMAIL") || "support@example.com";

      const toBase64 = (bytes: Uint8Array): string => {
        let binary = "";
        const chunkSize = 8192;
        for (let i = 0; i < bytes.length; i += chunkSize) {
          binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
        }
        return btoa(binary);
      };

      const pdfBase64 = toBase64(pdf);
      const docxBase64 = toBase64(docx);
      console.log(`PDF Base64 length: ${pdfBase64.length}`);
      console.log(`DOCX Base64 length: ${docxBase64.length}`);
      const reportMonthYear = new Date().toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
      const baseName = `TeachingLab-PaymentSummary-${personSummary.cf_name.replace(/\s+/g, '')}-${projectName.replace(/\s+/g, '_')}-${reportMonthYear}`;

      const emailData = {
        from: "Teaching Lab Payments <yancheng.pan@teachinglab.org>", // Use sender name
        to: recipientEmail,
        subject: `Your Teaching Lab Payment Summary - ${projectName} - ${reportMonthYear}`, // Person-specific subject
        html: `
          <h1>Teaching Lab - Payment Summary</h1>
          <p>Hello,</p>
          <p>Please find attached your payment summary for project <strong>${escHtml(projectName)}</strong> for the period ending ${escHtml(reportMonthYear)}.</p>
          <p>Total payment for the project member in this period: <strong>$${personSummary.totalPayForProject.toFixed(2)}</strong></p>
          <p>Two versions of the invoice are attached: a PDF for your records and an editable Word document in case you need to make any corrections.</p>
          <p>If you have any questions, please contact ${escHtml(supportEmail)}.</p>
          <p>Best regards,<br>Teaching Lab FinanceTeam</p>
        `,
        attachments: [
          {
            filename: `${baseName}.pdf`,
            content: pdfBase64,
            contentType: 'application/pdf',
          },
          {
            filename: `${baseName}.docx`,
            content: docxBase64,
            contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          },
        ]
      };
  
      console.log(`Sending email to ${recipientEmail} for ${projectName}...`);
      const { data, error } = await resend.emails.send(emailData);
  
      if (error) {
        console.error(`Error sending email to ${recipientEmail} for project ${projectName}:`, JSON.stringify(error));
        throw new Error(`Failed to send email: ${JSON.stringify(error)}`);
      }
  
      console.log(`Email sent successfully to ${recipientEmail} for project ${projectName}:`, data?.id);
    } catch (error) {
      console.error(`Error in sendProjectEmail function for ${recipientEmail}, project ${projectName}:`, error);
      throw error;
    }
  }