-- ==============================================================================
-- THE HAWKINS PROTOCOL - COMPLETE MOCK DATA FOR ALL 8 TABLES
-- Designed for Supabase / PostgreSQL SQL Editor
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. TABLE: chapters (All 7 Tournament Chapters)
-- ------------------------------------------------------------------------------
INSERT INTO chapters (chapter_id, sector_code, tag, title, subtitle, task_id, task_type, points, is_active)
VALUES
  (1, 'HAWKINS-CORONER', 'FORENSIC LOG', 'THE VANISHING OF WILL BYERS', 'Preliminary autopsy protocol analysis', 'task-ch1-coroner', 'CHOICE', 100, true),
  (2, 'AV-CLUB-HAM-RADIO', 'SIGNAL DECRYPT', 'THE WEIRD DO REALITY', 'Russian/Upside-Down frequency calibration', 'task-ch2-radio', 'CHOICE', 120, true),
  (3, 'HAWKINS-LAB-GATE', 'GATE METRICS', 'THE MONSTER IN THE LAB', 'Rift ionization temperature thresholds', 'task-ch3-lab', 'CHOICE', 150, true),
  (4, 'FOREST-QUARRY', 'TRACKING MAP', 'THE BODY IN THE WATER', 'Triangulation of false dummy evidence', 'task-ch4-quarry', 'CHOICE', 180, true),
  (5, 'UPSIDE-DOWN-GATE', 'PORTAL CORE', 'THE FLEA AND THE ACROBAT', 'Spacetime curvature gravity equations', 'task-ch5-portal', 'CHOICE', 200, true),
  (6, 'BYERS-RESIDENCE', 'CHRISTMAS LIGHTS', 'THE MONSTER COMMUNICATES', 'Wall alphabet bulb decoding matrix', 'task-ch6-lights', 'CHOICE', 250, true),
  (7, 'VOID-SENSORY-DEPR', 'VOID FREQUENCY', 'THE RIFT PROTOCOL', 'Hydro tank psychic signal threshold', 'task-ch7-void', 'CHOICE', 300, true)
ON CONFLICT (chapter_id) DO UPDATE SET
  sector_code = EXCLUDED.sector_code,
  tag = EXCLUDED.tag,
  title = EXCLUDED.title,
  subtitle = EXCLUDED.subtitle,
  points = EXCLUDED.points,
  is_active = EXCLUDED.is_active;

-- ------------------------------------------------------------------------------
-- 2. TABLE: chapter_questions (Secret Answer Vault & Hints)
-- ------------------------------------------------------------------------------
INSERT INTO chapter_questions (chapter_id, prompt, correct_answer, hint, max_attempts)
VALUES
  (1, 'What temperature anomaly was logged in the Hawkins General morgue refrigeration chamber on Nov 7, 1983?', 'TEMPERATURE_SUB_ZERO', 'Inspect the cold storage telemetry logs below zero degrees.', 5),
  (2, 'What was the exact transmission frequency intercepted on the Heathkit radio emitting Morse cipher sequences?', '14.285_MHZ', 'Look between standard 14MHz ham amateur bands.', 5),
  (3, 'Which security classification seal was revoked from Dr. Martin Brenner after the Sub-Level 4 breach?', 'CLEARANCE_DELTA_BLACK', 'Highest black-budget clearance identifier.', 5),
  (4, 'What was the recorded depth reading when the state police retrieved the decoy dummy from Sattler Quarry?', '94_FEET_DEPTH', 'Sonar probe depth reading measured in double digits.', 5),
  (5, 'In Mr. Clarke''s cosmological model, what extra path can the flea take along the tightrope that the acrobat cannot?', 'ONE_DIMENSION_TIGHTROPE', 'Think about walking along the underside into a second dimension.', 5),
  (6, 'Which three letters illuminated sequentially on Joyce Byers living room wall in the first psychic contact message?', 'R_U_N', 'Three-letter urgent imperative command spelled in Christmas bulbs.', 5),
  (7, 'What exact weight of mineral salt was dissolved in the Middle School gymnasium sensory deprivation tank?', '1500_LBS_SALINE', 'Fifteen hundred pounds of industrial mineral salt.', 5)
