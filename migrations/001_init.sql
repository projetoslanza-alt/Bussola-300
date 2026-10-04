CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'diretoria', 'gg', 'gestor', 'colaborador', 'viewer')),
  person_id uuid,
  active boolean NOT NULL DEFAULT true,
  failed_logins integer NOT NULL DEFAULT 0,
  locked_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sessions_user_idx ON sessions(user_id);

CREATE TABLE audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_log_entity_idx ON audit_log(entity, entity_id, created_at DESC);

CREATE TABLE import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  filename text NOT NULL,
  byte_size integer NOT NULL,
  sha256 text NOT NULL,
  status text NOT NULL,
  created_count integer NOT NULL DEFAULT 0,
  updated_count integer NOT NULL DEFAULT 0,
  ignored_count integer NOT NULL DEFAULT 0,
  error_count integer NOT NULL DEFAULT 0,
  warning_count integer NOT NULL DEFAULT 0,
  summary jsonb,
  forced boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);
CREATE INDEX import_batches_hash_idx ON import_batches(kind, sha256, status);

CREATE TABLE import_warnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES import_batches(id) ON DELETE CASCADE,
  level text NOT NULL,
  sheet text,
  cell text,
  message text NOT NULL
);

CREATE TABLE people (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name text NOT NULL,
  match_key text NOT NULL,
  reconciliation_status text NOT NULL DEFAULT 'confirmed',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX people_match_idx ON people(match_key);

CREATE TABLE person_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  alias_name text NOT NULL,
  alias_key text NOT NULL UNIQUE,
  source text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE person_reconciliations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_name text NOT NULL,
  alias_key text NOT NULL,
  candidate_ids uuid[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending',
  resolved_person_id uuid REFERENCES people(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE adp_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  month integer,
  year integer,
  starts_on date,
  ends_on date,
  status text NOT NULL DEFAULT 'aberto',
  is_current boolean NOT NULL DEFAULT false,
  source text,
  imported_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX adp_cycles_period_idx ON adp_cycles(starts_on, ends_on);

CREATE TABLE cycle_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid NOT NULL REFERENCES adp_cycles(id) ON DELETE CASCADE,
  person_id uuid NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  team_id uuid REFERENCES teams(id),
  UNIQUE (cycle_id, person_id, team_id)
);
CREATE INDEX cycle_memberships_team_idx ON cycle_memberships(team_id, cycle_id);

CREATE TABLE adp_facts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid NOT NULL REFERENCES adp_cycles(id) ON DELETE CASCADE,
  person_id uuid REFERENCES people(id),
  team_id uuid REFERENCES teams(id),
  metric_code text NOT NULL,
  grain text NOT NULL,
  period_date date,
  value numeric,
  batch_id uuid REFERENCES import_batches(id),
  source_file text,
  source_sheet text,
  source_row integer,
  source_cell text,
  imported_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE NULLS NOT DISTINCT (cycle_id, person_id, team_id, metric_code, grain, period_date)
);
CREATE INDEX adp_facts_lookup_idx ON adp_facts(cycle_id, grain, metric_code);
CREATE INDEX adp_facts_person_idx ON adp_facts(person_id, cycle_id);
CREATE INDEX adp_facts_team_idx ON adp_facts(team_id, cycle_id);

CREATE TABLE adp_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid NOT NULL REFERENCES adp_cycles(id) ON DELETE CASCADE,
  person_id uuid REFERENCES people(id),
  team_id uuid REFERENCES teams(id),
  goal_type text NOT NULL,
  unit text,
  target_value numeric,
  actual_value numeric,
  scope text NOT NULL DEFAULT 'individual',
  source_sheet text,
  source_cell text,
  batch_id uuid REFERENCES import_batches(id),
  UNIQUE NULLS NOT DISTINCT (cycle_id, person_id, team_id, goal_type, scope)
);

CREATE TABLE adp_funnel (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid NOT NULL REFERENCES adp_cycles(id) ON DELETE CASCADE,
  person_id uuid REFERENCES people(id),
  team_id uuid REFERENCES teams(id),
  stage text NOT NULL,
  quantity numeric,
  percent_value numeric,
  source_sheet text,
  source_row integer,
  source_cell text,
  batch_id uuid REFERENCES import_batches(id),
  UNIQUE NULLS NOT DISTINCT (cycle_id, person_id, team_id, stage)
);
CREATE INDEX adp_funnel_cycle_idx ON adp_funnel(cycle_id, team_id);

