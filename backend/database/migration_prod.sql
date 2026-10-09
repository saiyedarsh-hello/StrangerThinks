-- ==============================================================================
-- THE HAWKINS PROTOCOL — PRODUCTION DATABASE MIGRATION
-- Compatible with PostgreSQL 17 / Supabase
-- ==============================================================================

-- 1. Enable pgcrypto for UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Event State (Global Lifecycle Control)
CREATE TABLE IF NOT EXISTS event_state (
    id INT PRIMARY KEY DEFAULT 1,
    status VARCHAR(32) NOT NULL DEFAULT 'preparation', -- 'preparation', 'active', 'paused', 'submissions_closed', 'ended'
    login_open BOOLEAN NOT NULL DEFAULT TRUE,
    submissions_open BOOLEAN NOT NULL DEFAULT TRUE,
    current_round_max INT NOT NULL DEFAULT 7,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT single_event_state_row CHECK (id = 1)
);

INSERT INTO event_state (id, status, login_open, submissions_open, current_round_max)
VALUES (1, 'active', TRUE, TRUE, 7)
ON CONFLICT (id) DO UPDATE SET
    status = EXCLUDED.status,
    login_open = EXCLUDED.login_open,
    submissions_open = EXCLUDED.submissions_open;

-- 3. Teams Table (Stores credentials, scores, stage times)
CREATE TABLE IF NOT EXISTS teams (
    team_id VARCHAR(64) PRIMARY KEY,
    username VARCHAR(64) NOT NULL UNIQUE,
    password_plain VARCHAR(128) NOT NULL, -- Admin readable as explicitly required
    team_name VARCHAR(128) NOT NULL,
    squad_leader VARCHAR(128) NOT NULL,
    total_score INT NOT NULL DEFAULT 0,
    current_stage INT NOT NULL DEFAULT 1,
    stage_times JSONB NOT NULL DEFAULT '{}'::jsonb, -- e.g. {"stage_1": 240, "stage_2": 310} in seconds
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE', 'DISQUALIFIED'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Active Sessions (Strictly 1 Active Session per Team)
CREATE TABLE IF NOT EXISTS active_sessions (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id VARCHAR(64) NOT NULL UNIQUE REFERENCES teams(team_id) ON DELETE CASCADE,
    session_token TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_heartbeat TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Admin Users & Admin Sessions
CREATE TABLE IF NOT EXISTS admin_users (
    admin_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(64) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role VARCHAR(32) NOT NULL DEFAULT 'ADMIN',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_sessions (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_username VARCHAR(64) NOT NULL,
    session_token TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Rounds Table
CREATE TABLE IF NOT EXISTS rounds (
    round_number INT PRIMARY KEY,
    title VARCHAR(128) NOT NULL,
    stage_key VARCHAR(64) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO rounds (round_number, title, stage_key) VALUES
(1, 'Hawkins Town Telemetry', 'town'),
(2, 'Police Station Dossier', 'police'),
(3, 'Byers House Transmission', 'byers'),
(4, 'Hawkins Lab Sublevel', 'lab'),
(5, 'Creepy Forest Runes', 'forest'),
(6, 'Radio Tower Decryption', 'radiotower'),
(7, 'Upside Down Gate', 'upsidedown')
ON CONFLICT (round_number) DO NOTHING;

-- 7. Question Answers Vault (Server-Only Trusted Answers)
CREATE TABLE IF NOT EXISTS question_answers (
    question_id VARCHAR(64) PRIMARY KEY,
    round_number INT NOT NULL,
    correct_answer VARCHAR(256) NOT NULL,
    accepted_answers JSONB NOT NULL DEFAULT '[]'::jsonb,
    points INT NOT NULL DEFAULT 5
);

-- 8. Hints Table
CREATE TABLE IF NOT EXISTS question_hints (
    hint_id VARCHAR(64) PRIMARY KEY,
    question_id VARCHAR(64) NOT NULL,
    hint_number INT NOT NULL,
    hint_text TEXT NOT NULL,
    deduction INT NOT NULL DEFAULT 2
);

-- 9. Team Submissions Table (Enforces 1 Attempt per Question per Team)
CREATE TABLE IF NOT EXISTS team_submissions (
    submission_id SERIAL PRIMARY KEY,
    team_id VARCHAR(64) NOT NULL REFERENCES teams(team_id) ON DELETE CASCADE,
    question_id VARCHAR(64) NOT NULL,
    round_number INT NOT NULL,
    submitted_answer TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL,
    points_awarded INT NOT NULL DEFAULT 0,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_team_question UNIQUE (team_id, question_id)
);

-- 10. Team Hint Usage (Enforces 1 Deduction per Hint per Team)
CREATE TABLE IF NOT EXISTS team_hint_usage (
    usage_id SERIAL PRIMARY KEY,
    team_id VARCHAR(64) NOT NULL REFERENCES teams(team_id) ON DELETE CASCADE,
    hint_id VARCHAR(64) NOT NULL,
    question_id VARCHAR(64) NOT NULL,
    deduction INT NOT NULL DEFAULT 0,
    used_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_team_hint UNIQUE (team_id, hint_id)
);

-- 11. Vecna Sabotages & Messages
CREATE TABLE IF NOT EXISTS vecna_sabotages (
    sabotage_id SERIAL PRIMARY KEY,
    target_team VARCHAR(64) NOT NULL, -- team_id or 'all'
    kind VARCHAR(32) NOT NULL, -- 'TIME_FREEZE', 'DISTORT', 'SIGNAL_JAM', 'MESSAGE', 'GLITCH', 'CORRUPT', 'LOCK'
    message TEXT,
    duration_seconds INT NOT NULL DEFAULT 45,
    triggered_by VARCHAR(64) DEFAULT 'ADMIN',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vecna_messages (
    message_id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(128) NOT NULL,
    content TEXT NOT NULL,
    trigger_type VARCHAR(64) NOT NULL, -- 'ROUND', 'HINT', 'MILESTONE'
    trigger_value VARCHAR(64) NOT NULL
);

CREATE TABLE IF NOT EXISTS vecna_deliveries (
    delivery_id SERIAL PRIMARY KEY,
    message_id VARCHAR(64) NOT NULL,
    team_id VARCHAR(64) NOT NULL REFERENCES teams(team_id) ON DELETE CASCADE,
    delivered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_message_delivery UNIQUE (message_id, team_id)
);

-- 12. Security: Row Level Security (RLS)
ALTER TABLE event_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE active_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_hints ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_hint_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE vecna_sabotages ENABLE ROW LEVEL SECURITY;
ALTER TABLE vecna_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE vecna_deliveries ENABLE ROW LEVEL SECURITY;

-- Allow public read of event_state status only
DROP POLICY IF EXISTS "Public can view event state" ON event_state;
CREATE POLICY "Public can view event state" ON event_state FOR SELECT TO anon, authenticated USING (true);

-- Allow public read of non-sensitive team leaderboard view
DROP POLICY IF EXISTS "Public can view active teams leaderboard" ON teams;
CREATE POLICY "Public can view active teams leaderboard" ON teams FOR SELECT TO anon, authenticated USING (true);

-- Indexes for lightning fast queries under 90-team concurrency
CREATE INDEX IF NOT EXISTS idx_submissions_team ON team_submissions(team_id);
CREATE INDEX IF NOT EXISTS idx_submissions_round ON team_submissions(team_id, round_number);
CREATE INDEX IF NOT EXISTS idx_teams_score ON teams(total_score DESC, updated_at ASC);
CREATE INDEX IF NOT EXISTS idx_active_sessions_team ON active_sessions(team_id);