ON CONFLICT (chapter_id) DO UPDATE SET
  prompt = EXCLUDED.prompt,
  correct_answer = EXCLUDED.correct_answer,
  hint = EXCLUDED.hint,
  max_attempts = EXCLUDED.max_attempts;

-- ------------------------------------------------------------------------------
-- 3. TABLE: question_options (All 28 Multiple Choice Options A-D)
-- ------------------------------------------------------------------------------
DELETE FROM question_options WHERE chapter_id BETWEEN 1 AND 7;

INSERT INTO question_options (chapter_id, option_key, option_text, sort_order)
VALUES
  -- Chapter 1 Options
  (1, 'A', 'Ambient room temperature at 68°F (Standard morgue baseline)', 1),
  (1, 'B', 'TEMPERATURE_SUB_ZERO: Rapid refrigeration drop below freezing with frost on glass', 2),
  (1, 'C', 'Compressor thermal overload failure reaching 104°F', 3),
  (1, 'D', 'Complete power grid blackout with zero telemetry logged', 4),

  -- Chapter 2 Options
  (2, 'A', '10.500 MHz (Shortwave Commercial Maritime Band)', 1),
  (2, 'B', '12.400 MHz (Standard Civil Aviation Distress Band)', 2),
  (2, 'C', '14.285_MHZ: High-frequency carrier with rhythmic pulse repeating every 4 seconds', 3),
  (2, 'D', '27.185 MHz (Citizens Band Channel 19 Emergency)', 4),

  -- Chapter 3 Options
  (3, 'A', 'CLEARANCE_DELTA_BLACK: Compartmentalized rift research protocol', 1),
  (3, 'B', 'Level 2 Science Advisory Permit for Eastern Division', 2),
  (3, 'C', 'Department of Energy Standard Facility Escort Badge', 3),
  (3, 'D', 'Defense Nuclear Agency Class B Perimeter Pass', 4),

  -- Chapter 4 Options
  (4, 'A', '32 Feet depth (Near shore gravel slope)', 1),
  (4, 'B', '60 Feet depth (Submerged quarry ledge)', 2),
  (4, 'C', '94_FEET_DEPTH: Submerged trench beneath cold thermocline boundary', 3),
  (4, 'D', '140 Feet depth (Abyssal quarry pit floor)', 4),

  -- Chapter 5 Options
  (5, 'A', 'The acrobat can fly whereas the flea stays bound to rope', 1),
  (5, 'B', 'ONE_DIMENSION_TIGHTROPE: The acrobat moves forward/back, but the flea climbs underneath into another plane', 2),
  (5, 'C', 'Both entities are restricted to the identical 1D gravitational trajectory', 3),
  (5, 'D', 'The tightrope exists only in theoretical quantum vacuum', 4),

  -- Chapter 6 Options
  (6, 'A', 'H_E_L_P', 1),
  (6, 'B', 'R_I_G_H_T_H_E_R_E', 2),
  (6, 'C', 'R_U_N: Three warning bulbs pulsing before the wallpaper tore open', 3),
  (6, 'D', 'S_O_S', 4),

  -- Chapter 7 Options
  (7, 'A', '500 lbs common table salt (Sodium Chloride)', 1),
  (7, 'B', '800 lbs magnesium sulfate bath compound', 2),
  (7, 'C', '1200 lbs industrial epsom crystals', 3),
  (7, 'D', '1500_LBS_SALINE: Highly concentrated flotation saturation matrix', 4);

-- ------------------------------------------------------------------------------
-- 4. TABLE: chapter_lore (Dialogue Script & Narrators for Start & Solved)
-- ------------------------------------------------------------------------------
DELETE FROM chapter_lore WHERE chapter_id BETWEEN 1 AND 7;

