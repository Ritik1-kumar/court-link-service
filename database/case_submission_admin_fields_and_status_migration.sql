-- Add new columns to case_submissions table for admin actions
ALTER TABLE case_submissions
ADD COLUMN IF NOT EXISTS admin_note TEXT,
ADD COLUMN IF NOT EXISTS returned_reason TEXT,
ADD COLUMN IF NOT EXISTS writ_received_date DATE,
ADD COLUMN IF NOT EXISTS court_notified_date TIMESTAMP WITH TIME ZONE;

-- Add comment for documentation
COMMENT ON COLUMN case_submissions.admin_note IS 'Admin covering note when approving with amendments';
COMMENT ON COLUMN case_submissions.returned_reason IS 'Reason why case was returned to applicant';
COMMENT ON COLUMN case_submissions.writ_received_date IS 'Date when writ was received from court';
COMMENT ON COLUMN case_submissions.court_notified_date IS 'Timestamp when court was notified via email';

-- Update any existing statuses to new format (migration)
UPDATE case_submissions
SET status = CASE
  WHEN status = 'approved_by_admin' THEN 'approved'
  WHEN status = 'completed_by_admin' THEN 'writ_received'
  WHEN status = 'completed_by_hceo' THEN 'hceo_completed'
  ELSE status
END
WHERE status IN ('approved_by_admin', 'completed_by_admin', 'completed_by_hceo');

-- Add index for new statuses
CREATE INDEX IF NOT EXISTS idx_case_submissions_writ_received 
ON case_submissions(writ_received_date) WHERE writ_received_date IS NOT NULL;