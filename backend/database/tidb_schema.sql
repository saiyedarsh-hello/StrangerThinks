-- ==============================================================================
-- THE HAWKINS PROTOCOL - TIDB / MYSQL 8.0+ PRODUCTION SCHEMA
-- Fully aligned with STRANGER_THINGS_TIDB_SOCKETIO_BACKEND_SPEC.md
-- Distributed SQL Architecture for High-Concurrency Tournaments
-- ==============================================================================

CREATE DATABASE IF NOT EXISTS stranger_thinks CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE stranger_thinks;

-- ==============================================================================
-- 1. SPEC TABLES: EVENT STATE, SESSIONS, QUESTIONS & VECNA WORKFLOW
-- ==============================================================================

-- 1.1 Events Table
CREATE TABLE IF NOT EXISTS events (
  event_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  event_code VARCHAR(64) NOT NULL,
  event_name VARCHAR(160) NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'active',
  login_open TINYINT(1) NOT NULL DEFAULT 1,
  submissions_open TINYINT(1) NOT NULL DEFAULT 1,
  is_paused TINYINT(1) NOT NULL DEFAULT 0,
  started_at DATETIME(3) NULL,
  ended_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (event_id),
  UNIQUE KEY uq_events_code (event_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- 1.2 Admin Users Table
CREATE TABLE IF NOT EXISTS admin_users (
  admin_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  username VARCHAR(80) NOT NULL,
  username_normalized VARCHAR(80) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(120) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  last_login_at DATETIME(3) NULL,
  PRIMARY KEY (admin_id),
  UNIQUE KEY uq_admin_username (username_normalized)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- 1.3 Hawkins Participant Teams Table
CREATE TABLE IF NOT EXISTS teams (
  team_id VARCHAR(64) NOT NULL,
  event_id BIGINT UNSIGNED NOT NULL DEFAULT 1,
  team_code VARCHAR(40) NOT NULL,
  team_name VARCHAR(100) NOT NULL,
  squad_leader VARCHAR(128) NOT NULL DEFAULT '',
  username VARCHAR(80) NOT NULL,
  username_normalized VARCHAR(80) NOT NULL,
  password_hash VARCHAR(255) NOT NULL DEFAULT '',
  role VARCHAR(32) NOT NULL DEFAULT 'PLAYER',
  total_score INT NOT NULL DEFAULT 0,
  penalty INT NOT NULL DEFAULT 0,
  status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
  location VARCHAR(64) NOT NULL DEFAULT 'town',
  stage VARCHAR(64) NOT NULL DEFAULT 'hawkins',
  story_progress INT NOT NULL DEFAULT 5,
  started_at DATETIME(3) NULL,
  finished_at DATETIME(3) NULL,
  last_solved_at DATETIME(3) NULL,
  breakdown_json JSON NULL,
  radiometer_pins JSON NULL,
  radiometer_solved JSON NULL,
  radiometer_code_solved BOOLEAN NOT NULL DEFAULT FALSE,
  unlocked_locations JSON NULL,
  unlocked_hints JSON NULL,
  completed_tasks JSON NULL,
  solved_chapters JSON NULL,
  is_enabled TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  last_login_at DATETIME(3) NULL,
  PRIMARY KEY (team_id),
  UNIQUE KEY uq_teams_code (team_code),
  UNIQUE KEY uq_teams_username (username_normalized),
  CONSTRAINT fk_teams_event FOREIGN KEY (event_id) REFERENCES events(event_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- 1.4 Rounds Table
CREATE TABLE IF NOT EXISTS rounds (
  round_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  event_id BIGINT UNSIGNED NOT NULL,
  round_number INT UNSIGNED NOT NULL,
  round_code VARCHAR(64) NOT NULL,
  round_name VARCHAR(160) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (round_id),
  UNIQUE KEY uq_round_number (event_id, round_number),
  UNIQUE KEY uq_round_code (event_id, round_code),
  CONSTRAINT fk_rounds_event FOREIGN KEY (event_id) REFERENCES events(event_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- 1.5 Questions Table
CREATE TABLE IF NOT EXISTS questions (
  question_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  round_id BIGINT UNSIGNED NOT NULL,
  question_code VARCHAR(80) NOT NULL,
  question_order INT UNSIGNED NOT NULL,
  question_type VARCHAR(40) NOT NULL DEFAULT 'text',
  points DECIMAL(8,2) NOT NULL DEFAULT 0,
  prompt_content JSON NULL,
  media_config JSON NULL,
  normalization_profile VARCHAR(40) NOT NULL DEFAULT 'trim_lowercase',
  validator_type VARCHAR(40) NOT NULL DEFAULT 'exact_hmac',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (question_id),
  UNIQUE KEY uq_question_code (question_code),
  UNIQUE KEY uq_question_order (round_id, question_order),
  CONSTRAINT fk_questions_round FOREIGN KEY (round_id) REFERENCES rounds(round_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- 1.6 Question Answer Keys Table (Server Secret HMACs)
CREATE TABLE IF NOT EXISTS question_answer_keys (
  answer_key_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  question_id BIGINT UNSIGNED NOT NULL,
  accepted_answer_hmac CHAR(64) NOT NULL,
  answer_variant_number INT UNSIGNED NOT NULL DEFAULT 1,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (answer_key_id),
  UNIQUE KEY uq_question_answer_variant (question_id, answer_variant_number),
  UNIQUE KEY uq_question_answer_hmac (question_id, accepted_answer_hmac),
  CONSTRAINT fk_answer_keys_question FOREIGN KEY (question_id) REFERENCES questions(question_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- 1.7 Question Hints Table
CREATE TABLE IF NOT EXISTS question_hints (
  hint_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  question_id BIGINT UNSIGNED NOT NULL,
  hint_order INT UNSIGNED NOT NULL,
  hint_text TEXT NOT NULL,
  penalty_points DECIMAL(8,2) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (hint_id),
  UNIQUE KEY uq_question_hint_order (question_id, hint_order),
  CONSTRAINT fk_hints_question FOREIGN KEY (question_id) REFERENCES questions(question_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- 1.8 Team Active Sessions Table (Enforces Exactly 1 Active Session per Team via PK)
CREATE TABLE IF NOT EXISTS team_active_sessions (
  team_id VARCHAR(64) NOT NULL,
  session_id CHAR(36) NOT NULL,
  session_token_hash CHAR(64) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  last_seen_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  valid_until DATETIME(3) NULL,
  PRIMARY KEY (team_id),
  UNIQUE KEY uq_active_session_id (session_id),
  UNIQUE KEY uq_active_session_token_hash (session_token_hash),
  CONSTRAINT fk_active_session_team FOREIGN KEY (team_id) REFERENCES teams(team_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- 1.9 Team Session Audit Table
CREATE TABLE IF NOT EXISTS team_session_audit (
  session_audit_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  team_id VARCHAR(64) NOT NULL,
  session_id CHAR(36) NULL,
  action_type VARCHAR(40) NOT NULL,
  reason VARCHAR(160) NULL,
  actor_admin_id BIGINT UNSIGNED NULL,
  occurred_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (session_audit_id),
  KEY ix_session_audit_team_time (team_id, occurred_at),
  CONSTRAINT fk_session_audit_team FOREIGN KEY (team_id) REFERENCES teams(team_id) ON DELETE CASCADE,
  CONSTRAINT fk_session_audit_admin FOREIGN KEY (actor_admin_id) REFERENCES admin_users(admin_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- 1.10 Team Round Progress Table
CREATE TABLE IF NOT EXISTS team_round_progress (
  team_id VARCHAR(64) NOT NULL,
  round_id BIGINT UNSIGNED NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'locked',
  unlocked_at DATETIME(3) NULL,
  completed_at DATETIME(3) NULL,
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (team_id, round_id),
  KEY ix_round_progress_round_status (round_id, status),
  CONSTRAINT fk_round_progress_team FOREIGN KEY (team_id) REFERENCES teams(team_id) ON DELETE CASCADE,
  CONSTRAINT fk_round_progress_round FOREIGN KEY (round_id) REFERENCES rounds(round_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- 1.11 Team Progress Table
CREATE TABLE IF NOT EXISTS team_progress (
  team_id VARCHAR(64) NOT NULL,
  current_round_id BIGINT UNSIGNED NULL,
  last_opened_question_id BIGINT UNSIGNED NULL,
  last_progress_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (team_id),
  CONSTRAINT fk_progress_team FOREIGN KEY (team_id) REFERENCES teams(team_id) ON DELETE CASCADE,
  CONSTRAINT fk_progress_round FOREIGN KEY (current_round_id) REFERENCES rounds(round_id),
  CONSTRAINT fk_progress_question FOREIGN KEY (last_opened_question_id) REFERENCES questions(question_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- 1.12 Question Submissions Table (Immutable One Submission Per Team Per Question)
CREATE TABLE IF NOT EXISTS question_submissions (
  submission_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  team_id VARCHAR(64) NOT NULL,
  round_id BIGINT UNSIGNED NOT NULL,
  question_id BIGINT UNSIGNED NOT NULL,
  submitted_answer TEXT NOT NULL,
  is_correct TINYINT(1) NOT NULL,
  points_awarded DECIMAL(8,2) NOT NULL DEFAULT 0,
  submitted_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (submission_id),
  UNIQUE KEY uq_one_submission_per_team_question (team_id, question_id),
  KEY ix_submissions_team_round (team_id, round_id, submitted_at),
  KEY ix_submissions_round_time (round_id, submitted_at),
  CONSTRAINT fk_submissions_team FOREIGN KEY (team_id) REFERENCES teams(team_id) ON DELETE CASCADE,
  CONSTRAINT fk_submissions_round FOREIGN KEY (round_id) REFERENCES rounds(round_id),
  CONSTRAINT fk_submissions_question FOREIGN KEY (question_id) REFERENCES questions(question_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- 1.13 Team Hint Usages Table (Unique Hint Consumption)
CREATE TABLE IF NOT EXISTS team_hint_usages (
  hint_usage_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  team_id VARCHAR(64) NOT NULL,
  question_id BIGINT UNSIGNED NOT NULL,
  hint_id BIGINT UNSIGNED NOT NULL,
  penalty_points DECIMAL(8,2) NOT NULL,
  used_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (hint_usage_id),
  UNIQUE KEY uq_team_hint_once (team_id, hint_id),
  KEY ix_hint_usage_team_question (team_id, question_id),
  CONSTRAINT fk_hint_usage_team FOREIGN KEY (team_id) REFERENCES teams(team_id) ON DELETE CASCADE,
  CONSTRAINT fk_hint_usage_question FOREIGN KEY (question_id) REFERENCES questions(question_id),
  CONSTRAINT fk_hint_usage_hint FOREIGN KEY (hint_id) REFERENCES question_hints(hint_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- 1.14 Score Ledger Table (Immutable point adjustments)
CREATE TABLE IF NOT EXISTS score_ledger (
  score_entry_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  team_id VARCHAR(64) NOT NULL,
  round_id BIGINT UNSIGNED NOT NULL,
  question_id BIGINT UNSIGNED NULL,
  source_type VARCHAR(32) NOT NULL,
  source_id VARCHAR(80) NOT NULL,
  points_delta DECIMAL(8,2) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (score_entry_id),
  UNIQUE KEY uq_score_source (team_id, source_type, source_id),
  KEY ix_score_team_round (team_id, round_id),
  KEY ix_score_round (round_id),
  CONSTRAINT fk_score_team FOREIGN KEY (team_id) REFERENCES teams(team_id) ON DELETE CASCADE,
  CONSTRAINT fk_score_round FOREIGN KEY (round_id) REFERENCES rounds(round_id),
  CONSTRAINT fk_score_question FOREIGN KEY (question_id) REFERENCES questions(question_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- 1.15 Vecna Senders Table (Multiple Authorized Vecna Accounts)
CREATE TABLE IF NOT EXISTS vecna_senders (
  vecna_sender_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  sender_code VARCHAR(40) NOT NULL,
  sender_name VARCHAR(100) NOT NULL,
  username VARCHAR(80) NOT NULL,
  username_normalized VARCHAR(80) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  is_enabled TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  last_login_at DATETIME(3) NULL,
  PRIMARY KEY (vecna_sender_id),
  UNIQUE KEY uq_vecna_sender_code (sender_code),
  UNIQUE KEY uq_vecna_sender_username (username_normalized)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- 1.16 Vecna Sender Sessions Table
CREATE TABLE IF NOT EXISTS vecna_sender_sessions (
  vecna_sender_id BIGINT UNSIGNED NOT NULL,
  session_id CHAR(36) NOT NULL,
  session_token_hash CHAR(64) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  last_seen_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  expires_at DATETIME(3) NOT NULL,
  revoked_at DATETIME(3) NULL,
  PRIMARY KEY (vecna_sender_id),
  UNIQUE KEY uq_vecna_sender_session_id (session_id),
  UNIQUE KEY uq_vecna_sender_token_hash (session_token_hash),
  CONSTRAINT fk_vecna_sender_session_sender FOREIGN KEY (vecna_sender_id) REFERENCES vecna_senders(vecna_sender_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- 1.17 Vecna Message Templates Table (Prepared templates <= 150 chars)
CREATE TABLE IF NOT EXISTS vecna_message_templates (
  template_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  template_code VARCHAR(64) NOT NULL,
  template_name VARCHAR(100) NOT NULL,
  body_text VARCHAR(150) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_by_admin_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (template_id),
  UNIQUE KEY uq_vecna_template_code (template_code),
  KEY ix_vecna_templates_active (is_active, template_name),
  CONSTRAINT fk_vecna_template_admin FOREIGN KEY (created_by_admin_id) REFERENCES admin_users(admin_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- 1.18 Vecna Messages Table (Manual Submission with Mandatory Admin Approval Queue)
CREATE TABLE IF NOT EXISTS vecna_messages (
  message_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  sender_id BIGINT UNSIGNED NOT NULL,
  client_request_id VARCHAR(80) NOT NULL,
  source_type VARCHAR(16) NOT NULL,
  template_id BIGINT UNSIGNED NULL,
  body_text VARCHAR(150) NOT NULL,
  recipient_scope VARCHAR(24) NOT NULL,
  approval_status VARCHAR(24) NOT NULL DEFAULT 'pending_approval',
  requested_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  reviewed_by_admin_id BIGINT UNSIGNED NULL,
  reviewed_at DATETIME(3) NULL,
  rejection_reason VARCHAR(300) NULL,
  sent_at DATETIME(3) NULL,
  PRIMARY KEY (message_id),
  UNIQUE KEY uq_vecna_sender_request (sender_id, client_request_id),
  KEY ix_vecna_messages_review_queue (approval_status, requested_at),
  KEY ix_vecna_messages_sender_time (sender_id, requested_at),
  KEY ix_vecna_messages_sent_at (sent_at),
  CONSTRAINT fk_vecna_message_sender FOREIGN KEY (sender_id) REFERENCES vecna_senders(vecna_sender_id),
  CONSTRAINT fk_vecna_message_template FOREIGN KEY (template_id) REFERENCES vecna_message_templates(template_id),
  CONSTRAINT fk_vecna_message_reviewer FOREIGN KEY (reviewed_by_admin_id) REFERENCES admin_users(admin_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- 1.19 Vecna Message Targets Table (Targeted Hawkins teams prior to approval)
CREATE TABLE IF NOT EXISTS vecna_message_targets (
  message_id BIGINT UNSIGNED NOT NULL,
  team_id VARCHAR(64) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (message_id, team_id),
  KEY ix_vecna_targets_team (team_id, message_id),
  CONSTRAINT fk_vecna_target_message FOREIGN KEY (message_id) REFERENCES vecna_messages(message_id) ON DELETE CASCADE,
  CONSTRAINT fk_vecna_target_team FOREIGN KEY (team_id) REFERENCES teams(team_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- 1.20 Team Vecna Deliveries Table (Durable Team Inbox created ONLY AFTER approval)
CREATE TABLE IF NOT EXISTS team_vecna_deliveries (
  delivery_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  message_id BIGINT UNSIGNED NOT NULL,
  team_id VARCHAR(64) NOT NULL,
  delivered_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  read_at DATETIME(3) NULL,
  PRIMARY KEY (delivery_id),
  UNIQUE KEY uq_vecna_delivery_team_message (message_id, team_id),
  KEY ix_vecna_inbox_team_time (team_id, delivered_at),
  CONSTRAINT fk_vecna_delivery_team FOREIGN KEY (team_id) REFERENCES teams(team_id) ON DELETE CASCADE,
  CONSTRAINT fk_vecna_delivery_message FOREIGN KEY (message_id) REFERENCES vecna_messages(message_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- 1.21 Realtime Outbox Table (Reliable Socket.IO event queue)
CREATE TABLE IF NOT EXISTS realtime_outbox (
  outbox_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  event_key VARCHAR(160) NOT NULL,
  target_type VARCHAR(24) NOT NULL,
  target_team_id VARCHAR(64) NULL,
  target_admin_room TINYINT(1) NOT NULL DEFAULT 0,
  event_name VARCHAR(80) NOT NULL,
  payload JSON NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  published_at DATETIME(3) NULL,
  attempt_count INT UNSIGNED NOT NULL DEFAULT 0,
  last_error VARCHAR(500) NULL,
  PRIMARY KEY (outbox_id),
  UNIQUE KEY uq_outbox_event_key (event_key),
  KEY ix_outbox_pending (published_at, outbox_id),
  CONSTRAINT fk_outbox_team FOREIGN KEY (target_team_id) REFERENCES teams(team_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- 1.22 Admin Audit Log Table
CREATE TABLE IF NOT EXISTS admin_audit_log (
  audit_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  admin_id BIGINT UNSIGNED NOT NULL,
  action_type VARCHAR(64) NOT NULL,
  target_type VARCHAR(40) NULL,
  target_id VARCHAR(80) NULL,
  details JSON NULL,
  occurred_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (audit_id),
  KEY ix_admin_audit_time (occurred_at),
  KEY ix_admin_audit_actor_time (admin_id, occurred_at),
  CONSTRAINT fk_admin_audit_admin FOREIGN KEY (admin_id) REFERENCES admin_users(admin_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- ==============================================================================
-- 2. BACKWARD-COMPATIBLE GAMEPLAY TABLES (Chapters, Solves, Radiometer)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS chapters (
  chapter_id INT PRIMARY KEY,
  sector_code VARCHAR(32) NOT NULL,
  tag VARCHAR(32) NOT NULL,
  title VARCHAR(128) NOT NULL,
  subtitle VARCHAR(256),
  task_id VARCHAR(64) NOT NULL UNIQUE,
  task_type VARCHAR(32) NOT NULL DEFAULT 'CHOICE',
  points INT NOT NULL DEFAULT 100,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE IF NOT EXISTS chapter_questions (
  question_id INT AUTO_INCREMENT PRIMARY KEY,
  chapter_id INT NOT NULL UNIQUE,
  prompt TEXT NOT NULL,
  correct_answer VARCHAR(256) NOT NULL,
  hint TEXT,
  max_attempts INT DEFAULT 10,
  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_cq_chapter FOREIGN KEY (chapter_id) REFERENCES chapters(chapter_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE IF NOT EXISTS question_options (
  option_id INT AUTO_INCREMENT PRIMARY KEY,
  chapter_id INT NOT NULL,
  option_key VARCHAR(8) NOT NULL,
  option_text TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 1,
  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT uq_chapter_option UNIQUE (chapter_id, option_key),
  CONSTRAINT fk_qo_chapter FOREIGN KEY (chapter_id) REFERENCES chapters(chapter_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE IF NOT EXISTS chapter_solves (
  solve_id INT AUTO_INCREMENT PRIMARY KEY,
  team_id VARCHAR(64) NOT NULL,
  chapter_id INT NOT NULL,
  points_awarded INT NOT NULL,
  attempts_count INT NOT NULL DEFAULT 1,
  solved_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT uq_team_chapter_solve UNIQUE (team_id, chapter_id),
  CONSTRAINT fk_cs_team FOREIGN KEY (team_id) REFERENCES teams(team_id) ON DELETE CASCADE,
  CONSTRAINT fk_cs_chapter FOREIGN KEY (chapter_id) REFERENCES chapters(chapter_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE IF NOT EXISTS active_sabotages (
  sabotage_id INT AUTO_INCREMENT PRIMARY KEY,
  source_team VARCHAR(64) NOT NULL,
  target_team VARCHAR(64) NOT NULL,
  kind VARCHAR(32) NOT NULL,
  pin_index INT NULL,
  message TEXT NULL,
  duration_ms INT NOT NULL DEFAULT 45000,
  expires_at BIGINT NOT NULL,
  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- ==============================================================================
-- 3. CANONICAL SEED DATA
-- ==============================================================================

-- 3.1 Default Event
INSERT INTO events (event_id, event_code, event_name, status, login_open, submissions_open, is_paused)
VALUES (1, 'HAWKINS_1983', 'Stranger Things Hawkins Invitational 1983', 'active', 1, 1, 0)
ON DUPLICATE KEY UPDATE
  status = VALUES(status),
  login_open = VALUES(login_open),
  submissions_open = VALUES(submissions_open);

-- 3.2 Admin Users
INSERT INTO admin_users (admin_id, username, username_normalized, password_hash, display_name, is_active)
VALUES 
(1, 'admin', 'admin', 'HAWKINS_CHIEF_1983', 'Chief Jim Hopper', 1),
(2, 'deputy', 'deputy', 'HAWKINS_CHIEF_1983', 'Officer Callahan', 1)
ON DUPLICATE KEY UPDATE display_name = VALUES(display_name);

-- 3.3 Multiple Authorized Vecna Sender Accounts
INSERT INTO vecna_senders (vecna_sender_id, sender_code, sender_name, username, username_normalized, password_hash, is_enabled)
VALUES
(1, 'VECNA_PRIME', 'Henry Creel (Vecna Prime)', 'vecna', 'vecna', 'CREEL_HOUSE_001', 1),
(2, 'MIND_FLAYER', 'The Mind Flayer', 'mindflayer', 'mindflayer', 'SHADOW_MONSTER_1983', 1)
ON DUPLICATE KEY UPDATE sender_name = VALUES(sender_name);

-- 3.4 Prepared Vecna Message Templates (Strictly <= 150 chars)
INSERT INTO vecna_message_templates (template_id, template_code, template_name, body_text, is_active, created_by_admin_id)
VALUES
(1, 'TPL_TICK_TOCK', 'The Clock Strikes', 'Tick tock... the grandfather clock tolls four times. Your time in Hawkins is coming to an end.', 1, 1),
(2, 'TPL_MINDFLAYER', 'Shadow Over Hawkins', 'You cannot hide in the dark. The Shadow Monster already controls the perimeter.', 1, 1),
(3, 'TPL_RUN', 'Joyce Byers Warning', 'R... U... N... The bulbs flicker wildly on the living room wall.', 1, 1),
(4, 'TPL_VOID_SPEECH', 'Void Whispers', 'I have seen your fears, Hawkins squad. Every secret you hold belongs to me now.', 1, 1)
ON DUPLICATE KEY UPDATE body_text = VALUES(body_text);

-- 3.5 Rounds (7 Sequential Rounds)
INSERT INTO rounds (round_id, event_id, round_number, round_code, round_name, is_active)
VALUES
(1, 1, 1, 'R1_CORONER', 'Chapter 1: The Vanishing of Will Byers', 1),
(2, 1, 2, 'R2_RADIO', 'Chapter 2: The Weirdo on Maple Street', 1),
(3, 1, 3, 'R3_LAB', 'Chapter 3: Holly, Jolly — The Hawkins Lab Gate', 1),
(4, 1, 4, 'R4_QUARRY', 'Chapter 4: The Body in Sattler Quarry', 1),
(5, 1, 5, 'R5_PORTAL', 'Chapter 5: The Flea and the Acrobat', 1),
(6, 1, 6, 'R6_LIGHTS', 'Chapter 6: The Monster Communicates', 1),
(7, 1, 7, 'R7_VOID', 'Chapter 7: The Bathtub & The Upside Down', 1)
ON DUPLICATE KEY UPDATE round_name = VALUES(round_name);

-- 3.6 Questions
INSERT INTO questions (question_id, round_id, question_code, question_order, question_type, points, prompt_content)
VALUES
(1, 1, 'Q_CH1_CORONER', 91, 'choice', 100.00, '{"prompt": "What anomaly was recorded regarding the cold storage chamber at Hawkins Morgue on Nov 7, 1983?", "options": [{"id": "A", "text": "Chamber dropped below -4C without compressor active"}, {"id": "B", "text": "Entry at 03:14 AM by unknown personnel"}]}'),
(2, 2, 'Q_CH2_RADIO', 92, 'choice', 120.00, '{"prompt": "What broadcast frequency on the Heathkit ham radio matched the Russian submarine Morse transmission?", "options": [{"id": "A", "text": "14.285 MHz on upper sideband crystal channel 4"}, {"id": "B", "text": "27.185 MHz citizen band channel 19"}]}'),
(3, 3, 'Q_CH3_LAB', 93, 'choice', 150.00, '{"prompt": "Which security clearance level was revoked from Dr. Martin Brenner after the containment breach?", "options": [{"id": "A", "text": "Clearance Level 5"}, {"id": "B", "text": "Clearance DELTA BLACK"}]}'),
(4, 4, 'Q_CH4_QUARRY', 94, 'choice', 180.00, '{"prompt": "What was the recorded depth reading when the fake decoy body was hauled from Sattler Quarry?", "options": [{"id": "A", "text": "94 feet depth"}, {"id": "B", "text": "120 feet depth"}]}'),
(5, 5, 'Q_CH5_PORTAL', 95, 'choice', 200.00, '{"prompt": "According to Mr. Clarke, how does an acrobat travel along the tightrope compared to the flea?", "options": [{"id": "A", "text": "One-dimensional tightrope forward and backward"}, {"id": "B", "text": "Curved spacetime acrobatics"}]}'),
(6, 6, 'Q_CH6_LIGHTS', 96, 'choice', 250.00, '{"prompt": "Which three letters lit up sequentially on Joyce Byers wall in the first warning message?", "options": [{"id": "A", "text": "R-U-N"}, {"id": "B", "text": "H-E-L-P"}]}'),
(7, 7, 'Q_CH7_VOID', 97, 'choice', 300.00, '{"prompt": "What concentration of commercial mineral salt was dissolved in the Middle School sensory tank?", "options": [{"id": "A", "text": "1500 lbs saline"}, {"id": "B", "text": "800 lbs saline"}]}')
ON DUPLICATE KEY UPDATE points = VALUES(points);

-- 3.7 Question Hints
INSERT INTO question_hints (hint_id, question_id, hint_order, hint_text, penalty_points, is_active)
VALUES
(1, 1, 1, 'Consult Officer Callahan forensic temperature log entry 14-B.', 20.00, 1),
(2, 2, 1, 'Upper sideband crystal channels transmit in the 20-meter amateur ham band.', 25.00, 1),
(3, 3, 1, 'The Department of Energy code word starts with DELTA.', 30.00, 1),
(4, 4, 1, 'Search Sattler Quarry bathymetric sonar reading log sheet 4.', 35.00, 1),
(5, 5, 1, 'Recall the tightrope paper sketch drawn on Mr. Clarkes blackboard.', 40.00, 1),
(6, 6, 1, 'The word consists of three urgent letters spelling an instruction to flee.', 50.00, 1),
(7, 7, 1, 'Total pounds exceeds one ton divided by 1.33.', 60.00, 1)
ON DUPLICATE KEY UPDATE penalty_points = VALUES(penalty_points);

-- 3.8 Secret Answer Keys (HMAC SHA-256 with default key: HAWKINS_SECRET_HMAC_KEY_1983)
-- Normalized answers:
-- Q1: "a" -> computed HMAC
-- Q2: "a"
-- Q3: "b"
-- Q4: "a"
-- Q5: "a"
-- Q6: "a"
-- Q7: "a"
INSERT INTO question_answer_keys (answer_key_id, question_id, accepted_answer_hmac, answer_variant_number, is_active)
VALUES
(1, 1, '44bee7a923df58eeb33d03cdd65317fbf2888351b2c223f78e066be9b57d6995', 1, 1),
(2, 2, '44bee7a923df58eeb33d03cdd65317fbf2888351b2c223f78e066be9b57d6995', 1, 1),
(3, 3, '41cc31078af5a87145fa7050585b630414780cdf7fc34f271d4cab8c3147d428', 1, 1),
(4, 4, '44bee7a923df58eeb33d03cdd65317fbf2888351b2c223f78e066be9b57d6995', 1, 1),
(5, 5, '44bee7a923df58eeb33d03cdd65317fbf2888351b2c223f78e066be9b57d6995', 1, 1),
(6, 6, '44bee7a923df58eeb33d03cdd65317fbf2888351b2c223f78e066be9b57d6995', 1, 1),
(7, 7, '44bee7a923df58eeb33d03cdd65317fbf2888351b2c223f78e066be9b57d6995', 1, 1)
ON DUPLICATE KEY UPDATE is_active = VALUES(is_active);

-- 3.9 Participant teams are registered explicitly by an administrator.
-- No demo/participant teams are seeded by the schema.

-- ==============================================================================
-- 4. CHAPTER DEFINITIONS FOR BACKWARD COMPATIBILITY
-- ==============================================================================

INSERT INTO chapters (chapter_id, sector_code, tag, title, subtitle, task_id, task_type, points) VALUES
(1, 'HAWKINS-CORONER', 'FORENSIC LOG', 'THE VANISHING OF WILL BYERS', 'Preliminary autopsy protocol analysis', 'task-ch1-coroner', 'CHOICE', 100),
(2, 'AV-CLUB-HAM-RADIO', 'SIGNAL DECRYPT', 'THE WEIRD DO REALITY', 'Russian/Upside-Down frequency calibration', 'task-ch2-radio', 'CHOICE', 120),
(3, 'HAWKINS-LAB-GATE', 'GATE METRICS', 'THE MONSTER IN THE LAB', 'Rift ionization temperature thresholds', 'task-ch3-lab', 'CHOICE', 150),
(4, 'FOREST-QUARRY', 'TRACKING MAP', 'THE BODY IN THE WATER', 'Triangulation of false dummy evidence', 'task-ch4-quarry', 'CHOICE', 180),
(5, 'UPSIDE-DOWN-GATE', 'PORTAL CORE', 'THE FLEA AND THE ACROBAT', 'Spacetime curvature gravity equations', 'task-ch5-portal', 'CHOICE', 200),
(6, 'BYERS-RESIDENCE', 'CHRISTMAS LIGHTS', 'THE MONSTER COMMUNICATES', 'Wall alphabet bulb decoding matrix', 'task-ch6-lights', 'CHOICE', 250),
(7, 'VOID-SENSORY-DEPR', 'VOID FREQUENCY', 'THE RIFT PROTOCOL', 'Hydro tank psychic signal threshold', 'task-ch7-void', 'CHOICE', 300)
ON DUPLICATE KEY UPDATE points = VALUES(points);



-- ==============================================================================
-- 3.6.1 70 TOURNAMENT QUESTIONS CATALOG (ch1-q1 .. ch7-q10)
-- ==============================================================================
INSERT INTO questions (round_id, question_code, question_order, question_type, points, prompt_content, normalization_profile, validator_type, is_active)
VALUES
(1, 'ch1-q1', 1, 'choice', 10.00, '{"prompt":"In Season 1 Episode 1, what roll did Will need on the twenty-sided die (d20) to successfully cast Fireball against the Demogorgon?","options":[{"id":"A","text":"14 or higher"},{"id":"B","text":"13 or higher"},{"id":"C","text":"15 or higher"},{"id":"D","text":"7 or higher"}],"subHeader":"QUIZ Q1 · D&D CAMPAIGN ROLL","docketTag":"D&D LOG","chapterId":1}', 'trim_lowercase', 'exact_hmac', 1),
(1, 'ch1-q2', 2, 'choice', 10.00, '{"prompt":"What is the full name of Hawkins Middle School''s science teacher who runs the A.V. Club?","options":[{"id":"A","text":"Scott A. Clarke"},{"id":"B","text":"Arthur C. Clarke"},{"id":"C","text":"Robert A. Clarke"},{"id":"D","text":"Richard M. Clarke"}],"subHeader":"QUIZ Q2 · AV CLUB FACULTY","docketTag":"FACULTY DOSSIER","chapterId":1}', 'trim_lowercase', 'exact_hmac', 1),
(1, 'ch1-q3', 3, 'choice', 10.00, '{"prompt":"How much salt did Mr. Clarke calculate was required for the improvised sensory deprivation pool in the gym?","options":[{"id":"A","text":"1,500 lb"},{"id":"B","text":"1,200 lb"},{"id":"C","text":"800 lb"},{"id":"D","text":"1,000 lb"}],"subHeader":"QUIZ Q3 · SENSORY DEPRIVATION POOL","docketTag":"PHYSICS CALC","chapterId":1}', 'trim_lowercase', 'exact_hmac', 1),
(1, 'ch1-q4', 4, 'choice', 10.00, '{"prompt":"Which iconic Clash song does Jonathan play on cassette in Will''s room to bond over music?","options":[{"id":"A","text":"\"Should I Stay or Should I Go\""},{"id":"B","text":"\"Atmosphere\""},{"id":"C","text":"\"Running Up That Hill\""},{"id":"D","text":"\"Elegia\""}],"subHeader":"QUIZ Q4 · CASSETTE MIXTAPE","docketTag":"AUDIO EVIDENCE","chapterId":1}', 'trim_lowercase', 'exact_hmac', 1),
(1, 'ch1-q5', 5, 'choice', 10.00, '{"prompt":"What is the name of the kind diner owner who discovers Eleven and offers her food after her escape?","options":[{"id":"A","text":"Gary Hammond"},{"id":"B","text":"Earl Benny"},{"id":"C","text":"Benny Hammond"},{"id":"D","text":"Benny Baker"}],"subHeader":"QUIZ Q5 · BENNY''S BURGERS","docketTag":"WITNESS LOG","chapterId":1}', 'trim_lowercase', 'exact_hmac', 1),
(1, 'ch1-q6', 6, 'choice', 10.00, '{"prompt":"What material does Chief Hopper discover stuffed inside Will''s decoy body in the Hawkins morgue?","options":[{"id":"A","text":"Dry Wood Sawdust"},{"id":"B","text":"Foam Batting and Cotton"},{"id":"C","text":"Shredded Lab Paper"},{"id":"D","text":"Polyfill Synthetic Stuffing"}],"subHeader":"QUIZ Q6 · MORGUE AUTOPSY REVELATION","docketTag":"CORONER REPORT","chapterId":1}', 'trim_lowercase', 'exact_hmac', 1),
(1, 'ch1-q7', 7, 'choice', 10.00, '{"prompt":"What Dig Dug high score does Max Mayfield achieve at the Palace Arcade under the handle ''MADMAX''?","options":[{"id":"A","text":"651,990"},{"id":"B","text":"751,300"},{"id":"C","text":"850,220"},{"id":"D","text":"900,100"}],"subHeader":"QUIZ Q7 · PALACE ARCADE RECORD","docketTag":"ARCADE TELEMETRY","chapterId":1}', 'trim_lowercase', 'exact_hmac', 1),
(1, 'ch1-q8', 8, 'choice', 10.00, '{"prompt":"What specific candy bar does Dustin feed Dart the juvenile Demodog to domesticate it?","options":[{"id":"A","text":"Three Musketeers"},{"id":"B","text":"Snickers"},{"id":"C","text":"Baby Ruth"},{"id":"D","text":"Butterfinger"}],"subHeader":"QUIZ Q8 · DEMODOG DIET","docketTag":"SPECIMEN LOG","chapterId":1}', 'trim_lowercase', 'exact_hmac', 1),
(1, 'ch1-q9', 9, 'choice', 10.00, '{"prompt":"Which programming language does Bob Newby use on Hawkins Lab''s terminals to override the security door lockouts?","options":[{"id":"A","text":"Fortran"},{"id":"B","text":"COBOL"},{"id":"C","text":"BASIC"},{"id":"D","text":"C++"}],"subHeader":"QUIZ Q9 · LAB SECURITY REBOOT","docketTag":"SYSTEM LOG","chapterId":1}', 'trim_lowercase', 'exact_hmac', 1),
(1, 'ch1-q10', 10, 'choice', 10.00, '{"prompt":"What is the name of the miniature psychokinetic inhibitor capsule surgically implanted into Henry Creel (001)?","options":[{"id":"A","text":"Project MK-Tracker"},{"id":"B","text":"Soteria"},{"id":"C","text":"Cerberus"},{"id":"D","text":"Promethium"}],"subHeader":"QUIZ Q10 · LAB INHIBITOR IMPLANT","docketTag":"LAB DOSSIER","chapterId":1}', 'trim_lowercase', 'exact_hmac', 1),
(2, 'ch2-q1', 1, 'choice', 10.00, '{"prompt":"Match each Stranger Things number in Column A to its matching converted computer value in Column B.","options":[{"id":"A","text":"1–b, 2–d, 3–c, 4–a (11 = 1011₂, 9 = 1001₂, 1983 = 7BF₁₆, 88 = 58₁₆)"},{"id":"B","text":"1–a, 2–b, 3–c, 4–d (Direct ascending map)"},{"id":"C","text":"1–c, 2–a, 3–d, 4–b (Inverted hexadecimal map)"},{"id":"D","text":"1–d, 2–b, 3–a, 4–c (Binary inverted offset)"}],"subHeader":"CONNECTION 01 · HAWKINS BY THE NUMBERS","docketTag":"NUMERIC MATRIX","chapterId":2}', 'trim_lowercase', 'exact_hmac', 1),
(2, 'ch2-q2', 2, 'choice', 10.00, '{"prompt":"Match each Hawkins operational situation to the logic gate that governs its exact behavior.","options":[{"id":"A","text":"1–AND, 2–OR, 3–NOT, 4–XOR"},{"id":"B","text":"1–NAND, 2–NOR, 3–XNOR, 4–AND"},{"id":"C","text":"1–OR, 2–AND, 3–XOR, 4–NOT"},{"id":"D","text":"1–XOR, 2–NOT, 3–AND, 4–OR"}],"subHeader":"CONNECTION 02 · GATES OF THE UPSIDE DOWN","docketTag":"BOOLEAN LOGIC","chapterId":2}', 'trim_lowercase', 'exact_hmac', 1),
(2, 'ch2-q3', 3, 'choice', 10.00, '{"prompt":"Match each town scenario to the computer science data structure it mirrors.","options":[{"id":"A","text":"1–Stack, 2–Queue, 3–Tree, 4–Graph"},{"id":"B","text":"1–Queue, 2–Stack, 3–Array, 4–Tree"},{"id":"C","text":"1–Graph, 2–Tree, 3–Stack, 4–Queue"},{"id":"D","text":"1–Array, 2–Linked List, 3–Binary Tree, 4–Heap"}],"subHeader":"CONNECTION 03 · HAWKINS DATA STRUCTURES","docketTag":"STRUCTURE MAP","chapterId":2}', 'trim_lowercase', 'exact_hmac', 1),
(2, 'ch2-q4', 4, 'choice', 10.00, '{"prompt":"Match each Hawkins threat vector to the cyber attack classification it exemplifies.","options":[{"id":"A","text":"1–Botnet, 2–DDoS Attack, 3–Trojan Horse, 4–Spyware"},{"id":"B","text":"1–Ransomware, 2–Phishing, 3–Spyware, 4–Botnet"},{"id":"C","text":"1–Trojan Horse, 2–Botnet, 3–DDoS, 4–Ransomware"},{"id":"D","text":"1–Man-in-the-Middle, 2–Zero Day, 3–Rootkit, 4–Worm"}],"subHeader":"CONNECTION 04 · MIND FLAYER VS CYBERSECURITY","docketTag":"SECURITY THREAT","chapterId":2}', 'trim_lowercase', 'exact_hmac', 1),
(2, 'ch2-q5', 5, 'choice', 10.00, '{"prompt":"Treat Hawkins history as a Git repository. Match each event to its corresponding Git operation.","options":[{"id":"A","text":"1–git branch, 2–git merge, 3–git commit, 4–git revert"},{"id":"B","text":"1–git clone, 2–git push, 3–git pull, 4–git reset"},{"id":"C","text":"1–git stash, 2–git checkout, 3–git rebase, 4–git cherry-pick"},{"id":"D","text":"1–git init, 2–git remote, 3–git fetch, 4–git diff"}],"subHeader":"CONNECTION 05 · HAWKINS VERSION CONTROL","docketTag":"GIT TOPOLOGY","chapterId":2}', 'trim_lowercase', 'exact_hmac', 1),
(2, 'ch2-q6', 6, 'choice', 10.00, '{"prompt":"Match each investigative search strategy used by Hawkins residents to its fundamental algorithm.","options":[{"id":"A","text":"1–Linear Search, 2–Binary Search, 3–Depth-First Search, 4–Breadth-First Search"},{"id":"B","text":"1–Binary Search, 2–Linear Search, 3–Breadth-First, 4–Depth-First"},{"id":"C","text":"1–Dijkstra, 2–A* Search, 3–Floyd-Warshall, 4–Bellman-Ford"},{"id":"D","text":"1–Quick Select, 2–Merge Search, 3–Jump Search, 4–Interpolation Search"}],"subHeader":"CONNECTION 06 · THE SEARCH FOR WILL","docketTag":"ALGORITHM MAP","chapterId":2}', 'trim_lowercase', 'exact_hmac', 1),
(2, 'ch2-q7', 7, 'choice', 10.00, '{"prompt":"Match each Hawkins computation or operational task to its asymptotic Big-O time complexity.","options":[{"id":"A","text":"1–O(1), 2–O(n), 3–O(n log n), 4–O(n²)"},{"id":"B","text":"1–O(n), 2–O(1), 3–O(n²), 4–O(n log n)"},{"id":"C","text":"1–O(log n), 2–O(n²), 3–O(2ⁿ), 4–O(n!)"},{"id":"D","text":"1–O(1), 2–O(log n), 3–O(n), 4–O(2ⁿ)"}],"subHeader":"CONNECTION 07 · HOW FAST IS HAWKINS? (TIME COMPLEXITY)","docketTag":"ASYMPTOTICS","chapterId":2}', 'trim_lowercase', 'exact_hmac', 1),
(2, 'ch2-q8', 8, 'choice', 10.00, '{"prompt":"Match each Hawkins scenario to the Object-Oriented Programming (OOP) pillar it demonstrates.","options":[{"id":"A","text":"1–Inheritance, 2–Polymorphism, 3–Encapsulation, 4–Abstraction"},{"id":"B","text":"1–Abstraction, 2–Encapsulation, 3–Polymorphism, 4–Inheritance"},{"id":"C","text":"1–Polymorphism, 2–Inheritance, 3–Abstraction, 4–Encapsulation"},{"id":"D","text":"1–Coupling, 2–Cohesion, 3–Overloading, 4–Aggregation"}],"subHeader":"CONNECTION 08 · CLASSES OF HAWKINS (OOP PRINCIPLES)","docketTag":"OOP MATRIX","chapterId":2}', 'trim_lowercase', 'exact_hmac', 1),
(2, 'ch2-q9', 9, 'choice', 10.00, '{"prompt":"Match each situation among the Hawkins kids to the operating system concurrency concept it exhibits.","options":[{"id":"A","text":"1–Round Robin, 2–Deadlock, 3–Mutual Exclusion (Mutex), 4–Multithreading"},{"id":"B","text":"1–Paging, 2–Semaphore, 3–Deadlock, 4–Thrashing"},{"id":"C","text":"1–Deadlock, 2–Round Robin, 3–Multithreading, 4–Mutex"},{"id":"D","text":"1–Context Switch, 2–Virtual Memory, 3–Interrupt, 4–Daemon"}],"subHeader":"CONNECTION 09 · HAWKINS OPERATING SYSTEM CONCEPTS","docketTag":"OS PRINCIPLES","chapterId":2}', 'trim_lowercase', 'exact_hmac', 1),
(2, 'ch2-q10', 10, 'choice', 10.00, '{"prompt":"Match Dustin''s expedition equipment items to their counterparts in a computer''s memory hierarchy.","options":[{"id":"A","text":"1–Register, 2–Cache, 3–RAM, 4–Hard Disk / SSD"},{"id":"B","text":"1–Cache, 2–Register, 3–Hard Disk, 4–RAM"},{"id":"C","text":"1–RAM, 2–ROM, 3–Cache, 4–Registers"},{"id":"D","text":"1–Virtual Memory, 2–Flash, 3–EEPROM, 4–Optical Disc"}],"subHeader":"CONNECTION 10 · DUSTIN''S MEMORY HIERARCHY","docketTag":"STORAGE TIERS","chapterId":2}', 'trim_lowercase', 'exact_hmac', 1),
(3, 'ch3-q1', 1, 'choice', 10.00, '{"prompt":"Hawkins Lab decoder intercept received scrambled letters for a ''step-by-step procedure for solving a computational problem''. Arrange into the correct word.","options":[{"id":"A","text":"A → L → G → O → R → I → T → H → M (ALGORITHM)"},{"id":"B","text":"L → O → Garithm → A → R (LOGARITHM)"},{"id":"C","text":"M → O → R → T → A → L → I → G → H (MORTALIGH)"},{"id":"D","text":"T → E → L → E → G → R → A → M → S (TELEGRAMS)"}],"subHeader":"REARRANGE 01 · SCRAMBLED WORD (ALGORITHM)","docketTag":"CIPHER WORD","chapterId":3}', 'trim_lowercase', 'exact_hmac', 1),
(3, 'ch3-q2', 2, 'choice', 10.00, '{"prompt":"Unscramble the letters describing the core programming technique where a function calls itself repeatedly until reaching a base condition.","options":[{"id":"A","text":"R → E → C → U → R → S → I → O → N (RECURSION)"},{"id":"B","text":"C → Uursion → R → E → S → O → N (CURSIONER)"},{"id":"C","text":"S → U → C → C → E → S → S → I → O (SUCCESSION)"},{"id":"D","text":"R → E → S → O → U → R → C → I → N (RESOURCING)"}],"subHeader":"REARRANGE 02 · SCRAMBLED WORD (RECURSION)","docketTag":"CIPHER WORD","chapterId":3}', 'trim_lowercase', 'exact_hmac', 1),
(3, 'ch3-q3', 3, 'choice', 10.00, '{"prompt":"Arrange the scrambled syntax tokens to construct a valid Python loop header that executes exactly 5 iterations.","options":[{"id":"A","text":"for → i → in → range → ( → 5 → ) → :"},{"id":"B","text":"range → ( → 5 → ) → for → i → in → :"},{"id":"C","text":"for → in → range → ( → 5 → ) → i → :"},{"id":"D","text":": → for → i → in → range → 5 → ( → )"}],"subHeader":"REARRANGE 03 · SCRAMBLED STATEMENT (PYTHON LOOP)","docketTag":"TOKEN SYNTAX","chapterId":3}', 'trim_lowercase', 'exact_hmac', 1),
(3, 'ch3-q4', 4, 'choice', 10.00, '{"prompt":"Arrange these SQL clauses in correct execution sequence to fetch names of characters with power above 5, sorted alphabetically.","options":[{"id":"A","text":"SELECT name → FROM characters → WHERE power > 5 → ORDER BY name;"},{"id":"B","text":"FROM characters → SELECT name → ORDER BY name; → WHERE power > 5"},{"id":"C","text":"WHERE power > 5 → SELECT name → FROM characters → ORDER BY name;"},{"id":"D","text":"ORDER BY name; → SELECT name → FROM characters → WHERE power > 5"}],"subHeader":"REARRANGE 04 · SCRAMBLED STATEMENT (SQL QUERY)","docketTag":"DATABASE QUERY","chapterId":3}', 'trim_lowercase', 'exact_hmac', 1),
(3, 'ch3-q5', 5, 'choice', 10.00, '{"prompt":"The lines of this recursive factorial calculation function are jumbled. Arrange them in valid working order. (What does factorial(5) return?)","options":[{"id":"A","text":"B → C → D → A (Returns 120)"},{"id":"B","text":"A → B → C → D (Returns 0)"},{"id":"C","text":"C → D → B → A (SyntaxError)"},{"id":"D","text":"B → A → C → D (Infinite Recursion)"}],"subHeader":"REARRANGE 05 · SCRAMBLED CODE (RECURSIVE FACTORIAL)","docketTag":"PYTHON CODE","chapterId":3}', 'trim_lowercase', 'exact_hmac', 1),
(3, 'ch3-q6', 6, 'choice', 10.00, '{"prompt":"Rearrange the lines to build a string-reversing function. (Calling it with ''NWOD'' reveals a crucial Upside Down clue!)","options":[{"id":"A","text":"B → D → C → E → A (reverse(''NWOD'') reveals ''DOWN'')"},{"id":"B","text":"B → C → D → E → A (UnboundLocalError)"},{"id":"C","text":"D → B → E → C → A (NameError)"},{"id":"D","text":"E → D → C → B → A (SyntaxError)"}],"subHeader":"REARRANGE 06 · SCRAMBLED CODE (STRING REVERSAL)","docketTag":"PYTHON CODE","chapterId":3}', 'trim_lowercase', 'exact_hmac', 1),
(3, 'ch3-q7', 7, 'choice', 10.00, '{"prompt":"Arrange the lines so the script calculates the sum of all even numbers from 1 to 10. What is the printed output?","options":[{"id":"A","text":"B → E → A → D → C (Output: 30)"},{"id":"B","text":"E → B → A → D → C (Output: 20)"},{"id":"C","text":"B → A → E → D → C (SyntaxError)"},{"id":"D","text":"C → B → E → A → D (Output: 0)"}],"subHeader":"REARRANGE 07 · SCRAMBLED CODE (SUM OF EVEN NUMBERS)","docketTag":"PYTHON CODE","chapterId":3}', 'trim_lowercase', 'exact_hmac', 1),
(3, 'ch3-q8', 8, 'choice', 10.00, '{"prompt":"Arrange the jumbled HTML tags to form a valid document displaying heading ''Hawkins Lab''.","options":[{"id":"A","text":"C → B → E → D → A (<html> <body> <h1>...</h1> </body> </html>)"},{"id":"B","text":"B → C → E → A → D (Mismatched tags)"},{"id":"C","text":"E → C → B → D → A (Invalid root)"},{"id":"D","text":"C → E → B → D → A (Heading outside body)"}],"subHeader":"REARRANGE 08 · SCRAMBLED CODE (HTML STRUCTURE)","docketTag":"HTML MARKUP","chapterId":3}', 'trim_lowercase', 'exact_hmac', 1),
(3, 'ch3-q9', 9, 'choice', 10.00, '{"prompt":"Put the professional Git workflow for creating a feature branch, committing fixes, and pushing in correct chronological order.","options":[{"id":"A","text":"C → E → B → D → A (Clone → Branch → Stage → Commit → Push)"},{"id":"B","text":"C → B → D → E → A (Commit on main before branch)"},{"id":"C","text":"E → C → B → D → A (Branch before clone failure)"},{"id":"D","text":"B → D → A → C → E (Push uninitialized repo)"}],"subHeader":"REARRANGE 09 · SCRAMBLED STEPS (GIT BUGFIX WORKFLOW)","docketTag":"DEV WORKFLOW","chapterId":3}', 'trim_lowercase', 'exact_hmac', 1),
(3, 'ch3-q10', 10, 'choice', 10.00, '{"prompt":"Arrange the chronological steps of a secure client-server user authentication protocol.","options":[{"id":"A","text":"B → D → C → A → E (Submit → Transmit → Verify Hash → Issue Token → Access Granted)"},{"id":"B","text":"D → B → C → A → E (Transmission before input)"},{"id":"C","text":"B → C → D → A → E (Client-side database comparison)"},{"id":"D","text":"A → B → D → C → E (Token generation before authentication)"}],"subHeader":"REARRANGE 10 · SCRAMBLED STEPS (AUTHENTICATION FLOW)","docketTag":"SECURITY PROTOCOL","chapterId":3}', 'trim_lowercase', 'exact_hmac', 1),
(4, 'ch4-q1', 1, 'choice', 10.00, '{"prompt":"Analyze the incident evidence from Hawkins Power & Light Substation 03. What type of cyber attack caused the total terminal lockout?","options":[{"id":"A","text":"Distributed Denial of Service (DDoS) Attack"},{"id":"B","text":"SQL Injection Database Exfiltration"},{"id":"C","text":"Cross-Site Scripting (XSS) Session Hijack"},{"id":"D","text":"Ransomware Cryptographic Drive Encryption"}],"subHeader":"CASE 01 · SUBSTATION SATURATION BREACH","docketTag":"INCIDENT REPORT","chapterId":4}', 'trim_lowercase', 'exact_hmac', 1),
(4, 'ch4-q2', 2, 'choice', 10.00, '{"prompt":"Review the database diagnostic dump from the Palace Arcade mainframe. What database integrity constraint was violated?","options":[{"id":"A","text":"Duplicate Key / Uniqueness Constraint Violation on PRIMARY KEY"},{"id":"B","text":"Foreign Key Referential Cascade Failure"},{"id":"C","text":"Table Schema Drop Cascade Lockout"},{"id":"D","text":"Null Pointer Dereference Exception"}],"subHeader":"CASE 02 · ARCADE LEADERBOARD CORRUPTION","docketTag":"DATABASE AUDIT","chapterId":4}', 'trim_lowercase', 'exact_hmac', 1),
(4, 'ch4-q3', 3, 'choice', 10.00, '{"prompt":"Inspect Joyce Byers'' living room light grid evidence. What message is being transmitted across the dimensional boundary?","options":[{"id":"A","text":"\"RUN\" (Warning of imminent Demogorgon wall breach)"},{"id":"B","text":"\"WAR\" (Military alert)"},{"id":"C","text":"\"HURT\" (Eleven status indicator)"},{"id":"D","text":"\"GATE\" (Sublevel 04 coordinate)"}],"subHeader":"CASE 03 · BYERS WALL CIRCUIT RECONSTRUCTION","docketTag":"SIGNAL CIPHER","chapterId":4}', 'trim_lowercase', 'exact_hmac', 1),
(4, 'ch4-q4', 4, 'choice', 10.00, '{"prompt":"Based on engineering topology documents, what critical system architecture vulnerability caused the total town blackout?","options":[{"id":"A","text":"Single Point of Failure (SPOF) Architecture"},{"id":"B","text":"Asynchronous Deadlock Livelock"},{"id":"C","text":"Unbounded Memory Thrashing"},{"id":"D","text":"Byzantine General Consensus Failure"}],"subHeader":"CASE 04 · MUNICIPAL POWER INFRASTRUCTURE COLLAPSE","docketTag":"SYSTEM ARCHITECTURE","chapterId":4}', 'trim_lowercase', 'exact_hmac', 1),
(4, 'ch4-q5', 5, 'choice', 10.00, '{"prompt":"Evaluate the Season 2 hospital telemetry logs. What physiological countermeasure severed the Mind Flayer''s shared vision?","options":[{"id":"A","text":"Blindfolding Will and closing his eyes to sever the optical reconnaissance link"},{"id":"B","text":"Administering full-spectrum sedative paralysis"},{"id":"C","text":"Broadcasting high-decibel acoustic interference"},{"id":"D","text":"Lowering room temperature to freezing levels"}],"subHeader":"CASE 05 · WILL''S TELEMETRY CONCURRENT LINK","docketTag":"MEDICAL TELEMETRY","chapterId":4}', 'trim_lowercase', 'exact_hmac', 1),
(4, 'ch4-q6', 6, 'choice', 10.00, '{"prompt":"Examine the psychological dossiers of Vecna''s victims. What acoustic mechanism allows a captive to escape Vecna''s mind lair?","options":[{"id":"A","text":"Acoustic resonance of favorite personal music via headphones anchoring reality"},{"id":"B","text":"Direct electrical shock to the cerebral cortex"},{"id":"C","text":"Administering high-potency epinephrine injections"},{"id":"D","text":"Reflecting visual laser beams into the pupils"}],"subHeader":"CASE 06 · CREEL HOUSE PSYCHIC CURSE ANCHOR","docketTag":"PSYCHIC PHENOMENON","chapterId":4}', 'trim_lowercase', 'exact_hmac', 1),
(4, 'ch4-q7', 7, 'choice', 10.00, '{"prompt":"Analyze the boolean sensor telemetry for Hawkins Lab Airlock Door 04. What is the current door status?","options":[{"id":"A","text":"Door is OPEN (The manual override evaluates the OR condition to True)"},{"id":"B","text":"Door is LOCKED (Missing physical key causes total circuit short)"},{"id":"C","text":"Door is UNPOWERED (Incompatible voltage detected)"},{"id":"D","text":"Door is DESTROYED (Thermal overload triggered)"}],"subHeader":"CASE 07 · SUBLEVEL 04 EMERGENCY AIRLOCK","docketTag":"CIRCUIT LOGIC","chapterId":4}', 'trim_lowercase', 'exact_hmac', 1),
(4, 'ch4-q8', 8, 'choice', 10.00, '{"prompt":"Investigate delivery manifest records for Starcourt Mall. What disguised mechanism facilitated Soviet subterranean expansion?","options":[{"id":"A","text":"A disguised deep-shaft hydraulic freight elevator behind mall stockrooms"},{"id":"B","text":"An abandoned coal rail tunnel connected to Cornwallis Quarry"},{"id":"C","text":"A subterranean pneumatic tube canister conduit system"},{"id":"D","text":"A fleet of covert municipal sewage vacuum tankers"}],"subHeader":"CASE 08 · STARCOURT SUBTERRANEAN LOGISTICS","docketTag":"LOGISTICS INQUIRY","chapterId":4}', 'trim_lowercase', 'exact_hmac', 1),
(4, 'ch4-q9', 9, 'choice', 10.00, '{"prompt":"Examine the geographic field records of 50 documented paranormal encounters. Which location represents the primary epicenter, and at what percentage?","options":[{"id":"A","text":"Mirkwood Forest at 40% (Primary epicenter of entity incursions)"},{"id":"B","text":"Hawkins National Laboratory at 30%"},{"id":"C","text":"Starcourt Mall at 20%"},{"id":"D","text":"Hawkins High School at 10%"}],"subHeader":"CASE 09 · ANOMALY SIGHTING DISTRIBUTION ANALYSIS","docketTag":"STATISTICAL AUDIT","chapterId":4}', 'trim_lowercase', 'exact_hmac', 1),
(4, 'ch4-q10', 10, 'choice', 10.00, '{"prompt":"Review Dr. Martin Brenner''s neurological research dossier. How did Project Nina successfully restore Eleven''s lost abilities?","options":[{"id":"A","text":"Sensory deprivation immersion paired with neuro-playback confronting repressed 1979 trauma"},{"id":"B","text":"Direct surgical implantation of an artificial psychokinetic transceiver"},{"id":"C","text":"High-voltage electroconvulsive therapy sessions"},{"id":"D","text":"Synthetic adrenal hormone infusions"}],"subHeader":"CASE 10 · PROJECT NINA SYNAPTIC RESTORATION","docketTag":"MEDICAL REPORT","chapterId":4}', 'trim_lowercase', 'exact_hmac', 1),
(5, 'ch5-q1', 1, 'choice', 10.00, '{"prompt":"What tree landmark in Mirkwood concealed an organic portal into the Upside Down discovered by Nancy Wheeler?","options":[{"id":"A","text":"Hollowed Rotting Sycamore Trunk with Dripping Slime"},{"id":"B","text":"Lightning-Struck Charred Pine Tree"},{"id":"C","text":"Ancient Oak with Carved Coordinates"},{"id":"D","text":"Overgrown Weeping Willow near Sattler Quarry"}],"subHeader":"DEMO Q1 · ITEM 01: TREE PORTAL ANOMALY","docketTag":"PORTAL COORD","chapterId":5}', 'trim_lowercase', 'exact_hmac', 1),
(5, 'ch5-q2', 2, 'choice', 10.00, '{"prompt":"What behavioral vulnerability was observed when tracking Demogorgon scent signatures through the forest?","options":[{"id":"A","text":"Highly Attracted to the Scent of Fresh Blood"},{"id":"B","text":"Triggered Exclusively by Ultrasonic Whistles"},{"id":"C","text":"Drawn Exclusively to Bright Ultraviolet Light"},{"id":"D","text":"Paralyzed by High-Frequency Radio Waves"}],"subHeader":"DEMO Q2 · ITEM 02: PREDATOR SCENT VECTOR","docketTag":"BEHAVIORAL BIO","chapterId":5}', 'trim_lowercase', 'exact_hmac', 1),
(5, 'ch5-q3', 3, 'choice', 10.00, '{"prompt":"What runic vector pattern was marked on the three perimeter surveillance trees along Trail 7?","options":[{"id":"A","text":"Vector 4 - 1 - 7 (North-East Triangulation)"},{"id":"B","text":"Vector 9 - 2 - 5 (South-West Convergence)"},{"id":"C","text":"Vector 1 - 1 - 0 (Azimuth Dead Reckoning)"},{"id":"D","text":"Vector 8 - 3 - 4 (Radial Offset Quadrant)"}],"subHeader":"DEMO Q3 · ITEM 03: RUNIC VECTOR TRIANGULATION","docketTag":"RUNIC VECTOR","chapterId":5}', 'trim_lowercase', 'exact_hmac', 1),
(5, 'ch5-q4', 4, 'choice', 10.00, '{"prompt":"What makeshift countermeasures did Nancy Wheeler and Jonathan Byers prepare at the Byers house to trap the predator?","options":[{"id":"A","text":"Bear Trap, Gasoline Fire, and Nail-Studded Bat"},{"id":"B","text":"High-Voltage Electrical Cattle Prod & Net"},{"id":"C","text":"Liquid Nitrogen Aerosers"},{"id":"D","text":"Magnesium Flares and Fireworks Battery"}],"subHeader":"DEMO Q4 · ITEM 04: TRAP COUNTERMEASURES","docketTag":"TACTICAL DEFENSE","chapterId":5}', 'trim_lowercase', 'exact_hmac', 1),
(5, 'ch5-q5', 5, 'choice', 10.00, '{"prompt":"In Mike Wheeler''s Dungeons & Dragons campaign, which two-headed monster piece was knocked over by Will''s failed fireball roll?","options":[{"id":"A","text":"The Demogorgon (Prince of Demons)"},{"id":"B","text":"The Thessalhydra with Eight Maw Heads"},{"id":"C","text":"The Beholder with Eye Rays"},{"id":"D","text":"The Mind Flayer Illithid"}],"subHeader":"DEMO Q5 · ITEM 05: D&D ANALOG BEAST","docketTag":"LORE ANALOG","chapterId":5}', 'trim_lowercase', 'exact_hmac', 1),
(5, 'ch5-q6', 6, 'choice', 10.00, '{"prompt":"What two rural roads cross at the infamous Mirkwood intersection near the lab fence line?","options":[{"id":"A","text":"Cornwallis Road & Kerley Lane"},{"id":"B","text":"Maple Street & Elm Avenue"},{"id":"C","text":"Cherry Lane & Sattler Way"},{"id":"D","text":"Lover''s Lake Road & Highway 27"}],"subHeader":"DEMO Q6 · ITEM 06: MIRKWOOD INTERSECTION ROAD SIGN","docketTag":"GEOGRAPHY","chapterId":5}', 'trim_lowercase', 'exact_hmac', 1),
(5, 'ch5-q7', 7, 'choice', 10.00, '{"prompt":"What floating phenomenon was visible in flashlight beams near the forest portal site?","options":[{"id":"A","text":"Bioluminescent Amber Spores Drifting Slowly in Mid-Air"},{"id":"B","text":"Black Ash Flakes Emitting Electrostatic Shocks"},{"id":"C","text":"Green Iridescent Insects Swarming in Circles"},{"id":"D","text":"Tiny Freezing Ice Needles Suspended Against Gravity"}],"subHeader":"DEMO Q7 · ITEM 07: FLASHLIGHT AMBER SPORE EFFECT","docketTag":"AIR MONITORING","chapterId":5}', 'trim_lowercase', 'exact_hmac', 1),
(5, 'ch5-q8', 8, 'choice', 10.00, '{"prompt":"What weapon modification did Jonathan construct on the Louisville Slugger baseball bat?","options":[{"id":"A","text":"Hammered Rows of 2-Inch Steel Carpenter Nails"},{"id":"B","text":"Wrapped Barbed Razor Wire Around the Barrel"},{"id":"C","text":"Bolted Serrated Lawnmower Blades Along the Tip"},{"id":"D","text":"Soaked Heavy Burlap in Gasoline for a Torch Bat"}],"subHeader":"DEMO Q8 · ITEM 08: STEVE''S MODIFIED WEAPON","docketTag":"IMPROVISED WEAPON","chapterId":5}', 'trim_lowercase', 'exact_hmac', 1),
(5, 'ch5-q9', 9, 'choice', 10.00, '{"prompt":"How did the boys recognize they were approaching the laboratory''s perimeter fence on Trail 7?","options":[{"id":"A","text":"All Compass Needles Began Slowly Rotating Counter-Clockwise"},{"id":"B","text":"Their Walkie-Talkies Emitted Static Morbid Whispers"},{"id":"C","text":"The Pine Trees Lost All Needles and Turned Black"},{"id":"D","text":"Ground Temperatures Dropped Below Zero Degrees"}],"subHeader":"DEMO Q9 · ITEM 09: TRAIL 7 COMPASS ROTATION","docketTag":"ANOMALOUS FLUX","chapterId":5}', 'trim_lowercase', 'exact_hmac', 1),
(5, 'ch5-q10', 10, 'choice', 10.00, '{"prompt":"What prey animal was dragged into the Sycamore tree portal right before Nancy climbed in?","options":[{"id":"A","text":"A Wounded Forest Deer Shot by Local Hunters"},{"id":"B","text":"A Stray Red Fox with a Injured Leg"},{"id":"C","text":"A Raccoon from Benny''s Dumpster"},{"id":"D","text":"A Golden Retriever Hunting Dog"}],"subHeader":"DEMO Q10 · ITEM 10: WOUNDED DEER TRACKING","docketTag":"PREDATOR TRACKS","chapterId":5}', 'trim_lowercase', 'exact_hmac', 1),
(6, 'ch6-q1', 1, 'choice', 10.00, '{"prompt":"A high-frequency radio signal pulses encrypted sequence ''UXQ''. Intelligence reports confirm a Caesar cipher with key +3. Decode the carrier message.","options":[{"id":"A","text":"\"RUN\" (Decoded: U - 3 = R, X - 3 = U, Q - 3 = N)"},{"id":"B","text":"\"WAR\" (Decoded offset +2)"},{"id":"C","text":"\"SOS\" (Decoded frequency)"},{"id":"D","text":"\"BOY\" (Decoded inverted alphabet)"}],"subHeader":"SIGNAL 01 · CAESAR CIPHER BROADCAST","docketTag":"RADIO INTERCEPT","chapterId":6}', 'trim_lowercase', 'exact_hmac', 1),
(6, 'ch6-q2', 2, 'choice', 10.00, '{"prompt":"Eleven taps a rhythmic electrical transmission into the Supercom microphone: binary code 01010010. Which ASCII character does this encode?","options":[{"id":"A","text":"''R'' (01010010₂ = 64 + 16 + 2 = 82 = ASCII ''R'')"},{"id":"B","text":"''E'' (01000101₂ = 69 = ASCII ''E'')"},{"id":"C","text":"''L'' (01001100₂ = 76 = ASCII ''L'')"},{"id":"D","text":"''Z'' (01011010₂ = 90 = ASCII ''Z'')"}],"subHeader":"SIGNAL 02 · 8-BIT BINARY TELEMETRY","docketTag":"BINARY STREAM","chapterId":6}', 'trim_lowercase', 'exact_hmac', 1),
(6, 'ch6-q3', 3, 'choice', 10.00, '{"prompt":"Dustin intercepts a looping Russian radio transmission beneath Starcourt Mall. What is the verified English translation of the cipher?","options":[{"id":"A","text":"\"The week is long. A trip to China sounds nice. If you tread lightly. The silver cat feeds when blue and yellow meet in the West.\""},{"id":"B","text":"\"The night is cold. The winter in Moscow is harsh. The iron bear roars when fire burns in the North.\""},{"id":"C","text":"\"Comrades report to the silo. Open the vault at midnight when the red star rises in the East.\""},{"id":"D","text":"\"Operation Key is underway. Evacuate all personnel before the American police arrive.\""}],"subHeader":"SIGNAL 03 · RUSSIAN ENCRYPTED BROADCAST","docketTag":"RUSSIAN CIPHER","chapterId":6}', 'trim_lowercase', 'exact_hmac', 1),
(6, 'ch6-q4', 4, 'choice', 10.00, '{"prompt":"A high-frequency buzzer emits rhythmic Morse code pulses: `... --- ...`. What universal distress priority does this broadcast?","options":[{"id":"A","text":"\"SOS\" (Universal maritime & telegraphic distress code)"},{"id":"B","text":"\"HELP\" (Emergency tactical ping)"},{"id":"C","text":"\"RUN\" (Immediate evacuation warning)"},{"id":"D","text":"\"DIE\" (Subspace anomalous whisper)"}],"subHeader":"SIGNAL 04 · MORSE CODE DISTRESS BEACON","docketTag":"MORSE LOG","chapterId":6}', 'trim_lowercase', 'exact_hmac', 1),
(6, 'ch6-q5', 5, 'choice', 10.00, '{"prompt":"Joyce Byers tunes the radio receiver to an analog static channel, capturing a reversed audio whisper. What message is Will communicating?","options":[{"id":"A","text":"\"RIGHT HERE\" (Will indicating he is in the Upside Down copy of his house)"},{"id":"B","text":"\"GET OUT\" (Warning of Demogorgon advance)"},{"id":"C","text":"\"IT''S COLD\" (Environmental description of the shadow plane)"},{"id":"D","text":"\"HELP ME\" (General distress plea)"}],"subHeader":"SIGNAL 05 · REVERSE AUDIO PHONOGRAM","docketTag":"AUDIO PHONOGRAM","chapterId":6}', 'trim_lowercase', 'exact_hmac', 1),
(6, 'ch6-q6', 6, 'choice', 10.00, '{"prompt":"Which amateur radio frequency did the boys tune their Heathkit transceiver to when communicating with Mr. Clarke?","options":[{"id":"A","text":"Heathkit 14.175 MHz (20-Meter Amateur Band)"},{"id":"B","text":"Commercial Broadcast 104.3 MHz"},{"id":"C","text":"Aviation Airband 121.5 MHz"},{"id":"D","text":"Marine VHF Channel 16 (156.8 MHz)"}],"subHeader":"SIGNAL 06 · HEATHKIT HAM RADIO TRANSCEIVER","docketTag":"HAM RADIO","chapterId":6}', 'trim_lowercase', 'exact_hmac', 1),
(6, 'ch6-q7', 7, 'choice', 10.00, '{"prompt":"What radio communication device did Dustin Henderson assemble on Weathertop to reach his girlfriend Suzie in Utah?","options":[{"id":"A","text":"Cerebro (High-powered ham radio tower named after X-Men)"},{"id":"B","text":"Supercom Walkie-Talkie Mark IV"},{"id":"C","text":"Motorola Squad Radio Transceiver"},{"id":"D","text":"Hawkins Lab Sublevel Repeater"}],"subHeader":"SIGNAL 07 · CEREBRO REPEATER TELEMETRY","docketTag":"CEREBRO LOG","chapterId":6}', 'trim_lowercase', 'exact_hmac', 1),
(6, 'ch6-q8', 8, 'choice', 10.00, '{"prompt":"Suzie transmits the mathematical constant needed as the cryptographic password for the Russian laser vault. What value does she broadcast?","options":[{"id":"A","text":"6.626070 × 10⁻³⁴ J·s"},{"id":"B","text":"6.626176 × 10⁻³⁴ J·s"},{"id":"C","text":"3.141592 × 10⁰"},{"id":"D","text":"2.997924 × 10⁸ m/s"}],"subHeader":"SIGNAL 08 · STARCOURT VAULT ACCESS CIPHER","docketTag":"VAULT CIPHER","chapterId":6}', 'trim_lowercase', 'exact_hmac', 1),
(6, 'ch6-q9', 9, 'choice', 10.00, '{"prompt":"A compass placed near the radio tower deflects erratically. What physical force causes magnetic needles to stray from true North?","options":[{"id":"A","text":"Immense artificial electromagnetic field created by the gate opening"},{"id":"B","text":"Dead batteries inside the compass housing"},{"id":"C","text":"Atmospheric solar storm in the upper ionosphere"},{"id":"D","text":"Underground iron ore deposit beneath Mirkwood"}],"subHeader":"SIGNAL 09 · ELECTROMAGNETIC VECTOR ANOMALY","docketTag":"FLUX TELEMETRY","chapterId":6}', 'trim_lowercase', 'exact_hmac', 1),
(6, 'ch6-q10', 10, 'choice', 10.00, '{"prompt":"At the end of Season 4, sub-audible seismic pulses broadcast across municipal radio channels. What catastrophic event do they announce?","options":[{"id":"A","text":"Four gates converge simultaneously, opening a massive rift across Hawkins"},{"id":"B","text":"A localized natural earthquake along the Wabash fault"},{"id":"C","text":"Starcourt Mall basement explosion"},{"id":"D","text":"Hawkins National Laboratory self-destruct countdown"}],"subHeader":"SIGNAL 10 · SUB-BASIN GATE CONVERGENCE","docketTag":"SEISMIC SIGNAL","chapterId":6}', 'trim_lowercase', 'exact_hmac', 1),
(7, 'ch7-q1', 1, 'choice', 10.00, '{"prompt":"Hawkins Lab experiment subject IDs run in sequence: 2, 6, 12, 20, 30, ... What is the next experiment ID in this progression?","options":[{"id":"A","text":"42 (30 + 12 = 42; formula 6 × 7 = 42)"},{"id":"B","text":"40 (Linear step +10)"},{"id":"C","text":"38 (Decaying rate)"},{"id":"D","text":"48 (Exponential doubling)"}],"subHeader":"LAB TASK 01 · LOGICAL SEQUENCE (EXPERIMENT IDS)","docketTag":"LAB SEQUENCE","chapterId":7}', 'trim_lowercase', 'exact_hmac', 1),
(7, 'ch7-q2', 2, 'choice', 10.00, '{"prompt":"The Sublevel 04 security gate opens if `(Power = ON AND Key = INSERTED) OR Override = ON`. Power is ON, Key is NOT inserted, Override is ON. Does the gate open?","options":[{"id":"A","text":"Yes (The expression evaluates to TRUE via the active Override switch)"},{"id":"B","text":"No (The missing key aborts the circuit)"},{"id":"C","text":"Error (Conflicting inputs short-circuit the gate)"},{"id":"D","text":"Undefined (Insufficient voltage detected)"}],"subHeader":"LAB TASK 02 · BOOLEAN LOGIC CIRCUIT EVALUATION","docketTag":"GATE LOGIC","chapterId":7}', 'trim_lowercase', 'exact_hmac', 1),
(7, 'ch7-q3', 3, 'choice', 10.00, '{"prompt":"A rogue daemon process with PID 1983 is locking the Hawkins Lab security server. Which UNIX terminal command force-terminates it immediately?","options":[{"id":"A","text":"kill -9 1983 (Sends SIGKILL signal to forcibly terminate process 1983)"},{"id":"B","text":"stop process 1983"},{"id":"C","text":"delete pid 1983"},{"id":"D","text":"systemctl freeze 1983"}],"subHeader":"LAB TASK 03 · SYSTEM OPERATIONS (KILL ROGUE PID)","docketTag":"UNIX TERMINAL","chapterId":7}', 'trim_lowercase', 'exact_hmac', 1),
(7, 'ch7-q4', 4, 'choice', 10.00, '{"prompt":"Place the Hawkins Lab power recovery protocol steps in correct operational sequence: (a) turn on lab lights, (b) start backup generator, (c) reset control panel, (d) close main breaker.","options":[{"id":"A","text":"b → d → c → a (Generator → Main Breaker → Control Panel → Lights)"},{"id":"B","text":"a → b → c → d (Lights first is impossible without power)"},{"id":"C","text":"c → a → b → d (Control panel cannot boot without generator)"},{"id":"D","text":"d → b → a → c (Breaker closed before source risks surge)"}],"subHeader":"LAB TASK 04 · SYSTEM OPERATIONS (POWER RESTORATION ORDER)","docketTag":"POWER SEQUENCE","chapterId":7}', 'trim_lowercase', 'exact_hmac', 1),
(7, 'ch7-q5', 5, 'choice', 10.00, '{"prompt":"This telemetry script gives an incorrect count for Demogorgon sightings. Diagnose the bug and select the proper repair.","options":[{"id":"A","text":"The loop starts at index 1 and skips element 0. Fix: use range(len(sightings)) or sum(sightings)"},{"id":"B","text":"The ''total'' variable should be initialized to -1"},{"id":"C","text":"The return statement must be placed inside the for loop"},{"id":"D","text":"Python requires while loops for array traversal"}],"subHeader":"LAB TASK 05 · FUNCTION RESTORATION (BUGGY SIGHTING COUNTER)","docketTag":"PYTHON DEBUG","chapterId":7}', 'trim_lowercase', 'exact_hmac', 1),
(7, 'ch7-q6', 6, 'choice', 10.00, '{"prompt":"Why does this recursive function crash the Hawkins Lab simulation console with a RecursionError?","options":[{"id":"A","text":"Missing base case! Add ''if n <= 1: return 1'' before the recursive return"},{"id":"B","text":"Python cannot perform multiplication inside a return statement"},{"id":"C","text":"The function parameter name must be uppercase"},{"id":"D","text":"The function needs an external global variable"}],"subHeader":"LAB TASK 06 · FUNCTION RESTORATION (INFINITE RECURSION)","docketTag":"RECURSION BUG","chapterId":7}', 'trim_lowercase', 'exact_hmac', 1),
(7, 'ch7-q7', 7, 'choice', 10.00, '{"prompt":"Substation bulb flickers recorded Monday to Friday: 3, 5, 4, 12, 6. Compute the Mean, Median, and identify the statistical Outlier.","options":[{"id":"A","text":"Mean = 6, Median = 5, Outlier = 12 (Thursday surge)"},{"id":"B","text":"Mean = 5, Median = 6, Outlier = 3"},{"id":"C","text":"Mean = 7.5, Median = 4, Outlier = 6"},{"id":"D","text":"Mean = 8, Median = 5.5, Outlier = 4"}],"subHeader":"LAB TASK 07 · DATA ANALYSIS (LIGHT FLICKER METRICS)","docketTag":"STATISTICS","chapterId":7}', 'trim_lowercase', 'exact_hmac', 1),
(7, 'ch7-q8', 8, 'choice', 10.00, '{"prompt":"Out of 50 total confirmed entity sightings: Forest 20, Lab 15, Mall 10, School 5. Which location has the highest concentration and what percentage?","options":[{"id":"A","text":"The Forest at 40% (20 out of 50 total events)"},{"id":"B","text":"The Lab at 35%"},{"id":"C","text":"Starcourt Mall at 25%"},{"id":"D","text":"Hawkins School at 15%"}],"subHeader":"LAB TASK 08 · DATA ANALYSIS (ZONE PERCENTAGE CONCENTRATION)","docketTag":"ZONE ANALYSIS","chapterId":7}', 'trim_lowercase', 'exact_hmac', 1),
(7, 'ch7-q9', 9, 'choice', 10.00, '{"prompt":"Experimental data records ambient temperature vs. flickers per hour: (20°C: 0), (15°C: 2), (10°C: 5), (5°C: 9). Identify the independent variable, dependent variable, and scientific conclusion.","options":[{"id":"A","text":"Independent: Temperature; Dependent: Flicker Count; Conclusion: Negative correlation (colder air increases flickers)"},{"id":"B","text":"Independent: Flicker Count; Dependent: Temperature; Conclusion: Flickering lights freeze the room"},{"id":"C","text":"Independent: Time; Dependent: Electricity; Conclusion: Random fluctuations"},{"id":"D","text":"Independent: Pressure; Dependent: Voltage; Conclusion: Direct positive correlation"}],"subHeader":"LAB TASK 09 · SIMULATED EXPERIMENT (TEMPERATURE CORRELATION)","docketTag":"EXPERIMENT LOG","chapterId":7}', 'trim_lowercase', 'exact_hmac', 1),
(7, 'ch7-q10', 10, 'choice', 10.00, '{"prompt":"Gate energy starts at 2 units at 1:00 AM and doubles every hour (2, 4, 8, 16, 32, ...). At what time does it first exceed 100 energy units?","options":[{"id":"A","text":"7:00 AM (Energy reaches 128 units, surpassing 100)"},{"id":"B","text":"6:00 AM (Energy is 64 units)"},{"id":"C","text":"8:00 AM (Energy is 256 units)"},{"id":"D","text":"5:00 AM (Energy is 32 units)"}],"subHeader":"LAB TASK 10 · SIMULATED EXPERIMENT (GATE EXPONENTIAL DOUBLING)","docketTag":"ENERGY GROWTH","chapterId":7}', 'trim_lowercase', 'exact_hmac', 1)
ON DUPLICATE KEY UPDATE points = VALUES(points), prompt_content = VALUES(prompt_content);

-- ==============================================================================
-- 3.8.1 70 TOURNAMENT QUESTION ANSWER KEYS (HMAC SHA-256)
-- ==============================================================================
INSERT INTO question_answer_keys (question_id, accepted_answer_hmac, answer_variant_number, is_active)
VALUES
((SELECT question_id FROM questions WHERE question_code = 'ch1-q1'), '41cc31078af5a87145fa7050585b630414780cdf7fc34f271d4cab8c3147d428', 1, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch1-q1'), '5b2b6f6756f9479fdaf742f4c0b628f2f52825f2186e7a994b465e216f7e1c11', 2, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch1-q2'), '44bee7a923df58eeb33d03cdd65317fbf2888351b2c223f78e066be9b57d6995', 1, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch1-q2'), 'eb90bdf3d3ea23aafe369ddea5a47d89ff89871d973997a63d782a9f4ae90321', 2, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch1-q3'), '41cc31078af5a87145fa7050585b630414780cdf7fc34f271d4cab8c3147d428', 1, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch1-q3'), '2d7fea56728370d7944d7d84b4fa3f178d6069dca621610fda6326369f075661', 2, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch1-q4'), '44bee7a923df58eeb33d03cdd65317fbf2888351b2c223f78e066be9b57d6995', 1, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch1-q4'), '9dfa1aeea6bb140a09c5301cba9be59b9fefd6620aaba4c38215730369a99413', 2, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch1-q5'), '809dc79afeb2f5b4c3dd9ecee35cdadb2faf09548df23e6560f5ab987e57d732', 1, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch1-q5'), '4bc6867cf2e9f579afb4b1136986ece9afd3bff352951c338d4972a8398da3d4', 2, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch1-q6'), 'c445a6494f63120dc7bf96caad175b62bc31f893ea016820132658aaf5157319', 1, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch1-q6'), '2b804c9238c7fffe1c017d476840735f3bc52c70b77a1366e270c36c70d7f9aa', 2, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch1-q7'), '41cc31078af5a87145fa7050585b630414780cdf7fc34f271d4cab8c3147d428', 1, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch1-q7'), 'd54cf8201cce4ebf69d38a51711c39d0715fde1704cfb36f3efc006b84531053', 2, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch1-q8'), '44bee7a923df58eeb33d03cdd65317fbf2888351b2c223f78e066be9b57d6995', 1, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch1-q8'), '957fb179f8d916b666836ff2f9d8513b54a34df238d205637090d92e0d6443f2', 2, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch1-q9'), '809dc79afeb2f5b4c3dd9ecee35cdadb2faf09548df23e6560f5ab987e57d732', 1, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch1-q9'), '96226f43540ead08926437206ad0faee352e1f201ed8c36156eddeeaca050415', 2, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch1-q10'), '41cc31078af5a87145fa7050585b630414780cdf7fc34f271d4cab8c3147d428', 1, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch1-q10'), 'c65aa30eeb8c0f556cadfb52023c2e36bd8bab5343cc0a5911c05315f51ad909', 2, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch2-q1'), '44bee7a923df58eeb33d03cdd65317fbf2888351b2c223f78e066be9b57d6995', 1, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch2-q1'), '8f3372debc87629fa345c43ada484e9163c0d212d3b21c8320352ec25148ae0e', 2, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch2-q2'), '44bee7a923df58eeb33d03cdd65317fbf2888351b2c223f78e066be9b57d6995', 1, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch2-q2'), '79549675f8541445b363dc8dd1f7aef31d0614277dac5ee6fef7852693d300d6', 2, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch2-q3'), '44bee7a923df58eeb33d03cdd65317fbf2888351b2c223f78e066be9b57d6995', 1, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch2-q3'), 'a42fa68283eab84079c7285fbd93b9d602d09b27a8cc81ee38c66acfb34dca62', 2, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch2-q4'), '44bee7a923df58eeb33d03cdd65317fbf2888351b2c223f78e066be9b57d6995', 1, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch2-q4'), '2f341d114b75ec8df1bc66d74d2bdc6ab165657fec0b57373a6427cbc729500f', 2, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch2-q5'), '44bee7a923df58eeb33d03cdd65317fbf2888351b2c223f78e066be9b57d6995', 1, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch2-q5'), 'f4f09acef90cfdb06255678320c93e61a95a24c51a030663f48b2f2a2efeeee8', 2, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch2-q6'), '44bee7a923df58eeb33d03cdd65317fbf2888351b2c223f78e066be9b57d6995', 1, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch2-q6'), '6b74a5f6c31b38e342f3c6b3db29dbfae0b5304954b85e1d4fceb32c4f34563f', 2, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch2-q7'), '44bee7a923df58eeb33d03cdd65317fbf2888351b2c223f78e066be9b57d6995', 1, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch2-q7'), 'df692dd2ff3e30ba170eef38b6d680449de700d5f233eeed937edb1a806b7ad6', 2, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch2-q8'), '44bee7a923df58eeb33d03cdd65317fbf2888351b2c223f78e066be9b57d6995', 1, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch2-q8'), '2c5a9059107bc2108a92fb7858d8f23c7883a1a341ca2d015c6c0b4f98d2ee08', 2, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch2-q9'), '44bee7a923df58eeb33d03cdd65317fbf2888351b2c223f78e066be9b57d6995', 1, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch2-q9'), '3c3b5be626f94657c04a291532c96704ae06f6218f4e50ecb40753434b50a5be', 2, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch2-q10'), '44bee7a923df58eeb33d03cdd65317fbf2888351b2c223f78e066be9b57d6995', 1, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch2-q10'), '2e114df826028bb7ad3b5162dcd3e7a40a2841e008a2d3a6f045b13f3147e2af', 2, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch3-q1'), '44bee7a923df58eeb33d03cdd65317fbf2888351b2c223f78e066be9b57d6995', 1, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch3-q1'), '6447b74286a4a91a36168c20df5e7066cceafe993a725604e7c30fc1c31361d1', 2, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch3-q2'), '44bee7a923df58eeb33d03cdd65317fbf2888351b2c223f78e066be9b57d6995', 1, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch3-q2'), 'd5aa8f2b0d1d22885d5e7385a35dd3db1a9480b9b50d5f2a75c0ffe5d534540c', 2, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch3-q3'), '44bee7a923df58eeb33d03cdd65317fbf2888351b2c223f78e066be9b57d6995', 1, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch3-q3'), 'f27b006b7880329b4532abad27edc5f09c6bdb64b153ec6bf0ec2622e0b7950d', 2, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch3-q4'), '44bee7a923df58eeb33d03cdd65317fbf2888351b2c223f78e066be9b57d6995', 1, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch3-q4'), '20d286f4e7bb360b54655d46a6e168302bd9ac4fab969b8ea8e711e996acf9ba', 2, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch3-q5'), '44bee7a923df58eeb33d03cdd65317fbf2888351b2c223f78e066be9b57d6995', 1, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch3-q5'), '3e512110e0b3ad0d9e50536efc6b5e46f5edabfb1ec52bb6421b3b4d50678e58', 2, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch3-q6'), '44bee7a923df58eeb33d03cdd65317fbf2888351b2c223f78e066be9b57d6995', 1, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch3-q6'), '0dbac4de638fe9c707a36487a2ad9a406458688fb4db825e15c8708ac26d09b3', 2, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch3-q7'), '44bee7a923df58eeb33d03cdd65317fbf2888351b2c223f78e066be9b57d6995', 1, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch3-q7'), '067e199714bb386b4fa230f2fa7d5b4745d482f92535e40b670d44e05f4838f8', 2, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch3-q8'), '44bee7a923df58eeb33d03cdd65317fbf2888351b2c223f78e066be9b57d6995', 1, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch3-q8'), '17698c1694ce43405d736bddd89e9aba352b898379c2c304a94f21c2cbf84db3', 2, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch3-q9'), '44bee7a923df58eeb33d03cdd65317fbf2888351b2c223f78e066be9b57d6995', 1, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch3-q9'), 'debd643b6547d0acb1e456280ed3e070829b473da50130dcb1bb4300bc7667f4', 2, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch3-q10'), '44bee7a923df58eeb33d03cdd65317fbf2888351b2c223f78e066be9b57d6995', 1, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch3-q10'), '47fc9d4d2b592875b7b14e662919c8b97bc756398599963df68ae40e7adde850', 2, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch4-q1'), '44bee7a923df58eeb33d03cdd65317fbf2888351b2c223f78e066be9b57d6995', 1, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch4-q1'), '23ff4d68897a2deebb953c0545053e1b408fdf4a0749f47b7f1c0e9c09f1abd7', 2, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch4-q2'), '44bee7a923df58eeb33d03cdd65317fbf2888351b2c223f78e066be9b57d6995', 1, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch4-q2'), 'ba86078968c89f8978b6e2a6eafe90544b6fa2e7ad0084b806b2c6af098ff835', 2, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch4-q3'), '44bee7a923df58eeb33d03cdd65317fbf2888351b2c223f78e066be9b57d6995', 1, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch4-q3'), '7a791ce84b36aff1284d368fad2f0d650ffde9defed8e1bb9e5d1846fb021c79', 2, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch4-q4'), '44bee7a923df58eeb33d03cdd65317fbf2888351b2c223f78e066be9b57d6995', 1, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch4-q4'), '70e7c90397e2138c0ef16293b102147701c6d4f0ab3b2174671e235abc265a24', 2, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch4-q5'), '44bee7a923df58eeb33d03cdd65317fbf2888351b2c223f78e066be9b57d6995', 1, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch4-q5'), '2cc3d992aae52f3c805db4597b396d4a8720c74606e0f84c07c33806bc048bf4', 2, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch4-q6'), '44bee7a923df58eeb33d03cdd65317fbf2888351b2c223f78e066be9b57d6995', 1, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch4-q6'), '35e1f60c4eb9985d706e6d5808aff5bd61f2c51c7e0a08719773c58de06f632e', 2, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch4-q7'), '44bee7a923df58eeb33d03cdd65317fbf2888351b2c223f78e066be9b57d6995', 1, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch4-q7'), '640c84d6152aa2a9b45c19b73b3d6e46cd9b6f307de127b295123d30db748a6a', 2, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch4-q8'), '44bee7a923df58eeb33d03cdd65317fbf2888351b2c223f78e066be9b57d6995', 1, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch4-q8'), '73aa38fbc36bdc2188d9f3d48a6bf2319bd5ec44e94c25487acf5f64eeecabad', 2, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch4-q9'), '44bee7a923df58eeb33d03cdd65317fbf2888351b2c223f78e066be9b57d6995', 1, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch4-q9'), 'c92a3b8b3bd7e812ec12be991b2bdd6b1905960dde902f4a0ff0e59efd2d435f', 2, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch4-q10'), '44bee7a923df58eeb33d03cdd65317fbf2888351b2c223f78e066be9b57d6995', 1, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch4-q10'), 'da91ba56152ff41d1725379e3d38791695f6df0d63c634fd0dd2278ac36dd476', 2, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch5-q1'), '44bee7a923df58eeb33d03cdd65317fbf2888351b2c223f78e066be9b57d6995', 1, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch5-q1'), '5473c6cf14ed0382d728dfc3ce1268057b8e70bd7df23853d6e684ef1ab77279', 2, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch5-q2'), '44bee7a923df58eeb33d03cdd65317fbf2888351b2c223f78e066be9b57d6995', 1, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch5-q2'), 'c4f2572dec219cf22ca4c3d3cfb2098fa17cb2883db4f43596be900ee9447d1a', 2, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch5-q3'), '44bee7a923df58eeb33d03cdd65317fbf2888351b2c223f78e066be9b57d6995', 1, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch5-q3'), '7cddfbeef213bb3cb03f234d965607f93b4d48feb47624ab391a93d2763e8b22', 2, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch5-q4'), '44bee7a923df58eeb33d03cdd65317fbf2888351b2c223f78e066be9b57d6995', 1, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch5-q4'), '0546e27911b61ce65fc416d7d08d1c59dbcfd486f71b6a4d51c668a177c947e2', 2, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch5-q5'), '44bee7a923df58eeb33d03cdd65317fbf2888351b2c223f78e066be9b57d6995', 1, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch5-q5'), 'e09078bedf3f3b53840ff76edbc5c34b7002eebb180ff9380049f22a7ebaa5e5', 2, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch5-q6'), '44bee7a923df58eeb33d03cdd65317fbf2888351b2c223f78e066be9b57d6995', 1, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch5-q6'), 'ac1b190535e4657dbc45b72e5bb77b234a685d10a177f57fb4b7f1d06a208c3b', 2, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch5-q7'), '44bee7a923df58eeb33d03cdd65317fbf2888351b2c223f78e066be9b57d6995', 1, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch5-q7'), 'a5d6424dcbf670684f4969284d49ab8b7199b3c3f832af8d97c22333c98b7fa7', 2, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch5-q8'), '44bee7a923df58eeb33d03cdd65317fbf2888351b2c223f78e066be9b57d6995', 1, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch5-q8'), '9bb167e5b43a26c9856cdef28b56283984139696518ac52e3a9577fccfd0b04d', 2, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch5-q9'), '44bee7a923df58eeb33d03cdd65317fbf2888351b2c223f78e066be9b57d6995', 1, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch5-q9'), '2d695d3962f643fbeb2307cf6879cc0dd2672ac2ce936b496f9f89ef617df819', 2, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch5-q10'), '44bee7a923df58eeb33d03cdd65317fbf2888351b2c223f78e066be9b57d6995', 1, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch5-q10'), '17f0e573d41b0de479f75ad52199e95eb1fc5fd89f350eb2a039e48838f3b655', 2, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch6-q1'), '44bee7a923df58eeb33d03cdd65317fbf2888351b2c223f78e066be9b57d6995', 1, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch6-q1'), '3b85c15169ed06a7c4b2d55250944efbe4a1a6074b4089b55e2c8e8772063dcf', 2, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch6-q2'), '44bee7a923df58eeb33d03cdd65317fbf2888351b2c223f78e066be9b57d6995', 1, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch6-q2'), 'aa5a945498cd21cd7e35b53c61986f82d3ed2808feb5a64a998128990baba5dd', 2, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch6-q3'), '44bee7a923df58eeb33d03cdd65317fbf2888351b2c223f78e066be9b57d6995', 1, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch6-q3'), '4851d479fb8eed01102ef4797a48f88594a3853439fbd359d2727e3f2156161d', 2, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch6-q4'), '44bee7a923df58eeb33d03cdd65317fbf2888351b2c223f78e066be9b57d6995', 1, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch6-q4'), '6d9a7bd6116ce94accd9857413a51c9c28dfde2c5c438fc0051c6c730e015f67', 2, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch6-q5'), '44bee7a923df58eeb33d03cdd65317fbf2888351b2c223f78e066be9b57d6995', 1, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch6-q5'), 'e198b20b4d84fcbfe18a5541f108c459cfc00d35eeb7317833e761eaecfb866f', 2, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch6-q6'), '44bee7a923df58eeb33d03cdd65317fbf2888351b2c223f78e066be9b57d6995', 1, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch6-q6'), 'ca7f43f5f1f5992770c30834d9c22c3345594e672fcb6844fea5cc03d14d25e8', 2, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch6-q7'), '44bee7a923df58eeb33d03cdd65317fbf2888351b2c223f78e066be9b57d6995', 1, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch6-q7'), '8b1f6a9c53eb5e7940df3a887f2fe3c79a2c409efd3ee040807bd995931e23fc', 2, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch6-q8'), '44bee7a923df58eeb33d03cdd65317fbf2888351b2c223f78e066be9b57d6995', 1, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch6-q8'), 'ba01d0c9db6541ee7dd5b58b56583819f7a684d4c29d3bf77fff662f20c4d925', 2, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch6-q9'), '44bee7a923df58eeb33d03cdd65317fbf2888351b2c223f78e066be9b57d6995', 1, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch6-q9'), 'e76c56c14150daf9dd0f9a59a80fbd775652b63f5b3ffcca6e0b09373b583da8', 2, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch6-q10'), '44bee7a923df58eeb33d03cdd65317fbf2888351b2c223f78e066be9b57d6995', 1, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch6-q10'), 'bff403c4cf47320b5e7b255c2f896d1bf34ac766ca18b76113047aa991a75fd8', 2, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch7-q1'), '44bee7a923df58eeb33d03cdd65317fbf2888351b2c223f78e066be9b57d6995', 1, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch7-q1'), '53b08abb930f5209b4098ecb5adcea8b400fc953f74c75c686da126d9bed7b0b', 2, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch7-q2'), '44bee7a923df58eeb33d03cdd65317fbf2888351b2c223f78e066be9b57d6995', 1, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch7-q2'), 'c6fcb190614e2386500cb415640ba95606517a1de3e926cd2f19d4a8916021fb', 2, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch7-q3'), '44bee7a923df58eeb33d03cdd65317fbf2888351b2c223f78e066be9b57d6995', 1, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch7-q3'), '6b2fbe2b18d02357438c46f7beb4a0838f9a778f99472fb104253fb5f6ccdfe0', 2, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch7-q4'), '44bee7a923df58eeb33d03cdd65317fbf2888351b2c223f78e066be9b57d6995', 1, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch7-q4'), '26c5b2ee3660514615cf95e4c264fa7e51956c324bb2df3f548dce8a651b6f3b', 2, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch7-q5'), '44bee7a923df58eeb33d03cdd65317fbf2888351b2c223f78e066be9b57d6995', 1, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch7-q5'), 'aa5bc4e702e14f601f8b5fa0408fecc7f17147526add10b1dedce679198a546b', 2, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch7-q6'), '44bee7a923df58eeb33d03cdd65317fbf2888351b2c223f78e066be9b57d6995', 1, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch7-q6'), 'de867d4ec6ebd3654bcb28d482b568b868c6b370d892b11115a8606f52d18af0', 2, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch7-q7'), '44bee7a923df58eeb33d03cdd65317fbf2888351b2c223f78e066be9b57d6995', 1, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch7-q7'), '7f1352c9621a709cdc8d654ced1d0a933ba86bd25fc85d2eac58c3618efa4acb', 2, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch7-q8'), '44bee7a923df58eeb33d03cdd65317fbf2888351b2c223f78e066be9b57d6995', 1, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch7-q8'), '21348d4f269cf9f84c9c92a9f8225f095fd7e2c3ecef2bc45e7c51d77a2c9400', 2, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch7-q9'), '44bee7a923df58eeb33d03cdd65317fbf2888351b2c223f78e066be9b57d6995', 1, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch7-q9'), '72743fc6d29752a6a77c20ea9d9fb20bb2a24be1e78d86a25b83ac692208ca49', 2, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch7-q10'), '44bee7a923df58eeb33d03cdd65317fbf2888351b2c223f78e066be9b57d6995', 1, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch7-q10'), '7bc89587cfbb6280c3f5917462d35c7802b0be5fc68f7867721ee2aac328ba98', 2, 1)
ON DUPLICATE KEY UPDATE is_active = VALUES(is_active);

