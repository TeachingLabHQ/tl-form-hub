-- Add note column to vendor_payment_entries (per-entry memo)
ALTER TABLE vendor_payment_entries
ADD COLUMN IF NOT EXISTS note text;

COMMENT ON COLUMN vendor_payment_entries.note IS 'Optional per-entry memo provided by the vendor';

