-- Update vendor_payment_submissions table schema
-- Change VARCHAR columns to text for better flexibility and add missing deletion policy

-- First, drop ALL policies that reference cf_email column (including from other tables)
DROP POLICY IF EXISTS "Users can view entries for their submissions" ON vendor_payment_entries;
DROP POLICY IF EXISTS "Users can insert entries for their submissions" ON vendor_payment_entries;
DROP POLICY IF EXISTS "Users can view their own submissions" ON vendor_payment_submissions;
DROP POLICY IF EXISTS "Users can insert their own submissions" ON vendor_payment_submissions;

-- Now alter the column types (after dropping policies that use them)
ALTER TABLE vendor_payment_submissions 
ALTER COLUMN cf_email TYPE text;

ALTER TABLE vendor_payment_submissions 
ALTER COLUMN cf_name TYPE text;

ALTER TABLE vendor_payment_submissions 
ALTER COLUMN cf_tier TYPE text;

-- Recreate policies with correct auth.email() usage
CREATE POLICY "Users can view their own submissions based on email"
ON vendor_payment_submissions
FOR SELECT
USING (auth.email() = cf_email);

CREATE POLICY "Users can insert their own submissions"
ON vendor_payment_submissions
FOR INSERT
WITH CHECK (auth.email() = cf_email);

-- Add the missing deletion policy that wasn't in the original migration
CREATE POLICY "Users can delete their own submissions"
ON vendor_payment_submissions
FOR DELETE
USING (auth.email() = cf_email);

-- Recreate the vendor_payment_entries policies that we dropped (with updated auth method)
CREATE POLICY "Users can view entries for their submissions"
ON vendor_payment_entries
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM vendor_payment_submissions
        WHERE vendor_payment_submissions.id = vendor_payment_entries.submission_id
        AND vendor_payment_submissions.cf_email = auth.email()::text
    )
);

CREATE POLICY "Users can insert entries for their submissions"
ON vendor_payment_entries
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM vendor_payment_submissions
        WHERE vendor_payment_submissions.id = vendor_payment_entries.submission_id
        AND vendor_payment_submissions.cf_email = auth.email()::text
    )
);

-- Add the missing deletion policy for vendor_payment_entries
CREATE POLICY "Users can delete entries for their submissions"
ON vendor_payment_entries
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM vendor_payment_submissions
        WHERE vendor_payment_submissions.id = vendor_payment_entries.submission_id
        AND vendor_payment_submissions.cf_email = auth.email()::text
    )
); 