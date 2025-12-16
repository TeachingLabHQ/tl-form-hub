export interface VendorPaymentSubmission {
  id: number;
  cf_email: string;
  cf_name: string;
  cf_tier: string;
  total_pay: number;
  submission_date: Date|string|null;
  created_at: Date|string|null;
  updated_at: Date|string|null;
}

export interface VendorPaymentEntry {
  id: number;
  submission_id: number;
  task_name: string;
  project_name: string;
  note: string | null;
  work_hours: number;
  rate: number;
  entry_pay: number;
  submission_date: Date|string|null;
  created_at: Date|string|null;
  updated_at: Date|string|null;
}

export interface VendorPaymentSubmissionWithEntries extends VendorPaymentSubmission {
  entries: VendorPaymentEntry[];
}

export interface CreateVendorPaymentSubmission {
  cf_email: string;
  cf_name: string;
  cf_tier: string;
  total_pay: number;
  submission_date: Date|string|null;
  entries: Omit<VendorPaymentEntry, 'id' | 'submission_id' | 'created_at' | 'updated_at'>[];
} 