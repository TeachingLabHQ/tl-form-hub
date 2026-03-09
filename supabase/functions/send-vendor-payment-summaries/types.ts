// Shared types for send-vendor-payment-summaries.
// Kept separate from `index.ts` so importing types doesn't execute the function server.

export interface DetailedEntry {
  task_name: string;
  note?: string | null;
  work_hours: number;
  rate: number;
  entry_pay: number;
  submission_date?: string; // Include submission_date field
}

export interface PersonProjectSummary {
  cf_name: string;
  cf_email: string;
  cf_tier: string;
  totalPayForProject: number; // This person's total pay for this project
  detailedEntries: DetailedEntry[]; // This person's entries for this project
  submission_date: string;
}

export interface VendorPaymentSubmission {
  id: number;
  cf_email: string;
  cf_name: string;
  cf_tier: string;
  total_pay: number;
  created_at: string;
  entries: {
    task_name: string;
    project_name: string;
    work_hours: number;
    rate: number;
    entry_pay: number;
  }[];
}

export interface EmailLog {
  id: number;
  submission_id: number;
  month: string;
  sent_at: string | null;
  status: string;
  error_message: string | null;
} 