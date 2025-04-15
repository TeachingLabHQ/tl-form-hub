import { Errorable } from "~/utils/errorable";
import {
  VendorPaymentSubmission,
  VendorPaymentEntry,
  VendorPaymentSubmissionWithEntries,
  CreateVendorPaymentSubmission,
} from "./model";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "../../../supabase/database.types";
export interface VendorPaymentRepository {
  createSubmission(
    submission: CreateVendorPaymentSubmission
  ): Promise<Errorable<VendorPaymentSubmissionWithEntries>>;
  getSubmissionById(id: number): Promise<Errorable<VendorPaymentSubmissionWithEntries>>;
  getSubmissionsByEmail(email: string): Promise<Errorable<VendorPaymentSubmissionWithEntries[]>>;
  deleteSubmission(id: number): Promise<Errorable<void>>;
}

export function vendorPaymentRepository(supabase: SupabaseClient<Database>): VendorPaymentRepository {
  return {
    createSubmission: async (submission) => {
      try {
        // Start a transaction
        const { data: submissionData, error: submissionError } = await supabase
          .from('vendor_payment_submissions')
          .insert({
            cf_email: submission.cf_email,
            cf_name: submission.cf_name,
            cf_tier: submission.cf_tier,
            total_pay: submission.total_pay,
          })
          .select()
          .single();

        if (submissionError) throw submissionError;

        // Insert entries
        const entries = submission.entries.map(entry => ({
          ...entry,
          submission_id: submissionData.id,
        }));

        const { error: entriesError } = await supabase
          .from('vendor_payment_entries')
          .insert(entries);

        if (entriesError) throw entriesError;

        // Fetch the complete submission with entries
        const { data: completeSubmission, error: fetchError } = await supabase
          .from('vendor_payment_submissions')
          .select(`
            *,
            entries:vendor_payment_entries(*)
          `)
          .eq('id', submissionData.id)
          .single();

        if (fetchError) throw fetchError;

        return { data: completeSubmission, error: null };
      } catch (e) {
        console.error(e);
        return {
          data: null,
          error: new Error("Failed to create vendor payment submission"),
        };
      }
    },

    getSubmissionById: async (id) => {
      try {
        const { data, error } = await supabase
          .from('vendor_payment_submissions')
          .select(`
            *,
            entries:vendor_payment_entries(*)
          `)
          .eq('id', id)
          .single();

        if (error) throw error;
        return { data, error: null };
      } catch (e) {
        console.error(e);
        return {
          data: null,
          error: new Error("Failed to fetch vendor payment submission"),
        };
      }
    },

    getSubmissionsByEmail: async (email) => {
      try {
        const { data, error } = await supabase
          .from('vendor_payment_submissions')
          .select(`
            *,
            entries:vendor_payment_entries(*)
          `)
          .eq('cf_email', email)
          .order('created_at', { ascending: false });

        if (error) throw error;
        return { data, error: null };
      } catch (e) {
        console.error(e);
        return {
          data: null,
          error: new Error("Failed to fetch vendor payment submissions"),
        };
      }
    },

    deleteSubmission: async (id) => {
      try {
        const { error } = await supabase
          .from('vendor_payment_submissions')
          .delete()
          .eq('id', id);

        if (error) throw error;
        return { data: undefined, error: null };
      } catch (e) {
        console.error(e);
        return {
          data: null,
          error: new Error("Failed to delete vendor payment submission"),
        };
      }
    },
  };
} 