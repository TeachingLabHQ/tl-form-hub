-- Update vendor_payment_email_logs table structure
-- Remove submission_id column and add project_name/cf_email columns

-- Drop existing RLS policy
DROP POLICY IF EXISTS "Users can read their own email logs" ON public.vendor_payment_email_logs;

-- Drop existing index on submission_id
DROP INDEX IF EXISTS public.idx_vendor_payment_email_logs_submission_id;

-- Remove submission_id column
ALTER TABLE public.vendor_payment_email_logs DROP COLUMN IF EXISTS submission_id;

-- Add new columns
ALTER TABLE public.vendor_payment_email_logs 
ADD COLUMN IF NOT EXISTS project_name text null,
ADD COLUMN IF NOT EXISTS cf_email text null;

-- Add unique constraint
ALTER TABLE public.vendor_payment_email_logs 
ADD CONSTRAINT unique_project_person_month UNIQUE (project_name, cf_email, month);

-- Drop old unique constraint if it exists (handle migration scenario)
-- Note: This might need adjustment based on actual migration management
DO $$
BEGIN
  IF EXISTS(
    SELECT constraint_name
    FROM information_schema.table_constraints
    WHERE table_schema = 'public' AND table_name = 'vendor_payment_email_logs' AND constraint_name = 'unique_project_month'
  ) THEN
    ALTER TABLE public.vendor_payment_email_logs DROP CONSTRAINT unique_project_month;
  END IF;
END
$$;

-- Drop old index if it exists
DROP INDEX IF EXISTS public.idx_vendor_payment_email_logs_project_month;

-- Create index for faster lookups on month
CREATE INDEX IF NOT EXISTS idx_vendor_payment_email_logs_month 
  ON public.vendor_payment_email_logs(month);

-- Update index for project/person lookups
CREATE INDEX IF NOT EXISTS idx_vendor_payment_email_logs_project_person_month 
  ON public.vendor_payment_email_logs(project_name, cf_email, month); 