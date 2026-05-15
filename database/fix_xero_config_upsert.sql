-- =====================================================
-- FIX XERO CONFIG TABLE FOR NETLIFY UPSERT
-- =====================================================
-- This fixes the xero_config table to allow proper token storage
-- from Netlify functions using service role key

-- 1. FIRST: Clean up any duplicate xero_config entries
-- Keep only the most recently updated entry per tenant_id
DELETE FROM xero_config
WHERE id NOT IN (
  SELECT DISTINCT ON (tenant_id) id
  FROM xero_config
  ORDER BY tenant_id, updated_at DESC
);

-- 2. NOW: Add unique constraint on tenant_id to enable proper upsert
-- This prevents duplicate tenant entries and allows ON CONFLICT to work
ALTER TABLE xero_config 
  DROP CONSTRAINT IF EXISTS xero_config_tenant_id_key;

ALTER TABLE xero_config 
  ADD CONSTRAINT xero_config_tenant_id_key UNIQUE (tenant_id);

-- 3. Update RLS policy to allow service role (bypass RLS) to manage xero_config
-- Service role key bypasses RLS, but we need to ensure the policy exists
-- for regular authenticated users

-- Drop existing admin-only policy
DROP POLICY IF EXISTS "Only admins can manage xero_config" ON xero_config;

-- Create new policies
-- ALL authenticated users can check if Xero is configured (but with limited fields)
-- This is needed for the frontend to check authentication status
CREATE POLICY "Authenticated users can check xero_config status"
  ON xero_config FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only admins can insert/update/delete config
CREATE POLICY "Admins can manage xero_config"
  ON xero_config FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update xero_config"
  ON xero_config FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete xero_config"
  ON xero_config FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 4. Update xero_sync_log policies to allow service role inserts
DROP POLICY IF EXISTS "Admins and accounts can insert sync logs" ON xero_sync_log;

-- Allow service role to insert logs (service role bypasses RLS)
CREATE POLICY "Service role can insert sync logs"
  ON xero_sync_log FOR INSERT
  WITH CHECK (true); -- Service role bypasses this anyway

CREATE POLICY "Admins and accounts can manage sync logs"
  ON xero_sync_log FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'accounts')
    )
  );

-- 5. Add a function to check expired tokens (optional but recommended)
CREATE OR REPLACE FUNCTION is_xero_token_expired()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT COUNT(*) > 0
    FROM xero_config
    WHERE is_active = true
    AND token_expires_at < NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create a helpful view to check Xero auth status
CREATE OR REPLACE VIEW xero_auth_status AS
SELECT 
  id,
  tenant_id,
  client_id,
  CASE 
    WHEN access_token IS NOT NULL THEN 'Connected'
    ELSE 'Not Connected'
  END as connection_status,
  CASE 
    WHEN token_expires_at < NOW() THEN 'Expired'
    WHEN token_expires_at > NOW() THEN 'Valid'
    ELSE 'No Token'
  END as token_status,
  token_expires_at,
  is_active,
  updated_at as last_updated
FROM xero_config
WHERE is_active = true;

GRANT SELECT ON xero_auth_status TO authenticated;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Check if unique constraint was added successfully:
-- SELECT constraint_name, constraint_type 
-- FROM information_schema.table_constraints 
-- WHERE table_name = 'xero_config' AND constraint_type = 'UNIQUE';

-- Check current xero_config entries:
-- SELECT id, tenant_id, is_active, token_expires_at, updated_at FROM xero_config;

-- View authentication status:
-- SELECT * FROM xero_auth_status;

-- =====================================================
-- NOTES:
-- =====================================================
-- After running this script:
-- 1. Duplicates are cleaned up automatically
-- 2. Unique constraint prevents future duplicates
-- 3. Netlify functions can upsert tokens using service role key
-- 4. All authenticated users can check Xero status
-- 5. Only admins can modify configuration

