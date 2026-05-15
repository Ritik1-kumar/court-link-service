-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own cases" ON case_submissions;
DROP POLICY IF EXISTS "Users can insert their own cases" ON case_submissions;
DROP POLICY IF EXISTS "Users can update their own cases" ON case_submissions;
DROP POLICY IF EXISTS "Users can delete their own draft cases" ON case_submissions;
DROP POLICY IF EXISTS "Admins can delete any case" ON case_submissions;
DROP POLICY IF EXISTS "Service role can do everything" ON case_submissions;

-- NEW POLICY: Users can view their own cases
CREATE POLICY "Users can view their own cases"
  ON case_submissions FOR SELECT
  USING (auth.uid() = user_id);

-- NEW POLICY: Users can insert their own cases
CREATE POLICY "Users can insert their own cases"
  ON case_submissions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- NEW POLICY: Users can update their own cases (FIXED - allows status change)
-- This allows:
-- 1. Updating draft cases
-- 2. Changing status from draft to submitted (for payment)
-- 3. The old row must belong to the user
CREATE POLICY "Users can update their own cases"
  ON case_submissions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- NEW POLICY: Applicants can delete draft OR submitted cases (their own)
CREATE POLICY "Users can delete their own draft or submitted cases"
ON case_submissions
FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id 
  AND status IN ('draft', 'submitted')
);

-- NEW POLICY: Admins can delete ANY case regardless of status
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

-- NEW POLICY: Service role can do everything (for webhooks and admin operations)
CREATE POLICY "Service role can do everything"
  ON case_submissions FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_case_submissions_user_id ON case_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_case_submissions_status ON case_submissions(status);
CREATE INDEX IF NOT EXISTS idx_case_submissions_payment_intent ON case_submissions(payment_intent_id);

-- Stripe webhooks policies
DROP POLICY IF EXISTS "Service role can manage webhooks" ON stripe_webhooks;

CREATE POLICY "Service role can manage webhooks"
  ON stripe_webhooks FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');