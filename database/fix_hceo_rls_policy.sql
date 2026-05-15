-- ========================================
-- FIX HCEO DASHBOARD - RLS POLICY ISSUE
-- ========================================
-- This script fixes the issue where HCEOs can only see some of their assigned cases
-- The problem is the RLS policy is too restrictive

-- Step 1: Verify the data is correct
-- This should show ALL 3 cases assigned to Himanshu Kumar
SELECT 
  substring(id::text, 1, 12) as case_id,
  status,
  assigned_user_email,
  assigned_user_name,
  hceo_choice,
  user_id,
  created_at
FROM case_submissions
WHERE 
  assigned_user_email = 'ons.himanshu1@gmail.com'
  OR assigned_user_name = 'Himanshu Kumar'
  OR hceo_choice = 'Himanshu Kumar'
ORDER BY created_at DESC;

-- Step 2: Check current RLS policies
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'case_submissions'
  AND cmd = 'SELECT';

-- Step 3: Drop existing HCEO read policy (if it exists and is wrong)
DROP POLICY IF EXISTS "HCEOs can view assigned cases" ON case_submissions;
DROP POLICY IF EXISTS "HCEO users can view assigned cases" ON case_submissions;
DROP POLICY IF EXISTS "HCEOs can read assigned cases" ON case_submissions;

-- Step 4: Create the correct RLS policy for HCEOs
-- This allows HCEOs to view cases assigned to them via email, name, or hceo_choice
CREATE POLICY "HCEOs can view their assigned cases" ON case_submissions
FOR SELECT
TO authenticated
USING (
  -- Check if the current user is an HCEO
  EXISTS (
    SELECT 1 
    FROM profiles 
    WHERE profiles.id = auth.uid() 
      AND profiles.role = 'hceo'
  )
  AND (
    -- Case is assigned by email
    assigned_user_email IN (
      SELECT email FROM profiles WHERE id = auth.uid()
    )
    OR
    -- Case is assigned by name
    assigned_user_name IN (
      SELECT full_name FROM profiles WHERE id = auth.uid()
    )
    OR
    -- Case is assigned via hceo_choice
    hceo_choice IN (
      SELECT full_name FROM profiles WHERE id = auth.uid()
    )
  )
);

-- Step 5: Verify the policy was created
SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'case_submissions'
  AND policyname = 'HCEOs can view their assigned cases';

-- Step 6: Test the policy by checking what an HCEO can see
-- Run this as the HCEO user (you may need to do this from the app)
-- or use: SET LOCAL ROLE TO authenticated;
SELECT 
  substring(id::text, 1, 12) as case_id,
  status,
  assigned_user_email,
  assigned_user_name,
  hceo_choice
FROM case_submissions
WHERE 
  assigned_user_email = 'ons.himanshu1@gmail.com'
  OR assigned_user_name = 'Himanshu Kumar'
  OR hceo_choice = 'Himanshu Kumar'
ORDER BY created_at DESC;

-- Expected: Should return 3 rows (approved, writ_received, submitted)

-- ========================================
-- IMPORTANT NOTES:
-- ========================================
-- 1. Make sure you run this in Supabase SQL Editor
-- 2. The first SELECT should show 3 cases
-- 3. The policy creation should succeed
-- 4. After running this, refresh the HCEO dashboard
-- 5. All 3 cases should now appear

-- If you still see only 1 case after this:
-- 1. Check if there are other SELECT policies on case_submissions
-- 2. Check if there's a more restrictive policy that takes precedence
-- 3. Temporarily disable RLS to confirm it's the issue:
--    ALTER TABLE case_submissions DISABLE ROW LEVEL SECURITY;
--    (Remember to re-enable after testing!)

