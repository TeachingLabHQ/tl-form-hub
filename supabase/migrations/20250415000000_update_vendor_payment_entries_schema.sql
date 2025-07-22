-- Update vendor_payment_entries table schema
-- Change VARCHAR(255) columns to text for better flexibility

-- Alter the column types only (all policies will be handled by the submissions migration)
ALTER TABLE vendor_payment_entries 
ALTER COLUMN task_name TYPE text;

ALTER TABLE vendor_payment_entries 
ALTER COLUMN project_name TYPE text; 