INSERT INTO chapter_lore (chapter_id, speaker_code, speaker_name, dialogue_script, trigger_phase)
VALUES
  (1, 'hopper', 'CHIEF JIM HOPPER', 'Callahan found Will''s bike out near Mirkwood. Something took that kid, and whatever it was, it wasn''t human. Check the coroner records.', 'START'),
  (1, 'hopper', 'CHIEF JIM HOPPER', 'Good work. The temperature drop matches nothing on record. Keep digging into the Lab frequencies.', 'SOLVED'),

  (2, 'joyce', 'JOYCE BYERS', 'I heard him! Through the radio... he was breathing, singing our song! You have to listen to the frequency, please!', 'START'),
  (2, 'joyce', 'JOYCE BYERS', 'That''s it! That''s the signal! He''s alive somewhere cold and dark... don''t stop now!', 'SOLVED'),

  (3, 'brenner', 'DR. MARTIN BRENNER', 'The tear in the basement wall cannot be closed with conventional methods. We must observe. Do not tamper with the containment seal.', 'START'),
  (3, 'brenner', 'DR. MARTIN BRENNER', 'Containment breach logged. Delta Black protocol engaged. Evacuate Sub-Level 4 immediately.', 'SOLVED'),

  (4, 'hopper', 'CHIEF JIM HOPPER', 'That body pulled from Sattler Quarry wasn''t Will. It was stuffed with cotton. Somebody went to a lot of trouble to fake a funeral.', 'START'),
  (4, 'ranger', 'OFFICER CALLAHAN', 'Sonar confirms the depth. Ninety-four feet down. They dropped the fake decoy right into the deep trench.', 'SOLVED'),

  (5, 'ranger', 'OFFICER CALLAHAN', 'Clarke says gravity bends backward on the other side. Everything is cold, decaying, and covered in toxic spores.', 'START'),
  (5, 'ranger', 'OFFICER CALLAHAN', 'You understood the acrobat analogy. The tear opens downward into the shadow realm.', 'SOLVED'),

  (6, 'joyce', 'JOYCE BYERS', 'He told me to run! The wall started stretching like rubber... it came right through the floral wallpaper!', 'START'),
  (6, 'joyce', 'JOYCE BYERS', 'R-U-N... Grab the axe! It is coming through the ceiling right now!', 'SOLVED'),

  (7, 'vecna', 'VECNA (HENRY CREEL)', 'You think you can close what is already opened? Hawkins will fall. Every lock you turn only brings me closer.', 'START'),
  (7, 'hopper', 'CHIEF JIM HOPPER', 'The rift is sealed. Eleven did it. Hawkins is safe... for now. Outstanding work, teams.', 'SOLVED');

