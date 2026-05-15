-- Drop the table if it exists (for clean reinstall)
DROP TABLE IF EXISTS case_history CASCADE;

-- Create case_history table
CREATE TABLE IF NOT EXISTS case_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID NOT NULL REFERENCES case_submissions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  user_name TEXT,
  user_role TEXT,
  action_type TEXT NOT NULL, -- 'status_change', 'hceo_assignment', 'payment_added', 'document_upload', 'case_update', 'case_created'
  action_description TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE case_history ENABLE ROW LEVEL SECURITY;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_case_history_case_id ON case_history(case_id);
CREATE INDEX IF NOT EXISTS idx_case_history_created_at ON case_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_case_history_action_type ON case_history(action_type);

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own case history" ON case_history;
DROP POLICY IF EXISTS "Admins can view all case history" ON case_history;
DROP POLICY IF EXISTS "HCEO can view assigned case history" ON case_history;
DROP POLICY IF EXISTS "Service role can insert history" ON case_history;
DROP POLICY IF EXISTS "Users can insert history for their actions" ON case_history;
DROP POLICY IF EXISTS "Admins can insert history" ON case_history;
DROP POLICY IF EXISTS "HCEO can insert history" ON case_history;

-- RLS Policies for SELECT (viewing history)

-- Users can view history for their own cases
CREATE POLICY "Users can view their own case history"
ON case_history FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM case_submissions
    WHERE case_submissions.id = case_history.case_id
    AND case_submissions.user_id = auth.uid()
  )
);

-- Admins can view all case history
CREATE POLICY "Admins can view all case history"
ON case_history FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- HCEOs can view history for their assigned cases
CREATE POLICY "HCEO can view assigned case history"
ON case_history FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN case_submissions cs ON cs.id = case_history.case_id
    WHERE p.id = auth.uid()
    AND p.role = 'hceo'
    AND (
      cs.assigned_user_email = auth.email()
      OR cs.assigned_user_name = p.full_name
      OR cs.hceo_choice = p.full_name
    )
  )
);

-- RLS Policies for INSERT (creating history entries)

-- Authenticated users can insert history for their own actions
CREATE POLICY "Users can insert history for their actions"
ON case_history FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Admins can insert any history
CREATE POLICY "Admins can insert history"
ON case_history FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- HCEOs can insert history for their actions
CREATE POLICY "HCEO can insert history"
ON case_history FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'hceo'
  )
);

-- Service role can do everything (for system actions and webhooks)
CREATE POLICY "Service role can manage history"
ON case_history FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Add comments for documentation
COMMENT ON TABLE case_history IS 'Tracks all changes and events in a case lifecycle';
COMMENT ON COLUMN case_history.action_type IS 'Type of action: case_created, status_change, hceo_assignment, payment_added, document_upload, case_update, case_deleted';
COMMENT ON COLUMN case_history.action_description IS 'Human-readable description of what happened';
COMMENT ON COLUMN case_history.old_value IS 'Previous value before change (if applicable)';
COMMENT ON COLUMN case_history.new_value IS 'New value after change (if applicable)';
COMMENT ON COLUMN case_history.metadata IS 'Additional JSON data about the action';