-- ==============================================================================
-- 3.7.1 70 TOURNAMENT QUESTION HINTS
-- ==============================================================================
INSERT INTO question_hints (question_id, hint_order, hint_text, penalty_points, is_active)
VALUES
((SELECT question_id FROM questions WHERE question_code = 'ch1-q1'), 1, 'Will rolled a 7 and said, ''Did the rest of you see that? It got me.'' He needed a 13 or higher.', 5.00, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch1-q2'), 1, 'Mr. Clarke is known for his enthusiastic support and Heathkit ham radio demonstrations.', 5.00, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch1-q3'), 1, 'Dustin called Mr. Clarke late at night while he was watching ''The Thing from Another World''.', 5.00, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch1-q4'), 1, 'Will later sings this song to stay grounded while trapped in the Upside Down.', 5.00, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch1-q5'), 1, 'He owned Benny''s Burgers and gave her fresh burgers before DOE agents arrived.', 5.00, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch1-q6'), 1, 'Hopper cut open the torso seam with a pocket knife, confirming the state troopers planted a dummy.', 5.00, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch1-q7'), 1, 'Dustin was shocked to find his previous top score dethroned by MADMAX.', 5.00, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch1-q8'), 1, 'Dustin gave Dart the chocolate bar in his bedroom terrarium, calling it ''nougat''.', 5.00, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch1-q9'), 1, 'Bob founded the Hawkins Middle AV Club and remarked that he learned BASIC for computer engineering.', 5.00, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch1-q10'), 1, 'Eleven used her telekinesis to rip the Soteria chip out of Henry''s neck in 1979.', 5.00, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch2-q1'), 1, '11 in binary is 8+2+1 = 1011₂. 9 in binary is 8+1 = 1001₂. 1983 in hex is 7BF₁₆.', 5.00, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch2-q2'), 1, 'Exclusive choice is XOR; inversion is NOT; simultaneous required conditions is AND.', 5.00, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch2-q3'), 1, 'Last-in First-out is Stack; First-in First-out is Queue; Networks of arbitrary connections are Graphs.', 5.00, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch2-q4'), 1, 'A puppet army is a Botnet; resource starvation via swarms is DDoS; deceptive camouflage is a Trojan.', 5.00, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch2-q5'), 1, 'Divergent timeline is a branch; combining is merge; recording snapshot is commit; safe undo is revert.', 5.00, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch2-q6'), 1, 'Step-by-step is Linear; halving sorted items is Binary; going deep is DFS; expanding ripples is BFS.', 5.00, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch2-q7'), 1, 'Instant top-stack access is O(1); scanning list is O(n); divide-and-conquer sort is O(n log n); pairwise pairs is O(n²).', 5.00, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch2-q8'), 1, 'Extending a parent is Inheritance; one method with different forms is Polymorphism; hiding internals is Abstraction.', 5.00, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch2-q9'), 1, 'Time slice rotation is Round Robin; circular mutual blocking is Deadlock; single access lock is Mutex.', 5.00, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch2-q10'), 1, 'Fastest in-hand is Register; fast buffer is Cache; active temporary is RAM; bulk persistent is Hard Disk.', 5.00, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch3-q1'), 1, 'Unscramble TLHIGROMA: It begins with A and defines every automated program.', 5.00, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch3-q2'), 1, 'Unscramble ECROSNIRU: Like two mirrors facing each other in the Upside Down.', 5.00, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch3-q3'), 1, 'Standard Python loop syntax: ''for <variable> in range(<count>):''', 5.00, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch3-q4'), 1, 'Standard SQL clause order: SELECT ... FROM ... WHERE ... ORDER BY ...', 5.00, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch3-q5'), 1, 'Function definition first (B), then base case condition (C) and base return (D), followed by recursive step (A).', 5.00, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch3-q6'), 1, 'Initialize empty string accumulator before loop: B, then D, loop C, prepend E, return A.', 5.00, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch3-q7'), 1, 'Initialize accumulator B, iterate range E, check modulo A, accumulate D, print total C. 2+4+6+8+10 = 30.', 5.00, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch3-q8'), 1, 'Document root <html> opens first, then <body>, content inside, then </body> and </html> close.', 5.00, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch3-q9'), 1, 'First clone repo (C), make branch (E), stage modifications (B), commit message (D), push upstream (A).', 5.00, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch3-q10'), 1, 'User inputs (B), browser posts (D), backend hashes and checks (C), server issues token (A), client navigates (E).', 5.00, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch4-q1'), 1, 'Mass distributed connection flooding that exhausts service resources without attempting authentication is a classic DDoS attack.', 5.00, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch4-q2'), 1, 'A PRIMARY KEY column strictly enforces uniqueness; inserting an existing key (101) triggers a uniqueness violation.', 5.00, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch4-q3'), 1, 'Shift each letter backward by 3 in the alphabet: U->R, X->U, Q->N. The lights spell ''RUN''.', 5.00, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch4-q4'), 1, 'A system where a single component''s failure brings down the entire network suffers from a Single Point of Failure (SPOF).', 5.00, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch4-q5'), 1, 'Mike realized: ''He''s a spy! He can see where they are!'' and yelled for everyone to close Will''s eyes.', 5.00, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch4-q6'), 1, 'Favorite music acts as a lifeline, reconnecting the victim''s emotional memory to physical reality.', 5.00, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch4-q7'), 1, 'In boolean logic, (True AND False) is False, but False OR True evaluates to True. The door unlocks.', 5.00, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch4-q8'), 1, 'The Scoops Ahoy crew got trapped inside the secret freight elevator as it plummeted deep beneath the mall.', 5.00, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch4-q9'), 1, '20 out of 50 total sightings is exactly 40%, placing Mirkwood Forest as the heaviest concentration.', 5.00, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch4-q10'), 1, 'Project Nina was named after the opera: re-experiencing buried memories in the sensory tank re-ignited her neural circuits.', 5.00, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch5-q1'), 1, 'Nancy crawled through the pulsating fleshy opening inside the sycamore base.', 5.00, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch5-q2'), 1, 'A single drop of blood cuts through the dimensional barrier like a beacon.', 5.00, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch5-q3'), 1, 'Extract the glowing red pine runes left-to-right to find vector 4-1-7.', 5.00, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch5-q4'), 1, 'Steve Harrington joined with the nail-spiked Louisville Slugger bat.', 5.00, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch5-q5'), 1, 'Will rolled a 7 on his twenty-sided die, failing to cast fireball.', 5.00, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch5-q6'), 1, 'The boys nicknamed the desolate dark corner ''Mirkwood'' from Tolkien''s books.', 5.00, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch5-q7'), 1, 'Particles suspended like underwater snow drifted outward through the portal opening.', 5.00, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch5-q8'), 1, 'Steve swung the nail-studded bat in the living room to drive back the creature.', 5.00, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch5-q9'), 1, 'Dustin realized they were following a magnetic deviation towards the lab.', 5.00, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch5-q10'), 1, 'Nancy and Jonathan tracked blood droplets from a deer until it vanished inside the tree.', 5.00, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch6-q1'), 1, 'U becomes R, X becomes U, Q becomes N. The decoded signal is ''RUN''.', 5.00, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch6-q2'), 1, 'Binary 01010010 = 2^6 + 2^4 + 2^1 = 64 + 16 + 2 = 82. ASCII 82 is uppercase ''R''.', 5.00, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch6-q3'), 1, 'The message decoded by Robin, Steve, and Dustin talks about the silver cat and blue and yellow hands.', 5.00, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch6-q4'), 1, '... is S, --- is O, ... is S. It spells SOS.', 5.00, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch6-q5'), 1, 'Reversing ''EREH THGIR'' yields ''RIGHT HERE''.', 5.00, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch6-q6'), 1, 'The Heathkit SB-220 was calibrated to the 14.175 MHz ham radio band.', 5.00, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch6-q7'), 1, 'Dustin hauled Cerebro up the highest hill in Hawkins to get long-range radio line-of-sight.', 5.00, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch6-q8'), 1, 'Suzie insisted Dustin sing ''Never Ending Story'' before providing the exact Planck''s constant: 6.626070 × 10⁻³⁴.', 5.00, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch6-q9'), 1, 'Dustin explains: ''The compass doesn''t point to true North; it points to a stronger local magnetic field.''', 5.00, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch6-q10'), 1, 'Vecna''s plan was four kills to open four gates that tear open Hawkins in a cross shape.', 5.00, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch7-q1'), 1, 'The intervals between numbers increase by 2 each step (+4, +6, +8, +10, +12). 30 + 12 = 42.', 5.00, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch7-q2'), 1, '(True AND False) is False. However, False OR True evaluates to True. The gate opens.', 5.00, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch7-q3'), 1, 'In UNIX systems, ''kill -9 <PID>'' issues the non-catchable SIGKILL signal to immediately stop a rogue process.', 5.00, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch7-q4'), 1, 'Each step depends on power supplied by the step before it: Generator (b) -> Breaker (d) -> Panel (c) -> Lights (a).', 5.00, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch7-q5'), 1, 'range(1, len(sightings)) starts at index 1, completely ignoring the first sighting at index 0.', 5.00, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch7-q6'), 1, 'Without a base condition (like if n <= 1: return 1), fact(n) recurses forever until stack overflow.', 5.00, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch7-q7'), 1, 'Sum is 30 / 5 = 6 (mean). In sorted order [3, 4, 5, 6, 12], middle element is 5 (median). 12 is the outlier.', 5.00, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch7-q8'), 1, 'Forest has 20 out of 50 total sightings. (20 / 50) * 100 = 40%.', 5.00, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch7-q9'), 1, 'We control Temperature (independent variable), which alters Flicker frequency (dependent variable). As temp drops, flickers rise (negative correlation).', 5.00, 1),
((SELECT question_id FROM questions WHERE question_code = 'ch7-q10'), 1, 'Sequence: 1:00=2, 2:00=4, 3:00=8, 4:00=16, 5:00=32, 6:00=64, 7:00=128. It first exceeds 100 at 7:00 AM.', 5.00, 1)
ON DUPLICATE KEY UPDATE hint_text = VALUES(hint_text), penalty_points = VALUES(penalty_points);
