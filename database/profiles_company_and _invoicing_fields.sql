-- Add new columns to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'individual' CHECK (account_type IN ('individual', 'company')),
ADD COLUMN IF NOT EXISTS company_name TEXT,
ADD COLUMN IF NOT EXISTS invoice_email TEXT;

-- Add comment to document the columns
COMMENT ON COLUMN profiles.account_type IS 'Whether user is registering as individual or company';
COMMENT ON COLUMN profiles.company_name IS 'Company name if registering on behalf of a company';
COMMENT ON COLUMN profiles.invoice_email IS 'Alternative email address for invoices (optional)';

-- Add index for company lookups
CREATE INDEX IF NOT EXISTS idx_profiles_company_name ON profiles(company_name) WHERE company_name IS NOT NULL;

-- Add validation for invoice email format
ALTER TABLE profiles
ADD CONSTRAINT check_invoice_email_format
CHECK (
  invoice_email IS NULL OR 
  invoice_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
);