-- ------------------------------------------------------------------------------
-- 5. TABLE: teams (10 Tournament Teams with Scores & Timestamps)
-- ------------------------------------------------------------------------------
INSERT INTO teams (team_id, team_name, squad_leader, access_passcode, total_score, status, last_solved_at)
VALUES
  ('TEAM-AV-CLUB', 'Hawkins AV Club', 'Dustin Henderson', 'salt_pass_1983_dustin', 1300, 'COMPLETED', NOW() - INTERVAL '12 minutes'),
  ('TEAM-HELLFIRE', 'The Hellfire Club', 'Eddie Munson', 'salt_pass_1986_eddie', 1000, 'ACTIVE', NOW() - INTERVAL '24 minutes'),
  ('TEAM-SCOOPS', 'Scoops Troop', 'Robin Buckley', 'salt_pass_1985_robin', 750, 'ACTIVE', NOW() - INTERVAL '48 minutes'),
  ('TEAM-THE-PARTY', 'The Party (Paladins)', 'Mike Wheeler', 'salt_pass_1983_mike', 550, 'ACTIVE', NOW() - INTERVAL '1 hour 15 minutes'),
  ('TEAM-BYERS-RES', 'Byers Rescue Unit', 'Jonathan Byers', 'salt_pass_jonathan_camera', 430, 'ACTIVE', NOW() - INTERVAL '1 hour 40 minutes'),
  ('TEAM-DOE-AGENTS', 'Hawkins Lab Taskforce', 'Agent Connie Frazier', 'salt_pass_brenner_lab', 370, 'ACTIVE', NOW() - INTERVAL '2 hours 10 minutes'),
  ('TEAM-STARCOURT', 'Starcourt Underground', 'Erica Sinclair', 'salt_pass_erica_icecream', 220, 'ACTIVE', NOW() - INTERVAL '3 hours'),
  ('TEAM-SURFER-BOY', 'Surfer Boy Pizza Rollers', 'Argyle', 'salt_pass_pass_the_dutchie', 100, 'ACTIVE', NOW() - INTERVAL '4 hours 30 minutes'),
  ('TEAM-WSK-RADIO', 'WSK Radio Operators', 'Phil Callahan', 'salt_pass_callahan_wsk', 100, 'ACTIVE', NOW() - INTERVAL '5 hours 15 minutes'),
  ('TEAM-NINA-PROJECT', 'The Nina Project Cadets', 'Dr. Sam Owens', 'salt_pass_dr_owens', 0, 'ACTIVE', NULL)
ON CONFLICT (team_id) DO UPDATE SET
  team_name = EXCLUDED.team_name,
  squad_leader = EXCLUDED.squad_leader,
  total_score = EXCLUDED.total_score,
  status = EXCLUDED.status,
  last_solved_at = EXCLUDED.last_solved_at;

-- ------------------------------------------------------------------------------
-- 6. TABLE: team_members (Roster Across All Teams)
-- ------------------------------------------------------------------------------
DELETE FROM team_members;

INSERT INTO team_members (team_id, callsign, role)
VALUES
  -- Hawkins AV Club
  ('TEAM-AV-CLUB', 'Dustin Henderson', 'LEADER'),
  ('TEAM-AV-CLUB', 'Lucas Sinclair', 'CIPHER_SPECIALIST'),
  ('TEAM-AV-CLUB', 'Will Byers', 'RADAR_OPERATOR'),

  -- Hellfire Club
  ('TEAM-HELLFIRE', 'Eddie Munson', 'LEADER'),
  ('TEAM-HELLFIRE', 'Gareth', 'CRYPTANALYST'),
  ('TEAM-HELLFIRE', 'Jeff', 'AUDIO_ENGINEER'),

  -- Scoops Troop
  ('TEAM-SCOOPS', 'Robin Buckley', 'LEADER'),
  ('TEAM-SCOOPS', 'Steve Harrington', 'FIELD_DEFENDER'),
  ('TEAM-SCOOPS', 'Dustin (Liaison)', 'FREQUENCY_MONITOR'),

  -- The Party
  ('TEAM-THE-PARTY', 'Mike Wheeler', 'LEADER'),
  ('TEAM-THE-PARTY', 'Jane Hopper (Eleven)', 'PSYCHIC_BEACON'),
  ('TEAM-THE-PARTY', 'Max Mayfield', 'TACTICAL_SCOUT'),

  -- Byers Rescue Unit
  ('TEAM-BYERS-RES', 'Jonathan Byers', 'LEADER'),
  ('TEAM-BYERS-RES', 'Nancy Wheeler', 'INVESTIGATOR'),

  -- Hawkins Lab Taskforce
  ('TEAM-DOE-AGENTS', 'Agent Connie Frazier', 'LEADER'),
  ('TEAM-DOE-AGENTS', 'Technician Shepard', 'RIFT_TELEMETRY'),

  -- Starcourt Underground
  ('TEAM-STARCOURT', 'Erica Sinclair', 'LEADER'),
  ('TEAM-STARCOURT', 'Tina', 'VENT_SPECIALIST'),

  -- Surfer Boy Pizza Rollers
  ('TEAM-SURFER-BOY', 'Argyle', 'LEADER'),
  ('TEAM-SURFER-BOY', 'Eden Bingham', 'HACKER');

