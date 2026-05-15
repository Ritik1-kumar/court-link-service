-- Complete SQL script with table creation and new columns
-- Drop existing table if you want to recreate (WARNING: This deletes all data!)
DROP TABLE IF EXISTS case_submissions CASCADE;
DROP TABLE IF EXISTS stripe_webhooks CASCADE;

-- case_submissions table
CREATE TABLE IF NOT EXISTS case_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  claimant_name TEXT NOT NULL,
  defendant_name TEXT NOT NULL,
  judgment_amount DECIMAL(10, 2) NOT NULL,
  judgment_date DATE NOT NULL,
  court TEXT NOT NULL,
  hceo_choice TEXT NOT NULL,
  interest_recovery BOOLEAN DEFAULT false,
  judgment_file_paths TEXT[],
  judgment_file_path TEXT,
  hceo_file_paths TEXT[],
  is_draft BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'draft',
  payment_intent_id TEXT,
  payment_status TEXT,
  payment_amount DECIMAL(10, 2),
  service_fee DECIMAL(10, 2),
  court_fee DECIMAL(10, 2),
  vat_amount DECIMAL(10, 2),
  xero_invoice_id TEXT,
  xero_invoice_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- stripe_webhooks table
CREATE TABLE IF NOT EXISTS stripe_webhooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stripe_event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  payment_intent_id TEXT,
  data JSONB,
  processed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE case_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_webhooks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own cases" ON case_submissions;
DROP POLICY IF EXISTS "Users can insert their own cases" ON case_submissions;
DROP POLICY IF EXISTS "Users can update their own draft cases" ON case_submissions;
DROP POLICY IF EXISTS "Users can delete their own draft cases" ON case_submissions;

-- RLS Policies
CREATE POLICY "Users can view their own cases"
  ON case_submissions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cases"
  ON case_submissions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own draft cases"
  ON case_submissions FOR UPDATE
  USING (auth.uid() = user_id AND (status = 'draft' OR is_draft = true));

CREATE POLICY "Users can delete their own draft cases"
  ON case_submissions FOR DELETE
  USING (auth.uid() = user_id AND (status = 'draft' OR is_draft = true));