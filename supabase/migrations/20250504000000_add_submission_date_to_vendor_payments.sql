-- Add submissionDate column to vendor_payment_submissions table
ALTER TABLE vendor_payment_submissions 
ADD COLUMN IF NOT EXISTS submission_date DATE;

COMMENT ON COLUMN vendor_payment_submissions.submission_date IS 'The date for which the work was submitted';

-- Update existing records to use created_at date (optional)
UPDATE vendor_payment_submissions
SET submission_date = DATE(created_at)
WHERE submission_date IS NULL; 