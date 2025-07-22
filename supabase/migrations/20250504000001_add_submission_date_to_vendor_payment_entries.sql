-- Add submission_date column to vendor_payment_entries table
ALTER TABLE vendor_payment_entries 
ADD COLUMN IF NOT EXISTS submission_date DATE;

COMMENT ON COLUMN vendor_payment_entries.submission_date IS 'The date for which the work was performed';

-- Update existing entries with submission date from their parent submission
UPDATE vendor_payment_entries e
SET submission_date = s.submission_date
FROM vendor_payment_submissions s
WHERE e.submission_id = s.id
AND e.submission_date IS NULL
AND s.submission_date IS NOT NULL; 