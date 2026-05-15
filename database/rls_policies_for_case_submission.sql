DROP POLICY IF EXISTS "Admins can view all cases" ON case_submissions;
DROP POLICY IF EXISTS "Admins can update all cases" ON case_submissions;
DROP POLICY IF EXISTS "Admins can delete any case" ON case_submissions;
DROP POLICY IF EXISTS "HCEO can view approved cases" ON case_submissions;
DROP POLICY IF EXISTS "HCEO can update approved cases" ON case_submissions;


-- First, enable RLS on the table (if not already enabled)
ALTER TABLE case_submissions ENABLE ROW LEVEL SECURITY;

-- Admins can view all cases (IMPORTANT!)
CREATE POLICY "Admins can view all cases"
ON case_submissions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Admins can update all cases
CREATE POLICY "Admins can update all cases"
ON case_submissions
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Admins can delete any case
CREATE POLICY "Admins can delete any case"
ON case_submissions
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- HCEO can view approved cases
CREATE POLICY "HCEO can view approved cases"
ON case_submissions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'hceo'
  )
  AND status IN ('approved_by_admin', 'completed_by_admin', 'completed_by_hceo', 'submitted')
);

-- HCEO can update approved cases
CREATE POLICY "HCEO can update assigned cases"
ON case_submissions
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'hceo'
  )
  AND (
    assigned_user_email = auth.email()
    OR assigned_user_name = (SELECT full_name FROM profiles WHERE id = auth.uid())
    OR hceo_choice = (SELECT full_name FROM profiles WHERE id = auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'hceo'
  )
);