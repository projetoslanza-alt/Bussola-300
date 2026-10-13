ALTER TABLE people ADD COLUMN IF NOT EXISTS is_master boolean NOT NULL DEFAULT false;
ALTER TABLE people ADD COLUMN IF NOT EXISTS admission_date date;
ALTER TABLE people ADD COLUMN IF NOT EXISTS current_role text;
ALTER TABLE people ADD COLUMN IF NOT EXISTS current_manager_name text;
ALTER TABLE people ADD COLUMN IF NOT EXISTS current_manager_id uuid REFERENCES people(id);
ALTER TABLE people ADD COLUMN IF NOT EXISTS structure_source text;

CREATE TABLE IF NOT EXISTS roi_monthly (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  period_month date NOT NULL,
  role_name text,
  admission_date date,
  manager_name text,
  gross_revenue numeric,
  commission numeric,
  bonus numeric,
  fixed_cost numeric,
  marketing_allocation numeric,
  infrastructure numeric,
  total_invested numeric,
  gross_profit numeric,
  roi numeric,
  roi_percent numeric,
  tenure_text text,
  brand_count numeric,
  classification text,
  result_amount numeric,
  source_sheet text,
  source_row integer,
  batch_id uuid REFERENCES import_batches(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (person_id, period_month)
);
CREATE INDEX IF NOT EXISTS roi_monthly_period_idx ON roi_monthly(period_month);
CREATE INDEX IF NOT EXISTS roi_monthly_manager_idx ON roi_monthly(manager_name);

CREATE TABLE IF NOT EXISTS roi_collaborator_totals (
  person_id uuid PRIMARY KEY REFERENCES people(id) ON DELETE CASCADE,
  role_name text,
  manager_name text,
  gross_revenue numeric,
  commission numeric,
  bonus numeric,
  fixed_cost numeric,
  marketing_allocation numeric,
  infrastructure numeric,
  total_invested numeric,
  roi numeric,
  tenure_text text,
  brand_count numeric,
  result_amount numeric,
  source_sheet text,
  source_row integer,
  batch_id uuid REFERENCES import_batches(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sales_monthly (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid REFERENCES people(id) ON DELETE SET NULL,
  raw_name text NOT NULL,
  match_key text NOT NULL,
  period_month date NOT NULL,
  role_name text,
  total_amount numeric,
  reconciliation_status text NOT NULL,
  source_sheet text,
  source_row integer,
  batch_id uuid REFERENCES import_batches(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (match_key, period_month)
);
CREATE INDEX IF NOT EXISTS sales_monthly_period_idx ON sales_monthly(period_month);
CREATE INDEX IF NOT EXISTS sales_monthly_person_idx ON sales_monthly(person_id);

CREATE TABLE IF NOT EXISTS sales_brand_monthly (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_monthly_id uuid NOT NULL REFERENCES sales_monthly(id) ON DELETE CASCADE,
  brand text NOT NULL,
  amount numeric,
  UNIQUE (sales_monthly_id, brand)
);

CREATE TABLE IF NOT EXISTS sales_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid REFERENCES people(id) ON DELETE SET NULL,
  raw_name text NOT NULL,
  match_key text NOT NULL,
  period_month date,
  revenue numeric,
  franchise text,
  franchisee text,
  signal_value numeric,
  signal_date date,
  closing_value numeric,
  closing_date date,
  reconciliation_status text NOT NULL,
  natural_key text NOT NULL UNIQUE,
  source_sheet text,
  source_row integer,
  batch_id uuid REFERENCES import_batches(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sales_transactions_period_idx ON sales_transactions(period_month);
CREATE INDEX IF NOT EXISTS sales_transactions_person_idx ON sales_transactions(person_id);

CREATE TABLE IF NOT EXISTS import_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid REFERENCES import_batches(id) ON DELETE CASCADE,
  kind text NOT NULL,
  source text,
  sheet text,
  source_row integer,
  raw_name text,
  period_month date,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS import_issues_batch_idx ON import_issues(batch_id, kind);
