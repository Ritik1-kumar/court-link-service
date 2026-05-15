-- Drop existing policies
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to read own files" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete own files" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update own files" ON storage.objects;

-- Policy 1: Create new policy that allows
-- 1. Users to upload to their own folder (userId)
-- 2. HCEO users to upload to hceo/ folder
-- 3. Admin users to upload anywhere
-- 4. Applicants to upload to hceo/ folder (for their cases)
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'judgment-documents' 
  AND (
    -- Allow users to upload to their own folder
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    -- Allow HCEO, Admin, and Applicants to upload to hceo folder
    (
      (storage.foldername(name))[1] = 'hceo'
      AND EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('hceo', 'admin', 'applicant')
      )
    )
    OR
    -- Allow admins to upload anywhere
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'accounts')
    )
  )
);

-- Policy 2: Allow users to read their own files + admin roles + HCEO folder access
CREATE POLICY "Allow users to read own files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'judgment-documents' 
  AND (
    -- Users can read their own files
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    -- HCEOs, Admins, and Applicants can read from hceo folder
    (
      (storage.foldername(name))[1] = 'hceo'
      AND EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('hceo', 'admin', 'applicant')
      )
    )
    OR
    -- Admin roles can read everything
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'hceo', 'accounts')
    )
  )
);

-- Policy 3: Allow users to delete their own files + admins can delete from hceo folder
CREATE POLICY "Allow users to delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'judgment-documents' 
  AND (
    -- Users can delete their own files
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    -- Admin roles can delete from hceo folder
    (
      (storage.foldername(name))[1] = 'hceo'
      AND EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('admin', 'accounts')
      )
    )
  )
);

-- Policy 4: Allow users to update their own files + admins can update hceo folder
CREATE POLICY "Allow users to update own files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'judgment-documents' 
  AND (
    -- Users can update their own files
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    -- Admin roles can update hceo folder
    (
      (storage.foldername(name))[1] = 'hceo'
      AND EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('admin', 'accounts')
      )
    )
  )
);