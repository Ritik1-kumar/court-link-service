-- Add signature field to case_submissions table for applicant signatures
-- This will store the applicant's digital signature for each case

ALTER TABLE case_submissions
ADD COLUMN IF NOT EXISTS applicant_signature TEXT;

-- Add comment to describe the column
COMMENT ON COLUMN case_submissions.applicant_signature IS 'Base64 encoded image data of the applicant''s digital signature for this case';

