-- =====================================================
-- XERO INTEGRATION SCHEMA
-- =====================================================
-- This script creates tables and functions for Xero API integration
-- Run this in your Supabase SQL Editor

-- 1. Add Xero columns to case_submissions (if not exists)
-- Already exists in case_submission_and_webhook_schema_with_rld.sql:
-- xero_invoice_id TEXT
-- xero_invoice_number TEXT

-- 2. Create xero_invoices table to track all invoice operations
CREATE TABLE IF NOT EXISTS xero_invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID REFERENCES case_submissions(id) ON DELETE CASCADE,
  xero_invoice_id TEXT UNIQUE,
  xero_invoice_number TEXT,
  xero_contact_id TEXT,
  invoice_status TEXT DEFAULT 'draft' CHECK (invoice_status IN ('draft', 'submitted', 'authorised', 'paid', 'voided', 'deleted', 'error')),
  invoice_date DATE NOT NULL,
  due_date DATE,
  subtotal DECIMAL(10, 2),
  total_tax DECIMAL(10, 2),
  total DECIMAL(10, 2),
  amount_paid DECIMAL(10, 2) DEFAULT 0,
  amount_due DECIMAL(10, 2),
  currency_code TEXT DEFAULT 'GBP',
  reference TEXT, -- Case reference or matter ID
  line_items JSONB, -- Store invoice line items
  last_synced_at TIMESTAMP WITH TIME ZONE,
  sync_error TEXT, -- Store any sync errors
  xero_url TEXT, -- Direct link to invoice in Xero
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create xero_sync_log table for audit trail
CREATE TABLE IF NOT EXISTS xero_sync_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID REFERENCES case_submissions(id) ON DELETE CASCADE,
  xero_invoice_id TEXT,
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'sync', 'error', 'reconcile')),
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'pending')),
  request_data JSONB,
  response_data JSONB,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create xero_config table for storing Xero credentials and settings
CREATE TABLE IF NOT EXISTS xero_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id TEXT NOT NULL, -- Xero Organization ID
  client_id TEXT NOT NULL, -- Xero OAuth Client ID
  client_secret TEXT, -- Encrypted Xero OAuth Client Secret (store securely!)
  access_token TEXT, -- Current access token (encrypted)
  refresh_token TEXT, -- Current refresh token (encrypted)
  token_expires_at TIMESTAMP WITH TIME ZONE,
  default_account_code TEXT DEFAULT '200', -- Default sales account code
  default_tax_type TEXT DEFAULT 'OUTPUT2', -- Default tax type (20% VAT)
  auto_invoice_enabled BOOLEAN DEFAULT true,
  auto_reconcile_enabled BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create xero_contacts table to cache Xero contacts
CREATE TABLE IF NOT EXISTS xero_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  xero_contact_id TEXT UNIQUE NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  account_number TEXT, -- Customer reference number
  contact_status TEXT DEFAULT 'ACTIVE',
  last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Enable RLS on new tables
ALTER TABLE xero_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE xero_sync_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE xero_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE xero_contacts ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS Policies

-- Admins and accounts users can view all invoices
CREATE POLICY "Admins and accounts can view all xero_invoices"
  ON xero_invoices FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'accounts')
    )
  );

-- Users can view their own invoices
CREATE POLICY "Users can view their own xero_invoices"
  ON xero_invoices FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM case_submissions
      WHERE case_submissions.id = xero_invoices.case_id
      AND case_submissions.user_id = auth.uid()
    )
  );

-- Only accounts and admins can manage invoices
CREATE POLICY "Accounts and admins can manage xero_invoices"
  ON xero_invoices FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'accounts')
    )
  );

-- Sync log policies - only admins and accounts
CREATE POLICY "Admins and accounts can view sync logs"
  ON xero_sync_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'accounts')
    )
  );

CREATE POLICY "Admins and accounts can insert sync logs"
  ON xero_sync_log FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'accounts')
    )
  );

-- Xero config - only admins
CREATE POLICY "Only admins can manage xero_config"
  ON xero_config FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Xero contacts policies
CREATE POLICY "Admins and accounts can view xero_contacts"
  ON xero_contacts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'accounts')
    )
  );

CREATE POLICY "Admins and accounts can manage xero_contacts"
  ON xero_contacts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'accounts')
    )
  );

-- 8. Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. Create triggers for updated_at
CREATE TRIGGER update_xero_invoices_updated_at
  BEFORE UPDATE ON xero_invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_xero_config_updated_at
  BEFORE UPDATE ON xero_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_xero_contacts_updated_at
  BEFORE UPDATE ON xero_contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 10. Create view for invoice dashboard
CREATE OR REPLACE VIEW invoice_dashboard_view AS
SELECT 
  xi.id,
  xi.xero_invoice_id,
  xi.xero_invoice_number,
  xi.invoice_status,
  xi.total,
  xi.amount_paid,
  xi.amount_due,
  xi.invoice_date,
  xi.due_date,
  xi.reference,
  cs.id as case_id,
  COALESCE(cs.claimant_name, '') as claimant_name,
  COALESCE(cs.defendant_name, '') as defendant_name,
  cs.status as case_status,
  cs.payment_status,
  p.email as customer_email,
  p.full_name as customer_name,
  xi.created_at,
  xi.last_synced_at,
  CASE 
    WHEN xi.sync_error IS NOT NULL THEN true 
    ELSE false 
  END as has_error
FROM xero_invoices xi
LEFT JOIN case_submissions cs ON xi.case_id = cs.id
LEFT JOIN profiles p ON cs.user_id = p.id
ORDER BY xi.created_at DESC;

-- 11. Grant access to view
GRANT SELECT ON invoice_dashboard_view TO authenticated;

-- 12. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_xero_invoices_case_id ON xero_invoices(case_id);
CREATE INDEX IF NOT EXISTS idx_xero_invoices_xero_invoice_id ON xero_invoices(xero_invoice_id);
CREATE INDEX IF NOT EXISTS idx_xero_invoices_status ON xero_invoices(invoice_status);
CREATE INDEX IF NOT EXISTS idx_xero_sync_log_case_id ON xero_sync_log(case_id);
CREATE INDEX IF NOT EXISTS idx_xero_sync_log_created_at ON xero_sync_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_xero_contacts_user_id ON xero_contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_xero_contacts_xero_contact_id ON xero_contacts(xero_contact_id);

-- 13. Insert sample config (UPDATE THIS with your actual Xero credentials)
-- Note: For security, use environment variables or Supabase Vault for sensitive data
INSERT INTO xero_config (
  tenant_id,
  client_id,
  default_account_code,
  default_tax_type,
  auto_invoice_enabled
) VALUES (
  'YOUR_XERO_TENANT_ID_HERE',
  'YOUR_XERO_CLIENT_ID_HERE',
  '200', -- Sales account code
  'OUTPUT2', -- 20% VAT
  true
) ON CONFLICT DO NOTHING;

COMMENT ON TABLE xero_invoices IS 'Stores Xero invoice data synced from case submissions';
COMMENT ON TABLE xero_sync_log IS 'Audit log for all Xero API operations';
COMMENT ON TABLE xero_config IS 'Xero OAuth credentials and configuration settings';
COMMENT ON TABLE xero_contacts IS 'Cached Xero contacts linked to application users';