-- ------------------------------------------------------------------------------
-- 7. TABLE: chapter_solves (Solve History & Time Durations)
-- ------------------------------------------------------------------------------
DELETE FROM chapter_solves;

-- Team AV Club (Solved all 7 chapters -> 100+120+150+180+200+250+300 = 1300 PTS)
INSERT INTO chapter_solves (team_id, chapter_id, points_awarded, attempts_count, solved_at)
VALUES
  ('TEAM-AV-CLUB', 1, 100, 1, NOW() - INTERVAL '95 minutes'),
  ('TEAM-AV-CLUB', 2, 120, 1, NOW() - INTERVAL '78 minutes'),
  ('TEAM-AV-CLUB', 3, 150, 2, NOW() - INTERVAL '60 minutes'),
  ('TEAM-AV-CLUB', 4, 180, 1, NOW() - INTERVAL '44 minutes'),
  ('TEAM-AV-CLUB', 5, 200, 3, NOW() - INTERVAL '31 minutes'),
  ('TEAM-AV-CLUB', 6, 250, 1, NOW() - INTERVAL '20 minutes'),
  ('TEAM-AV-CLUB', 7, 300, 2, NOW() - INTERVAL '12 minutes'),

-- Team Hellfire (Solved Chapters 1 to 6 -> 1000 PTS)
  ('TEAM-HELLFIRE', 1, 100, 1, NOW() - INTERVAL '110 minutes'),
  ('TEAM-HELLFIRE', 2, 120, 2, NOW() - INTERVAL '85 minutes'),
  ('TEAM-HELLFIRE', 3, 150, 1, NOW() - INTERVAL '65 minutes'),
  ('TEAM-HELLFIRE', 4, 180, 1, NOW() - INTERVAL '49 minutes'),
  ('TEAM-HELLFIRE', 5, 200, 2, NOW() - INTERVAL '35 minutes'),
  ('TEAM-HELLFIRE', 6, 250, 1, NOW() - INTERVAL '24 minutes'),

-- Team Scoops Troop (Solved Chapters 1 to 5 -> 750 PTS)
  ('TEAM-SCOOPS', 1, 100, 1, NOW() - INTERVAL '130 minutes'),
  ('TEAM-SCOOPS', 2, 120, 1, NOW() - INTERVAL '100 minutes'),
  ('TEAM-SCOOPS', 3, 150, 1, NOW() - INTERVAL '82 minutes'),
  ('TEAM-SCOOPS', 4, 180, 2, NOW() - INTERVAL '61 minutes'),
  ('TEAM-SCOOPS', 5, 200, 1, NOW() - INTERVAL '48 minutes'),

-- Team The Party (Solved Chapters 1 to 4 -> 550 PTS)
  ('TEAM-THE-PARTY', 1, 100, 1, NOW() - INTERVAL '150 minutes'),
  ('TEAM-THE-PARTY', 2, 120, 3, NOW() - INTERVAL '120 minutes'),
  ('TEAM-THE-PARTY', 3, 150, 1, NOW() - INTERVAL '95 minutes'),
  ('TEAM-THE-PARTY', 4, 180, 2, NOW() - INTERVAL '75 minutes'),

-- Team Byers Rescue Unit (Solved Chapters 1, 2, 3 -> 370 + 60 bonus = 430 PTS)
  ('TEAM-BYERS-RES', 1, 100, 1, NOW() - INTERVAL '165 minutes'),
  ('TEAM-BYERS-RES', 2, 120, 1, NOW() - INTERVAL '135 minutes'),
  ('TEAM-BYERS-RES', 3, 150, 1, NOW() - INTERVAL '100 minutes'),

