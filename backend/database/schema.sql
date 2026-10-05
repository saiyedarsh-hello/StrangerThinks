-- ==============================================================================
-- THE HAWKINS PROTOCOL - PRODUCTION SQL DATABASE SCHEMA
-- Compatible with PostgreSQL (recommended), Supabase, MySQL 8+, & SQLite3
-- ==============================================================================

-- ==============================================================================
-- PART A: QUESTIONS & CHAPTER VAULT REPOSITORY
-- ==============================================================================

-- 1. Chapters Table
-- Core container for each story segment, sector, and game level
CREATE TABLE IF NOT EXISTS chapters (
    chapter_id INT PRIMARY KEY,
    sector_code VARCHAR(32) NOT NULL,            -- e.g., 'HAWKINS-CORONER', 'LAB-SUB-LEVEL-4'
    tag VARCHAR(32) NOT NULL,                    -- e.g., 'FORENSIC LOG', 'TRANSMISSION'
    title VARCHAR(128) NOT NULL,                 -- e.g., 'THE BOY WHO VANISHED'
    subtitle VARCHAR(256),                       -- Short descriptive synopsis
    task_id VARCHAR(64) NOT NULL UNIQUE,         -- e.g., 'task-ch1-coroner', 'task-ch7-gate'
    task_type VARCHAR(32) NOT NULL DEFAULT 'CHOICE', -- 'CHOICE', 'DECRYPTION', 'PUZZLE'
    points INT NOT NULL DEFAULT 100,             -- Points awarded upon correct verification
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Questions & Secret Answer Vault Table
-- Stores prompts, clues, and cryptographically verified answers
CREATE TABLE IF NOT EXISTS chapter_questions (
    question_id SERIAL PRIMARY KEY,
    chapter_id INT NOT NULL UNIQUE REFERENCES chapters(chapter_id) ON DELETE CASCADE,
    prompt TEXT NOT NULL,                        -- The question/cipher displayed to player
    correct_answer VARCHAR(256) NOT NULL,        -- Protected secret key (verified ONLY server-side)
    hint TEXT,                                   -- Optional field clue or encrypted hint
    max_attempts INT DEFAULT 10,                 -- Brute-force threshold per team
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Multiple Choice Options Table
-- For questions configured with choice options (A, B, C, D)
CREATE TABLE IF NOT EXISTS question_options (
    option_id SERIAL PRIMARY KEY,
    chapter_id INT NOT NULL REFERENCES chapters(chapter_id) ON DELETE CASCADE,
    option_key VARCHAR(8) NOT NULL,              -- 'A', 'B', 'C', 'D'
    option_text TEXT NOT NULL,                   -- Description text
    sort_order INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_chapter_option UNIQUE (chapter_id, option_key)
);

-- 4. Chapter Lore & Briefings Table
-- Stores dialogue, narrator characters, and pixel-art avatar associations
CREATE TABLE IF NOT EXISTS chapter_lore (
    lore_id SERIAL PRIMARY KEY,
    chapter_id INT NOT NULL REFERENCES chapters(chapter_id) ON DELETE CASCADE,
    speaker_code VARCHAR(32) NOT NULL,           -- 'hopper', 'joyce', 'brenner', 'ranger', 'vecna'
    speaker_name VARCHAR(64) NOT NULL,           -- e.g., 'CHIEF JIM HOPPER'
    dialogue_script TEXT NOT NULL,               -- Lore text displayed with screen blur
    trigger_phase VARCHAR(32) DEFAULT 'START',   -- 'START', 'SOLVED', 'HINT'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- PART B: USERS, TEAMS, & LIVE LEADERBOARD
-- ==============================================================================

-- 5. Teams Table
-- Primary participant identity and aggregate tournament score
CREATE TABLE IF NOT EXISTS teams (
    team_id VARCHAR(64) PRIMARY KEY,             -- e.g., 'TEAM-HAWKINS-01', 'TEAM-AV-CLUB'
    team_name VARCHAR(128) NOT NULL UNIQUE,      -- Display name on leaderboard
    squad_leader VARCHAR(128) NOT NULL,          -- Point of contact / commander
    access_passcode VARCHAR(128) NOT NULL,       -- Team login credential (salted hash)
    total_score INT NOT NULL DEFAULT 0,          -- Denormalized cache for sub-millisecond sorting
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',-- 'ACTIVE', 'COMPLETED', 'DISQUALIFIED'
    last_solved_at TIMESTAMP WITH TIME ZONE,     -- Tie-breaker: earlier completion ranks higher
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Team Members Roster (Optional user breakdown)
CREATE TABLE IF NOT EXISTS team_members (
    member_id SERIAL PRIMARY KEY,
    team_id VARCHAR(64) NOT NULL REFERENCES teams(team_id) ON DELETE CASCADE,
    callsign VARCHAR(64) NOT NULL,               -- e.g., 'Dustin Henderson'
    role VARCHAR(64) DEFAULT 'OPERATOR',         -- 'LEADER', 'CIPHER_SPECIALIST', 'RADAR'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Chapter Solves / Progress Table
-- Record of which teams solved which chapters, time taken, and points awarded
CREATE TABLE IF NOT EXISTS chapter_solves (
    solve_id SERIAL PRIMARY KEY,
    team_id VARCHAR(64) NOT NULL REFERENCES teams(team_id) ON DELETE CASCADE,
    chapter_id INT NOT NULL REFERENCES chapters(chapter_id) ON DELETE CASCADE,
    points_awarded INT NOT NULL,
    attempts_count INT NOT NULL DEFAULT 1,
    solved_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_team_chapter_solve UNIQUE (team_id, chapter_id)
);

-- 8. Submissions & Anti-Cheat Audit Log Table
-- Logs every single validation attempt for rate-limiting, telemetry, & replay verification
CREATE TABLE IF NOT EXISTS submission_logs (
    log_id BIGSERIAL PRIMARY KEY,
    team_id VARCHAR(64) NOT NULL,
    chapter_id INT NOT NULL,
    attempted_value TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL,
    ip_address VARCHAR(45),
    response_time_ms INT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- PART C: HIGH-PERFORMANCE INDEXES
-- Critical for handling 100+ concurrent requests without DB connection starvation
-- ==============================================================================

-- Index for real-time leaderboard sorting (Score DESC, then earliest solve ASC)
CREATE INDEX IF NOT EXISTS idx_teams_leaderboard_rank 
ON teams (total_score DESC, last_solved_at ASC NULLS LAST);

-- Index for instant lookup of team solve history
CREATE INDEX IF NOT EXISTS idx_solves_team_chapter 
ON chapter_solves (team_id, chapter_id);

-- Index for question retrieval by task identifier
CREATE INDEX IF NOT EXISTS idx_chapters_task_id 
ON chapters (task_id);

-- Index for submission rate-limiting queries (filter by team and recent timeframe)
CREATE INDEX IF NOT EXISTS idx_submission_logs_rate_limit 
ON submission_logs (team_id, created_at DESC);

-- ==============================================================================
-- PART D: REAL-TIME LEADERBOARD VIEW
-- Computes ranks dynamically with tie-breakers and chapter counts
-- ==============================================================================

CREATE OR REPLACE VIEW vw_live_leaderboard AS
SELECT 
    ROW_NUMBER() OVER (
        ORDER BY t.total_score DESC, t.last_solved_at ASC NULLS LAST, t.created_at ASC
    ) AS rank,
    t.team_id,
    t.team_name,
    t.squad_leader,
    t.total_score,
    COUNT(s.chapter_id) AS solved_count,
    CASE 
        WHEN COUNT(s.chapter_id) = (SELECT COUNT(*) FROM chapters WHERE is_active = TRUE) THEN 'COMPLETED'
        WHEN COUNT(s.chapter_id) > 0 THEN 'ACTIVE'
        ELSE 'REGISTERED'
    END AS status,
    t.last_solved_at
FROM teams t
LEFT JOIN chapter_solves s ON t.team_id = s.team_id
GROUP BY t.team_id, t.team_name, t.squad_leader, t.total_score, t.last_solved_at, t.created_at
ORDER BY rank ASC;

-- ==============================================================================
-- PART E: SEED DATA (Canon Hawkins Chapters 1-7)
-- ==============================================================================

INSERT INTO chapters (chapter_id, sector_code, tag, title, subtitle, task_id, task_type, points) VALUES
(1, 'HAWKINS-CORONER', 'FORENSIC LOG', 'THE VANISHING OF WILL BYERS', 'Preliminary autopsy protocol analysis', 'task-ch1-coroner', 'CHOICE', 100),
(2, 'AV-CLUB-HAM-RADIO', 'SIGNAL DECRYPT', 'THE WEIRD DO REALITY', 'Russian/Upside-Down frequency calibration', 'task-ch2-radio', 'CHOICE', 120),
(3, 'HAWKINS-LAB-GATE', 'GATE METRICS', 'THE MONSTER IN THE LAB', 'Rift ionization temperature thresholds', 'task-ch3-lab', 'CHOICE', 150),
(4, 'FOREST-QUARRY', 'TRACKING MAP', 'THE BODY IN THE WATER', 'Triangulation of false dummy evidence', 'task-ch4-quarry', 'CHOICE', 180),
(5, 'UPSIDE-DOWN-GATE', 'PORTAL CORE', 'THE FLEA AND THE ACROBAT', 'Spacetime curvature gravity equations', 'task-ch5-portal', 'CHOICE', 200),
(6, 'BYERS-RESIDENCE', 'CHRISTMAS LIGHTS', 'THE MONSTER COMMUNICATES', 'Wall alphabet bulb decoding matrix', 'task-ch6-lights', 'CHOICE', 250),
(7, 'VOID-SENSORY-DEPR', 'VOID FREQUENCY', 'THE RIFT PROTOCOL', 'Hydro tank psychic signal threshold', 'task-ch7-void', 'CHOICE', 300)
ON CONFLICT (chapter_id) DO NOTHING;

-- Seed Questions & Answers
INSERT INTO chapter_questions (chapter_id, prompt, correct_answer) VALUES
(1, 'What anomaly was recorded by Officer Callahan regarding the cold storage chamber at Hawkins Morgue on Nov 7, 1983?', 'TEMPERATURE_SUB_ZERO'),
(2, 'What was the exact broadcast frequency decoded on the Heathkit ham radio matching Russian submarine Morse?', '14.285_MHZ'),
(3, 'Which security clearance level was revoked from Dr. Martin Brenner after the perimeter containment breach?', 'CLEARANCE_DELTA_BLACK'),
(4, 'What was the recorded depth reading when the fake decoy body was hauled from Sattler Quarry?', '94_FEET_DEPTH'),
(5, 'According to Mr. Clarke, how does an acrobat travel along the tightrope compared to the flea?', 'ONE_DIMENSION_TIGHTROPE'),
(6, 'Which three letters lit up sequentially on Joyce Byers living room wall in the first warning message?', 'R_U_N'),
(7, 'What concentration of commercial mineral salt was dissolved in the Middle School sensory tank?', '1500_LBS_SALINE')
ON CONFLICT (chapter_id) DO NOTHING;
