-- Drop unique constraint from vendor_payment_email_logs table
DO $$
BEGIN
  IF EXISTS(
    SELECT constraint_name
    FROM information_schema.table_constraints
    WHERE table_schema = 'public' 
    AND table_name = 'vendor_payment_email_logs' 
    AND constraint_name = 'unique_project_person_month'
  ) THEN
    ALTER TABLE public.vendor_payment_email_logs DROP CONSTRAINT unique_project_person_month;
  END IF;
END
$$; 