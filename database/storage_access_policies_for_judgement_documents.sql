-- STEP 1: Drop existing storage policies
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to read own files" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete own files" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update own files" ON storage.objects;

-- STEP 2: Create updated storage policies with support for all file formats

-- Upload Policy - allows PDF, DOC, DOCX, JPG, JPEG, PNG, WEBP
CREATE POLICY "Allow authenticated uploads"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'judgment-documents' 
    AND (
      -- Check file extension is allowed
      lower(substring(name from '\.([^.]*)$')) IN ('pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'webp')
    )
    AND (
      -- Users can upload to their own folder
      (storage.foldername(name))[1] = auth.uid()::text
      OR
      -- HCEO, Admin, and Applicants can upload to hceo folder
      (
        (storage.foldername(name))[1] = 'hceo'
        AND EXISTS (
          SELECT 1 FROM profiles 
          WHERE profiles.id = auth.uid() 
          AND profiles.role IN ('hceo', 'admin', 'applicant')
        )
      )
      OR
      -- Admins can upload anywhere
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('admin', 'accounts')
      )
    )
  );

-- Read Policy - allows reading all allowed file types
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

-- Delete Policy
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

-- Update Policy
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

-- Optional: If you want to set file size limits (e.g., 10MB per file)
-- You can add this to the WITH CHECK clause:
-- AND (storage.foldername(name))[1] = auth.uid()::text
-- AND pg_column_size(name) < 10485760  -- 10MB in bytes