-- Team DOE Agents (Solved Chapters 1, 2, 3 -> 370 PTS)
  ('TEAM-DOE-AGENTS', 1, 100, 1, NOW() - INTERVAL '180 minutes'),
  ('TEAM-DOE-AGENTS', 2, 120, 1, NOW() - INTERVAL '150 minutes'),
  ('TEAM-DOE-AGENTS', 3, 150, 2, NOW() - INTERVAL '130 minutes'),

-- Team Starcourt (Solved Chapters 1 & 2 -> 220 PTS)
  ('TEAM-STARCOURT', 1, 100, 1, NOW() - INTERVAL '210 minutes'),
  ('TEAM-STARCOURT', 2, 120, 1, NOW() - INTERVAL '180 minutes'),

-- Team Surfer Boy (Solved Chapter 1 -> 100 PTS)
  ('TEAM-SURFER-BOY', 1, 100, 4, NOW() - INTERVAL '270 minutes'),

-- Team WSK Radio (Solved Chapter 1 -> 100 PTS)
  ('TEAM-WSK-RADIO', 1, 100, 2, NOW() - INTERVAL '315 minutes');

-- ------------------------------------------------------------------------------
-- 8. TABLE: submission_logs (Anti-Cheat & Validation Audit Log)
-- ------------------------------------------------------------------------------
DELETE FROM submission_logs;

INSERT INTO submission_logs (team_id, chapter_id, attempted_value, is_correct, ip_address, response_time_ms)
VALUES
  ('TEAM-AV-CLUB', 1, 'TEMPERATURE_SUB_ZERO', true, '192.168.1.101', 34),
  ('TEAM-AV-CLUB', 2, '14.285_MHZ', true, '192.168.1.101', 42),
  ('TEAM-AV-CLUB', 3, 'CLEARANCE_LEVEL_TWO', false, '192.168.1.101', 38),
  ('TEAM-AV-CLUB', 3, 'CLEARANCE_DELTA_BLACK', true, '192.168.1.101', 35),
  ('TEAM-AV-CLUB', 4, '94_FEET_DEPTH', true, '192.168.1.101', 49),
  ('TEAM-AV-CLUB', 5, 'BOTH_ARE_ONE_DIMENSIONAL', false, '192.168.1.101', 41),
  ('TEAM-AV-CLUB', 5, 'ONE_DIMENSION_TIGHTROPE', true, '192.168.1.101', 44),
  ('TEAM-AV-CLUB', 6, 'R_U_N', true, '192.168.1.101', 39),
  ('TEAM-AV-CLUB', 7, '1200_LBS_SALT', false, '192.168.1.101', 52),
  ('TEAM-AV-CLUB', 7, '1500_LBS_SALINE', true, '192.168.1.101', 47),

  ('TEAM-HELLFIRE', 1, 'TEMPERATURE_SUB_ZERO', true, '192.168.1.102', 36),
  ('TEAM-HELLFIRE', 2, '10.500_MHZ', false, '192.168.1.102', 40),
  ('TEAM-HELLFIRE', 2, '14.285_MHZ', true, '192.168.1.102', 38),
  ('TEAM-HELLFIRE', 6, 'R_U_N', true, '192.168.1.102', 43),

  ('TEAM-SCOOPS', 1, 'TEMPERATURE_SUB_ZERO', true, '192.168.1.103', 45),
  ('TEAM-SCOOPS', 2, '14.285_MHZ', true, '192.168.1.103', 50),
  ('TEAM-SCOOPS', 5, 'ONE_DIMENSION_TIGHTROPE', true, '192.168.1.103', 48),

  ('TEAM-SURFER-BOY', 1, 'COMPRESSOR_FIRE', false, '192.168.1.108', 76),
  ('TEAM-SURFER-BOY', 1, 'BLACKOUT_ZERO_TELEMETRY', false, '192.168.1.108', 68),
  ('TEAM-SURFER-BOY', 1, 'TEMPERATURE_SUB_ZERO', true, '192.168.1.108', 55);

COMMIT;
