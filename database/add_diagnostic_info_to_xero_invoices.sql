-- Add diagnostic_info column to xero_invoices table
ALTER TABLE xero_invoices ADD COLUMN IF NOT EXISTS diagnostic_info JSONB;

-- Update existing records with empty object if null
UPDATE xero_invoices SET diagnostic_info = '{}'::jsonb WHERE diagnostic_info IS NULL;

