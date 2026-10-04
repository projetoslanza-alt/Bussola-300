ALTER TABLE users ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES teams(id);

ALTER TABLE ticket_reasons ADD COLUMN IF NOT EXISTS default_assignee_id uuid REFERENCES users(id);

CREATE TABLE IF NOT EXISTS ticket_viewers (
  ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (ticket_id, user_id)
);

CREATE TABLE IF NOT EXISTS ticket_origins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  active boolean NOT NULL DEFAULT true
);

INSERT INTO ticket_origins (name) VALUES
  ('Reunião'),
  ('Solicitação'),
  ('Cliente/CX'),
  ('Indicador'),
  ('Diretoria')
ON CONFLICT (name) DO NOTHING;
