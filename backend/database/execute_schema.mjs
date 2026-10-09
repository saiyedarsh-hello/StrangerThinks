import fs from "fs";

try {
  const envContent = fs.readFileSync(".env.local", "utf8");
  for (const line of envContent.split(/\r?\n/)) {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match && !process.env[match[1].trim()]) {
      process.env[match[1].trim()] = match[2].trim();
    }
  }
} catch {}

const SUPABASE_PAT = process.env.SUPABASE_PAT || "";
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || "pxlbktdaldicbtrtbqxu";

async function query(sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${SUPABASE_PAT}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(JSON.stringify(data));
  }
  return data;
}

const STATEMENTS = [
  // 1. Extensions
  `CREATE EXTENSION IF NOT EXISTS pgcrypto;`,

  // 2. Event State Table
  `CREATE TABLE IF NOT EXISTS event_state (
    id INT PRIMARY KEY DEFAULT 1,
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    login_open BOOLEAN NOT NULL DEFAULT TRUE,
    submissions_open BOOLEAN NOT NULL DEFAULT TRUE,
    current_round_max INT NOT NULL DEFAULT 7,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT single_event_state_row CHECK (id = 1)
  );`,

  // Seed Event State
  `INSERT INTO event_state (id, status, login_open, submissions_open, current_round_max)
   VALUES (1, 'active', TRUE, TRUE, 7)
   ON CONFLICT (id) DO UPDATE SET
     status = 'active',
     login_open = TRUE,
     submissions_open = TRUE;`,

  // 3. Teams Table
  `CREATE TABLE IF NOT EXISTS teams (
    team_id VARCHAR(64) PRIMARY KEY,
    username VARCHAR(64) NOT NULL UNIQUE,
    password_plain VARCHAR(128) NOT NULL,
    team_name VARCHAR(128) NOT NULL,
    squad_leader VARCHAR(128) NOT NULL,
    total_score INT NOT NULL DEFAULT 0,
    current_stage INT NOT NULL DEFAULT 1,
    stage_times JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );`,

  // Add columns if teams table already existed from before
  `ALTER TABLE teams ADD COLUMN IF NOT EXISTS username VARCHAR(64) UNIQUE;`,
  `ALTER TABLE teams ADD COLUMN IF NOT EXISTS password_plain VARCHAR(128);`,
  `ALTER TABLE teams ADD COLUMN IF NOT EXISTS current_stage INT DEFAULT 1;`,
  `ALTER TABLE teams ADD COLUMN IF NOT EXISTS stage_times JSONB DEFAULT '{}'::jsonb;`,

  // 4. Active Sessions (Strictly 1 session per team)
  `CREATE TABLE IF NOT EXISTS active_sessions (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id VARCHAR(64) NOT NULL UNIQUE REFERENCES teams(team_id) ON DELETE CASCADE,
    session_token TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_heartbeat TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );`,

  // 5. Admin Users & Admin Sessions
  `CREATE TABLE IF NOT EXISTS admin_users (
    admin_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(64) NOT NULL UNIQUE,
    password_plain TEXT NOT NULL,
    role VARCHAR(32) NOT NULL DEFAULT 'ADMIN',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );`,

  `INSERT INTO admin_users (username, password_plain, role)
   VALUES ('admin', 'HawkinsAdmin1983!', 'ADMIN')
   ON CONFLICT (username) DO UPDATE SET password_plain = 'HawkinsAdmin1983!';`,

  `CREATE TABLE IF NOT EXISTS admin_sessions (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_username VARCHAR(64) NOT NULL,
    session_token TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );`,

  // 6. Rounds Table
  `CREATE TABLE IF NOT EXISTS rounds (
    round_number INT PRIMARY KEY,
    title VARCHAR(128) NOT NULL,
    stage_key VARCHAR(64) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
  );`,

  `INSERT INTO rounds (round_number, title, stage_key) VALUES
   (1, 'Hawkins Town Telemetry', 'town', TRUE),
   (2, 'Police Station Dossier', 'police', TRUE),
   (3, 'Byers House Transmission', 'byers', TRUE),
   (4, 'Hawkins Lab Sublevel', 'lab', TRUE),
   (5, 'Creepy Forest Runes', 'forest', TRUE),
   (6, 'Radio Tower Decryption', 'radiotower', TRUE),
   (7, 'Upside Down Gate', 'upsidedown', TRUE)
   ON CONFLICT (round_number) DO UPDATE SET title = EXCLUDED.title, stage_key = EXCLUDED.stage_key;`,

  // 7. Question Answers (Server only!)
  `CREATE TABLE IF NOT EXISTS question_answers (
    question_id VARCHAR(64) PRIMARY KEY,
    round_number INT NOT NULL,
    correct_answer VARCHAR(256) NOT NULL,
    accepted_answers JSONB NOT NULL DEFAULT '[]'::jsonb,
    points INT NOT NULL DEFAULT 5
  );`,

  // 8. Question Hints
  `CREATE TABLE IF NOT EXISTS question_hints (
    hint_id VARCHAR(64) PRIMARY KEY,
    question_id VARCHAR(64) NOT NULL,
    hint_number INT NOT NULL,
    hint_text TEXT NOT NULL,
    deduction INT NOT NULL DEFAULT 2
  );`,

  // 9. Team Submissions
  `CREATE TABLE IF NOT EXISTS team_submissions (
    submission_id SERIAL PRIMARY KEY,
    team_id VARCHAR(64) NOT NULL REFERENCES teams(team_id) ON DELETE CASCADE,
    question_id VARCHAR(64) NOT NULL,
    round_number INT NOT NULL,
    submitted_answer TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL,
    points_awarded INT NOT NULL DEFAULT 0,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_team_question UNIQUE (team_id, question_id)
  );`,

  // 10. Team Hint Usage
  `CREATE TABLE IF NOT EXISTS team_hint_usage (
    usage_id SERIAL PRIMARY KEY,
    team_id VARCHAR(64) NOT NULL REFERENCES teams(team_id) ON DELETE CASCADE,
    hint_id VARCHAR(64) NOT NULL,
    question_id VARCHAR(64) NOT NULL,
    deduction INT NOT NULL DEFAULT 0,
    used_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_team_hint UNIQUE (team_id, hint_id)
  );`,

  // 11. Vecna Sabotages
  `CREATE TABLE IF NOT EXISTS vecna_sabotages (
    sabotage_id SERIAL PRIMARY KEY,
    target_team VARCHAR(64) NOT NULL,
    kind VARCHAR(32) NOT NULL,
    message TEXT,
    duration_seconds INT NOT NULL DEFAULT 45,
    triggered_by VARCHAR(64) DEFAULT 'ADMIN',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );`,

  // 12. Row Level Security policies
  `ALTER TABLE event_state ENABLE ROW LEVEL SECURITY;`,
  `ALTER TABLE teams ENABLE ROW LEVEL SECURITY;`,
  `ALTER TABLE active_sessions ENABLE ROW LEVEL SECURITY;`,
  `ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;`,
  `ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;`,
  `ALTER TABLE question_answers ENABLE ROW LEVEL SECURITY;`,
  `ALTER TABLE question_hints ENABLE ROW LEVEL SECURITY;`,
  `ALTER TABLE team_submissions ENABLE ROW LEVEL SECURITY;`,
  `ALTER TABLE team_hint_usage ENABLE ROW LEVEL SECURITY;`,
  `ALTER TABLE vecna_sabotages ENABLE ROW LEVEL SECURITY;`,
  `ALTER TABLE vecna_messages ENABLE ROW LEVEL SECURITY;`,
  `ALTER TABLE vecna_deliveries ENABLE ROW LEVEL SECURITY;`,

  `DROP POLICY IF EXISTS "Public can view event state" ON event_state;`,
  `CREATE POLICY "Public can view event state" ON event_state FOR SELECT TO anon, authenticated USING (true);`,

  `DROP POLICY IF EXISTS "Public can view active teams leaderboard" ON teams;`,
  `CREATE POLICY "Public can view active teams leaderboard" ON teams FOR SELECT TO anon, authenticated USING (true);`,

  // Indexes
  `CREATE INDEX IF NOT EXISTS idx_submissions_team ON team_submissions(team_id);`,
  `CREATE INDEX IF NOT EXISTS idx_submissions_round ON team_submissions(team_id, round_number);`,
  `CREATE INDEX IF NOT EXISTS idx_teams_score ON teams(total_score DESC, updated_at ASC);`,
  `CREATE INDEX IF NOT EXISTS idx_active_sessions_team ON active_sessions(team_id);`,
];

async function main() {
  console.log(`Applying ${STATEMENTS.length} statements...`);
  for (let i = 0; i < STATEMENTS.length; i++) {
    const s = STATEMENTS[i].trim();
    try {
      await query(s);
      console.log(`[${i+1}/${STATEMENTS.length}] OK: ${s.split('\n')[0].substring(0, 50)}`);
    } catch (err) {
      console.error(`[${i+1}/${STATEMENTS.length}] FAIL: ${s.split('\n')[0]} -> ${err.message}`);
    }
  }
  console.log("Schema execution finished successfully!");
}

main().catch(console.error);
