-- Add column for sealed writ documents from court
ALTER TABLE case_submissions
ADD COLUMN IF NOT EXISTS sealed_writ_file_paths TEXT[];

-- Add comment for documentation
COMMENT ON COLUMN case_submissions.sealed_writ_file_paths IS 'File paths for sealed writ documents received from court';

-- Create index for cases with sealed writs
CREATE INDEX IF NOT EXISTS idx_case_submissions_sealed_writ 
ON case_submissions(id) WHERE sealed_writ_file_paths IS NOT NULL AND array_length(sealed_writ_file_paths, 1) > 0;