CREATE TABLE adp_parameters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid REFERENCES adp_cycles(id) ON DELETE CASCADE,
  code text NOT NULL,
  label text NOT NULL,
  value numeric,
  unit text,
  kind text NOT NULL,
  UNIQUE NULLS NOT DISTINCT (cycle_id, code, kind)
);

CREATE TABLE adp_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid REFERENCES adp_cycles(id) ON DELETE CASCADE,
  person_id uuid REFERENCES people(id),
  team_id uuid REFERENCES teams(id),
  call_date date,
  executive_name text,
  brand text,
  city text,
  client_name text,
  partner_present text,
  read_cof text,
  council_date text,
  campaign_date text,
  campaign_value text,
  status text,
  alignment text,
  notes text,
  raw_headers jsonb,
  raw_values jsonb,
  source_sheet text,
  source_row integer,
  batch_id uuid REFERENCES import_batches(id)
);
CREATE INDEX adp_opportunities_cycle_idx ON adp_opportunities(cycle_id, person_id);

CREATE TABLE adp_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  cycle_id uuid REFERENCES adp_cycles(id) ON DELETE SET NULL,
  kind text NOT NULL,
  body text NOT NULL,
  author_id uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE ticket_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sla_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  label text NOT NULL,
  first_response_text text,
  resolution_text text,
  counting_text text,
  first_response_minutes integer,
  resolution_minutes integer,
  use_business_hours boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL
);

CREATE TABLE priority_matrix (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  impact text NOT NULL,
  urgency text NOT NULL,
  priority_code text NOT NULL,
  UNIQUE (impact, urgency)
);

CREATE TABLE ticket_reasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  area_id uuid NOT NULL REFERENCES ticket_areas(id),
  catalog_code text,
  title text NOT NULL,
  when_to_use text,
  default_type text,
  default_priority text,
  sla_owner text,
  validation_status text,
  adjustment_note text,
  is_restricted boolean NOT NULL DEFAULT false,
  config_pending boolean NOT NULL DEFAULT false,
  pending_fields text[] NOT NULL DEFAULT '{}',
  active boolean NOT NULL DEFAULT true,
  source_sheet text,
  source_row integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ticket_reasons_area_idx ON ticket_reasons(area_id, active);

CREATE TABLE ticket_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  theme text,
  rule_text text NOT NULL,
  reason text,
  validation_status text,
  source_sheet text,
  source_row integer
);

CREATE TABLE business_calendar (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  timezone text NOT NULL DEFAULT 'America/Sao_Paulo',
  work_start time NOT NULL DEFAULT '09:00',
  work_end time NOT NULL DEFAULT '18:00',
  work_days integer[] NOT NULL DEFAULT '{1,2,3,4,5}'
);
INSERT INTO business_calendar (id) VALUES (1);

CREATE TABLE holidays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day date NOT NULL UNIQUE,
  name text
);

CREATE TABLE tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number text NOT NULL UNIQUE,
  title text NOT NULL,
  expected_result text NOT NULL,
  context text NOT NULL,
  area_id uuid NOT NULL REFERENCES ticket_areas(id),
  reason_id uuid NOT NULL REFERENCES ticket_reasons(id),
  impact text NOT NULL,
  urgency text NOT NULL,
  priority_code text NOT NULL,
  priority_from_reason text,
  priority_from_matrix text,
  status text NOT NULL DEFAULT 'ABERTO',
  origin text NOT NULL,
  needed_on date NOT NULL,
  meeting_name text,
  meeting_date date,
  meeting_link text,
  client_name text,
  sale_ref text,
  related_person text,
  links text,
  observations text,
  requester_id uuid NOT NULL REFERENCES users(id),
  assignee_id uuid REFERENCES users(id),
  is_restricted boolean NOT NULL DEFAULT false,
  first_response_due_at timestamptz,
  first_response_at timestamptz,
  resolution_due_at timestamptz,
  resolved_at timestamptz,
  resolution_text text,
  reopen_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX tickets_status_idx ON tickets(status, priority_code);
CREATE INDEX tickets_assignee_idx ON tickets(assignee_id, status);
CREATE INDEX tickets_area_idx ON tickets(area_id, status);

CREATE TABLE ticket_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id),
  event_type text NOT NULL,
  from_value text,
  to_value text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ticket_events_ticket_idx ON ticket_events(ticket_id, created_at);

CREATE TABLE ticket_pauses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL,
  ended_at timestamptz,
  reason text NOT NULL DEFAULT 'AGUARDANDO_SOLICITANTE'
);

CREATE TABLE ticket_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id),
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE ticket_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id),
  original_name text NOT NULL,
  stored_name text NOT NULL,
  mime_type text,
  byte_size integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
