-- Add new columns to case_submissions table
ALTER TABLE case_submissions
ADD COLUMN IF NOT EXISTS claimant_ref TEXT,
ADD COLUMN IF NOT EXISTS claimant_address TEXT,
ADD COLUMN IF NOT EXISTS defendant_ref TEXT,
ADD COLUMN IF NOT EXISTS defendant_address_on_judgment TEXT,
ADD COLUMN IF NOT EXISTS defendant_moved BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS defendant_current_address TEXT,
ADD COLUMN IF NOT EXISTS claim_number TEXT,
ADD COLUMN IF NOT EXISTS court_making_judgment TEXT,
ADD COLUMN IF NOT EXISTS claiming_fixed_costs TEXT,
ADD COLUMN IF NOT EXISTS amount_of_debt DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS amount_of_costs DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS payments_received JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS hceo_extra_details TEXT;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_case_submissions_claim_number 
ON case_submissions(claim_number);