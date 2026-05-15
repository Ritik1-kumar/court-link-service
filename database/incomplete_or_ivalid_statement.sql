-- Migration: Add assigned_user_name and assigned_user_email columns to case_submissions table

-- Add assigned_user_name column if it doesn't exist
ALTER TABLE case_submissions
ADD COLUMN IF NOT EXISTS assigned_user_name TEXT;

-- Add assigned_user_email column if it doesn't exist
ALTER TABLE case_submissions
ADD COLUMN IF NOT EXISTS assigned_user_email TEXT;

-- Add comment to document the columns
COMMENT ON COLUMN case_submissions.assigned_user_name IS 'Name of the HCEO/user assigned to this case';
COMMENT ON COLUMN case_submissions.assigned_user_email IS 'Email address of the HCEO/user assigned to this case';

-- Optional: Add an index on assigned_user_email for faster lookups
CREATE INDEX IF NOT EXISTS idx_case_submissions_assigned_user_email 
ON case_submissions(assigned_user_email);

-- Optional: Add validation to ensure email format is correct (if email is provided)
-- Drop constraint if it exists, then add it
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'check_assigned_user_email_format'
  ) THEN
    ALTER TABLE case_submissions DROP CONSTRAINT check_assigned_user_email_format;
  END IF;
END $$;

ALTER TABLE case_submissions
ADD CONSTRAINT check_assigned_user_email_format
CHECK (
  assigned_user_email IS NULL OR 
  assigned_user_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
);