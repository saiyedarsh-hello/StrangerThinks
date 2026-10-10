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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS question_options (
  option_id INT AUTO_INCREMENT PRIMARY KEY,
  chapter_id INT NOT NULL,
  option_key VARCHAR(8) NOT NULL,
  option_text TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 1,
  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT uq_chapter_option UNIQUE (chapter_id, option_key),
  CONSTRAINT fk_qo_chapter FOREIGN KEY (chapter_id) REFERENCES chapters(chapter_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
(1, 1, 'Q_CH1_CORONER', 1, 'choice', 100.00, '{"prompt": "What anomaly was recorded regarding the cold storage chamber at Hawkins Morgue on Nov 7, 1983?", "options": [{"id": "A", "text": "Chamber dropped below -4C without compressor active"}, {"id": "B", "text": "Entry at 03:14 AM by unknown personnel"}]}'),
(2, 2, 'Q_CH2_RADIO', 1, 'choice', 120.00, '{"prompt": "What broadcast frequency on the Heathkit ham radio matched the Russian submarine Morse transmission?", "options": [{"id": "A", "text": "14.285 MHz on upper sideband crystal channel 4"}, {"id": "B", "text": "27.185 MHz citizen band channel 19"}]}'),
(3, 3, 'Q_CH3_LAB', 1, 'choice', 150.00, '{"prompt": "Which security clearance level was revoked from Dr. Martin Brenner after the containment breach?", "options": [{"id": "A", "text": "Clearance Level 5"}, {"id": "B", "text": "Clearance DELTA BLACK"}]}'),
(4, 4, 'Q_CH4_QUARRY', 1, 'choice', 180.00, '{"prompt": "What was the recorded depth reading when the fake decoy body was hauled from Sattler Quarry?", "options": [{"id": "A", "text": "94 feet depth"}, {"id": "B", "text": "120 feet depth"}]}'),
(5, 5, 'Q_CH5_PORTAL', 1, 'choice', 200.00, '{"prompt": "According to Mr. Clarke, how does an acrobat travel along the tightrope compared to the flea?", "options": [{"id": "A", "text": "One-dimensional tightrope forward and backward"}, {"id": "B", "text": "Curved spacetime acrobatics"}]}'),
(6, 6, 'Q_CH6_LIGHTS', 1, 'choice', 250.00, '{"prompt": "Which three letters lit up sequentially on Joyce Byers wall in the first warning message?", "options": [{"id": "A", "text": "R-U-N"}, {"id": "B", "text": "H-E-L-P"}]}'),
(7, 7, 'Q_CH7_VOID', 1, 'choice', 300.00, '{"prompt": "What concentration of commercial mineral salt was dissolved in the Middle School sensory tank?", "options": [{"id": "A", "text": "1500 lbs saline"}, {"id": "B", "text": "800 lbs saline"}]}')
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
(1, 1, '3b7ce2b836d5fe0a623a6774e50eb19ad9aa1ff1b5d1b79040c5f2b801a2d164', 1, 1),
(2, 2, '3b7ce2b836d5fe0a623a6774e50eb19ad9aa1ff1b5d1b79040c5f2b801a2d164', 1, 1),
(3, 3, '5e1f0e4284d7237cecf027fa1e57c8d9df73ec41e2a5f7e6f6a735071de6eb06', 1, 1),
(4, 4, '3b7ce2b836d5fe0a623a6774e50eb19ad9aa1ff1b5d1b79040c5f2b801a2d164', 1, 1),
(5, 5, '3b7ce2b836d5fe0a623a6774e50eb19ad9aa1ff1b5d1b79040c5f2b801a2d164', 1, 1),
(6, 6, '3b7ce2b836d5fe0a623a6774e50eb19ad9aa1ff1b5d1b79040c5f2b801a2d164', 1, 1),
(7, 7, '3b7ce2b836d5fe0a623a6774e50eb19ad9aa1ff1b5d1b79040c5f2b801a2d164', 1, 1)
ON DUPLICATE KEY UPDATE is_active = VALUES(is_active);

-- 3.9 Hawkins Teams
INSERT INTO teams (team_id, event_id, team_code, team_name, squad_leader, username, username_normalized, role, total_score, status)
VALUES
('T01', 1, 'TEAM_01', 'Null Pointers', 'Aarav Sharma', 'nullpointers', 'nullpointers', 'PLAYER', 0, 'ACTIVE'),
('T02', 1, 'TEAM_02', 'Stack Smashers', 'Maya Lin', 'stacksmashers', 'stacksmashers', 'PLAYER', 0, 'ACTIVE'),
('T03', 1, 'TEAM_03', 'Rift Runners', 'Lucas Sinclair', 'riftrunners', 'riftrunners', 'PLAYER', 0, 'ACTIVE'),
('T04', 1, 'TEAM_04', 'Byte Byters', 'Dustin Henderson', 'bytebyters', 'bytebyters', 'PLAYER', 0, 'ACTIVE'),
('T05', 1, 'TEAM_05', 'Shadow Walkers', 'Mike Wheeler', 'shadowwalkers', 'shadowwalkers', 'PLAYER', 0, 'ACTIVE'),
('T06', 1, 'TEAM_06', 'Hellfire Club', 'Eddie Munson', 'hellfireclub', 'hellfireclub', 'PLAYER', 0, 'ACTIVE'),
('T07', 1, 'TEAM_07', 'Hawkins AV Club', 'Will Byers', 'hawkinsavclub', 'hawkinsavclub', 'PLAYER', 0, 'ACTIVE'),
('T08', 1, 'TEAM_08', 'Mind Flayers', 'Max Mayfield', 'mindflayers', 'mindflayers', 'PLAYER', 0, 'ACTIVE')
ON DUPLICATE KEY UPDATE
  team_name = VALUES(team_name),
  squad_leader = VALUES(squad_leader);

-- 3.10 Initialize Round 1 Unlocked for all teams
INSERT INTO team_round_progress (team_id, round_id, status, unlocked_at)
SELECT t.team_id, 1, 'unlocked', CURRENT_TIMESTAMP(3)
FROM teams t
ON DUPLICATE KEY UPDATE status = VALUES(status);

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
