# 🧠 THE HAWKINS PROTOCOL — PROJECT MEMORY & ARCHITECTURAL BLUEPRINT

> **Last Updated:** October 9, 2026  
> **Repository:** `StrangerThinks` / `hawkins-protocol`  
> **Active Git Branch:** `backend`  
> **Status:** Production-Ready Gamified CTF & Cinematic Tournament Platform  

---

## 1. Executive Summary & Core Concept

**The Hawkins Protocol** (also referred to as *StrangerThinks*) is a tournament-grade, story-driven, capture-the-flag (CTF) and puzzle-solving web application inspired by the universe of *Stranger Things*. It is engineered to deliver a retro-1980s immersive experience with zero external dependencies for media assets—all visual effects are generated via Canvas/SVG/CSS and all audio effects are live-synthesized via the browser's native **WebAudio API**.

### Key Architectural Pillars:
1. **Unified Shared Entry (`/`)**: A single, neutral 1986 terminal login screen routes players, organizers (Vecna), and operators to their designated views based on credentials without revealing system roles.
2. **Server-Isolated Security Vault**: All challenge answers, verification regexes, and parity evaluation algorithms are kept off the client bundle in an isolated backend (`backend/` Express service) and TiDB Distributed SQL database.
3. **Real-Time Dual Control**: Organizers operating the **Vecna Control Room (`/vecna`)** receive live telemetry from participant teams and can launch real-time sabotages, trigger world events, and adjust scores.
4. **Cinematic Immersion**: CRT scanlines, red lightning shaders, particle fields, typewriter dialogue cutscenes, and an interactive corkboard investigation system with 3D pushpins and red string threads.

---

## 2. Technology Stack & Dependencies

```
StrangerThinks Stack
├── Frontend Application (Next.js 14 App Router)
│   ├── Framework: Next.js 14.2.15 (React 18.3.1, TypeScript 5.5)
│   ├── Animation & Transitions: Framer Motion 11.11.0
│   ├── Styling: Pure Vanilla CSS (globals.css, 62KB design tokens & CRT shaders)
│   ├── Audio: WebAudio API Synthesizer (Zero MP3/WAV assets)
│   ├── Graphics: HTML5 Canvas + Procedural SVGs (Zero external raster images)
│   └── Realtime Transport: Socket.io (WebSocket) / HTML5 BroadcastChannel (Local Fallback)
│
├── Backend Security Service (Node.js + Express)
│   ├── Runtime: Node.js + Express 4.22 (TypeScript)
│   ├── Security: Isolated in-memory answer vault + rate limiting + JWT
│   ├── Capacity: High concurrency connection pooling (5,000 max sockets)
│   ├── Realtime Engine: Socket.io on port 5000
│   └── Port: Default http://localhost:5000
│
└── Database & Persistence Layer
    ├── Database: TiDB Cloud Serverless / TiDB Distributed SQL (MySQL 8.0 wire protocol)
    ├── Driver: mysql2/promise connection pool with TLS/SSL support
    └── Resilient Storage: In-memory ultra-fast cache + disk state snapshot fallback
```

---

## 3. High-Level Architecture Diagram

```
                               ┌─────────────────────────────────────────┐
                               │           BROWSER CLIENT                │
                               │  - Next.js 14 App Router (Port 3000)    │
                               │  - Pure WebAudio Synthesizer Engine     │
                               │  - Canvas Red Lightning & CRT Shaders   │
                               └────────────────────┬────────────────────┘
                                                    │
                 ┌──────────────────────────────────┴──────────────────────────────────┐
                 │                                                                     │
                 ▼                                                                     ▼
    ┌──────────────────────────┐                                          ┌──────────────────────────┐
    │  REALTIME SYNC LAYER     │                                          │  SECURE BACKEND SERVICE  │
    │  - Socket.io Engine      │                                          │  - Express TS (Port 5000)│
    │  - BroadcastChannel      │                                          │  - Answer Verification   │
    │  - 2s Telemetry Heartbeat│                                          │  - Brute-force Limiter   │
    └────────────┬─────────────┘                                          └────────────┬─────────────┘
                 │                                                                     │
                 ▼                                                                     ▼
    ┌────────────────────────────────────────────────────────────────────────────────────────┐
    │                        TIDB DISTRIBUTED SQL DATABASE (MYSQL 8+)                        │
    │  • teams                 • chapter_questions        • question_options                 │
    │  • chapters              • chapter_lore             • chapter_solves                   │
    │  • submission_logs       • active_sabotages         • vw_live_leaderboard              │
    └────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. User Roles & Authentication Flow

### 4.1. Unified Shared Login (`/`)
* **Interface**: 1986 CRT terminal with typewriter boot text, ambient noir glow, and 2 identical input fields:
  1. `TEAM NAME`
  2. `TEAM LEADER NAME`
* **Matching**: Case-insensitive and whitespace-trimmed.
* **Error Handling**: Shakes screen with generic `ACCESS DENIED / UNKNOWN TEAM` to avoid enumeration attacks.

### 4.2. Credential Routing Matrix
All default credentials and configurations are maintained in [`lib/config.ts`](file:///c:/Users/Sanchit/OneDrive/Desktop/StrangerThinks/lib/config.ts):

| Role | Team Name | Team Leader | Destination | Description |
|---|---|---|---|---|
| **Player T01** | `Null Pointers` | `Aarav Sharma` | `/` (Game Loop) | Player interactive story & puzzles |
| **Player T02** | `Stack Smashers` | `Maya Lin` | `/` (Game Loop) | Player interactive story & puzzles |
| **Player T03** | `Rift Runners` | `Lucas Sinclair` | `/` (Game Loop) | Player interactive story & puzzles |
| **Player T04** | `Byte Byters` | `Dustin Henderson` | `/` (Game Loop) | Player interactive story & puzzles |
| **Player T05** | `Shadow Walkers` | `Mike Wheeler` | `/` (Game Loop) | Player interactive story & puzzles |
| **Player T06** | `Hellfire Club` | `Eddie Munson` | `/` (Game Loop) | Player interactive story & puzzles |
| **Player T07** | `Hawkins AV Club` | `Will Byers` | `/` (Game Loop) | Player interactive story & puzzles |
| **Player T08** | `Mind Flayers` | `Max Mayfield` | `/` (Game Loop) | Player interactive story & puzzles |
| **Vecna Control** | `Vecna` | `Henry Creel` | `/vecna` | Gamemaster/Organizer command dashboard |
| **Chief Admin** | Passkey: `HAWKINS_CHIEF_1983` | N/A | `/admin` | Question vault & leaderboard manager |

### 4.3. Route Guards & Session Persistence
* **State Storage**: Session persisted in `localStorage` under `hawkins_session_v2`.
* **Guard Rules**:
  * Unauthenticated `/` loads the `LandingPage` login component.
  * Logged-in Players navigating to `/vecna` are bounced back to `/`.
  * Logged-in Vecna users visiting `/` are redirected to `/vecna`.
  * Visiting `/admin` requires passkey authorization (`HAWKINS_CHIEF_1983`).
  * Dedicated **LOGOUT** action on both Player HUD and Vecna Header wipes `localStorage` and resets game state.

---

## 5. Player Experience & Game Systems

### 5.1. The 8 Hawkins Story Locations
Players navigate Hawkins across 8 distinct thematic locations:
1. **Town Square (`town`)**: Municipal telemetry, initial inquiry, power surge logs.
2. **Police Station (`policeStation`)**: Chief Hopper's desk, Case 86-04 autopsy, incident report triangulation.
3. **Byers House (`byersHouse`)**: Living room wallpaper, Christmas lights alphabet wall, Will's scrambled notes.
4. **Hawkins Lab (`lab`)**: Sublevel 3 & 4 mainframe terminals, logic parity routines, gate keys.
5. **East Hill Radio Tower (`radioTower`)**: Oscilloscope radiometer, 5-pin calibration, 87.6 MHz Morse signals.
6. **The Forest (`forest`)**: Roane County Trail 7, carved pine runes, repeater beacon frequencies.
7. **The Gate (`gate`)**: Dimension tear, electromagnetic barrier bypass, key fragment synthesis.
8. **The Upside Down (`upsidedown` / `mind`)**: Final showdown, psychic severing, Vecna boss confrontation.

### 5.2. The 7 Core Task Engines
Located in `components/tasks/`:

| # | Task Engine | In-World Prop | Location | Component | Objective |
|---|---|---|---|---|---|
| 1 | **QUIZ** | Police File Case 86-04 | Police Station | [`QuizTask.tsx`](file:///c:/Users/Sanchit/OneDrive/Desktop/StrangerThinks/components/tasks/QuizTask.tsx) | Analyze forensic autopsy files & electromagnetic spike logs |
| 2 | **CONNECTION** | Christmas Lights Alphabet Wall | Byers House | [`ConnectionTask.tsx`](file:///c:/Users/Sanchit/OneDrive/Desktop/StrangerThinks/components/tasks/ConnectionTask.tsx) | Click blinking glowing bulbs to spell `"RIGHT HERE"` / `"RUN"` |
| 3 | **REARRANGE** | Will's Scrambled Anagram Notes | Byers / Upside Down | [`RearrangeTask.tsx`](file:///c:/Users/Sanchit/OneDrive/Desktop/StrangerThinks/components/tasks/RearrangeTask.tsx) | Drag and sequence letter tiles to form `"DO NOT OPEN THE GATE"` |
| 4 | **CASE STUDY** | Incident Report Corkboard | Police Station | [`CaseStudyTask.tsx`](file:///c:/Users/Sanchit/OneDrive/Desktop/StrangerThinks/components/tasks/CaseStudyTask.tsx) | Pin witness statements and triangulate RF epicenter |
| 5 | **SERIES** | Repeater Frequency Blips | Radio Tower / Forest | [`SeriesTask.tsx`](file:///c:/Users/Sanchit/OneDrive/Desktop/StrangerThinks/components/tasks/SeriesTask.tsx) | Identify radar frequency sequence patterns & coordinates |
| 6 | **RADIO** | VLF Broadcast Receiver | Town Square / Tower | [`RadioTask.tsx`](file:///c:/Users/Sanchit/OneDrive/Desktop/StrangerThinks/components/tasks/RadioTask.tsx) | Tune dial to 87.6 MHz, filter static, and translate Morse code |
| 7 | **LAB TERMINAL** | Sublevel 4 Security Console | Hawkins Lab | [`LabTerminalTask.tsx`](file:///c:/Users/Sanchit/OneDrive/Desktop/StrangerThinks/components/tasks/LabTerminalTask.tsx) | Execute JavaScript logic parity routines to clear gate locks |

### 5.3. The 5-Pin Radiometer System
Located at the **East Hill Radio Tower** ([`components/Radiometer.tsx`](file:///c:/Users/Sanchit/OneDrive/Desktop/StrangerThinks/components/Radiometer.tsx)):
* Features an animated phosphor oscilloscope canvas with tuning needle jitter and rotating dial.
* **5 Sub-Tasks / Secret Digits**:
  * **Pin 1 (Tuning Dial)**: 87.6 MHz + Morse `---..` $\rightarrow$ Digit **`8`**
  * **Pin 2 (Series Panel)**: Geometric series `[2, 4, 8, 16, ?]` $\rightarrow$ Digit **`3`**
  * **Pin 3 (Wire Patch Bay)**: Color patch bay matching $\rightarrow$ Digit **`4`**
  * **Pin 4 (Scrambled Log)**: Narrative reconstruction $\rightarrow$ Digit **`7`**
  * **Pin 5 (Debug Terminal)**: Parity accumulator calculation $\rightarrow$ Digit **`9`**
* **Master Keypad (`83479`)**: Unlocks the Sublevel 4 Hawkins Lab security door.

### 5.4. Investigation Board & PushPin Threading
Implemented in [`components/InvestigationBoard.tsx`](file:///c:/Users/Sanchit/OneDrive/Desktop/StrangerThinks/components/InvestigationBoard.tsx) and [`components/PushPin.tsx`](file:///c:/Users/Sanchit/OneDrive/Desktop/StrangerThinks/components/PushPin.tsx):
* Realistic corkboard background texture with retro case files.
* 3D glossy vector pushpins with shadows and metal pins.
* Dynamic SVG red string thread overlay connecting solved case checkpoints.

### 5.5. Special Character Powers
Players unlock powers as they progress:
* **Eleven's Force (`eleven`)**: Unlocks in Upside Down. Unveils secret brute-force clues.
* **Will's Signal (`will`)**: Unlocks in Forest. Detects hidden RF frequencies and radio blips.
* **Vision (`vision`)**: Unlocks in Lab. Highlights hidden anomaly data and hints.

---

## 6. Organizer / Vecna Control Room (`/vecna`)

Implemented in [`app/vecna/page.tsx`](file:///c:/Users/Sanchit/OneDrive/Desktop/StrangerThinks/app/vecna/page.tsx) and `components/vecna/`:
* **Tactical Telemetry Map**: Real-time radar tracking of all teams (active vs. offline status, current location, completed chapters, radiometer pins, score).
* **Live Sabotage Launcher**: Gamemaster can target individual teams or broadcast to all:
  * `GLITCH`: CRT screen distortion and visual shake.
  * `CORRUPT`: Scrambles terminal text.
  * `TIME_FREEZE`: Locks countdown timer for 30 seconds.
  * `DISTORT`: Obfuscates clue text.
  * `SIGNAL_JAM`: Disables radio audio frequencies.
  * `LOCK`: Temporarily locks chapter submission access.
* **Gamemaster Story Triggers**:
  * `Gate Opening`: Red lightning surge and dimensional rift sirens.
  * `Upside Down`: Inverts colors and initiates spore particles.
  * `Will's Signal`: Pulses Christmas lights across all connected clients.
  * `Final Showdown`: Initiates the master clock chime sequence.
* **Square Chapters Modal**: Dark-red tactical modal to review question prompts, point values, and options for all 7 chapters.
* **Story Dialog Dispatcher**: Push customized character dialogue popups (Hopper, Joyce, Brenner, Vecna) to player screens.
* **Teamwork Scoring**: Gamemaster can award custom points for collaboration.

---

## 7. Admin Control Center (`/admin`)

Implemented in [`app/admin/page.tsx`](file:///c:/Users/Sanchit/OneDrive/Desktop/StrangerThinks/app/admin/page.tsx):
* **Authentication**: Protected via passkey (`HAWKINS_CHIEF_1983`).
* **Vault Tab**:
  * Full CRUD control over Chapters, Prompts, Options, Point Values, and Completion Lore.
  * Instant sync between TiDB Distributed SQL and the Node.js backend.
  * "Reset Vault to Defaults" backup recovery button.
* **Leaderboard Tab**:
  * Live rankings, solved counts, last solve timestamps.
  * Squad registration modal: Add custom teams on the fly during live events.

---

## 8. Backend & Database Architecture

### 8.1. Express Server (`backend/src/server.ts`)
* **Port**: `5000`
* **Routes**:
  * `GET /api/health`: Mainframe health and status check.
  * `GET /api/chapters`: Returns sanitized chapters (strips `correct_answer` and `isCorrect`).
  * `POST /api/chapters/validate`: Verifies candidate chapter answers server-side.
  * `POST /api/radiometer/validate-pin`: Verifies 5-pin radiometer entries.
  * `POST /api/radiometer/validate-keypad`: Verifies master code `83479`.
  * `POST /api/admin/login`: Admin authentication.
  * `GET / PUT / DELETE / POST /api/admin/chapters`: Admin chapter CRUD.
  * `GET /api/admin/leaderboard`: Admin leaderboard dump.
* **Concurrency**: Connection pool configured for up to 5,000 concurrent sockets.

### 8.2. PostgreSQL / Supabase Schema (`backend/database/schema.sql`)
1. `chapters`: Story chapters, sector codes, tags, titles, points, task types.
2. `chapter_questions`: Prompts, secret answers, hints, attempt thresholds.
3. `question_options`: Multiple-choice keys (`A`, `B`, `C`, `D`) and text.
4. `chapter_lore`: Speaker codes (`hopper`, `joyce`, `brenner`, `vecna`), dialogue scripts.
5. `teams`: Team IDs, display names, squad leaders, passcodes, scores, status.
6. `team_members`: Roster of participants per squad.
7. `chapter_solves`: Solve logs, timestamps, points awarded, attempt counts.
8. `audit_logs`: Administrative actions and security events.

---

## 9. Scoring & Tournament Mechanics

Scoring weights adhere strictly to tournament parameters in [`lib/config.ts`](file:///c:/Users/Sanchit/OneDrive/Desktop/StrangerThinks/lib/config.ts):

$$\text{Final Score} = 0.30 \times \text{Tech} + 0.20 \times \text{Puzzle} + 0.15 \times \text{Speed} + 0.15 \times \text{Clues} + 0.10 \times \text{Story} + 0.10 \times \text{Teamwork} - \text{Penalties}$$

* **Technical & Coding (30%)**: Mainframe parity loops, logic exercises.
* **Puzzle Solving (20%)**: Radiometer pins, Morse code, alphabet wall.
* **Speed Bonus (15%)**: Time remaining on the 60-minute countdown clock.
* **Clue Discovery (15%)**: Finding hidden dossier notes and radio frequencies.
* **Story Progress (10%)**: Chapter unlocks and stage completion.
* **Teamwork (10%)**: Allocated live by organizers via `/vecna`.
* **Tie-Breaking**: Teams with equal scores are ranked by `last_solved_at` (earlier timestamp wins).

---

## 10. WebAudio API Synthesizer Reference

Implemented in [`lib/audio.ts`](file:///c:/Users/Sanchit/OneDrive/Desktop/StrangerThinks/lib/audio.ts):
* **Zero Sound Files**: Synthesizes all frequencies in real time using `AudioContext`, `OscillatorNode`, and `GainNode`.
* **Synthesized Effects**:
  * `type`: 800Hz gentle click tone (15ms).
  * `click`: 440Hz UI blip.
  * `glitch`: Multi-oscillator white noise bursts.
  * `alarm`: Dual 880Hz / 440Hz warble siren.
  * `radioStatic`: Filtered noise buffer for VLF radio dial.
  * `morseDot` / `morseDash`: Pure 700Hz sine waves.
  * `vecnaClock`: Low 65Hz bass drone with resonant chime overtones.
  * `solve`: Ascending chord sequence (C4 $\rightarrow$ E4 $\rightarrow$ G4 $\rightarrow$ C5).
  * `ambientDrone`: Layered low-frequency background oscillation.

---

## 11. Codebase Directory Walkthrough

```
StrangerThinks/
├── app/                                 # Next.js 14 App Router Pages
│   ├── admin/page.tsx                   # Chief Admin Panel (CRUD & Leaderboard)
│   ├── globals.css                      # 62KB Design System & CRT Shaders
│   ├── layout.tsx                       # Root Layout & Global Metadata
│   ├── leaderboard/page.tsx             # Public Live Tournament Leaderboard
│   ├── page.tsx                         # Unified Entry Screen & Player Game Shell
│   ├── radio/page.tsx                   # Standalone Radio Tuning Station
│   ├── radiotower/page.tsx              # Standalone 5-Pin Radiometer Page
│   ├── todos/page.tsx                   # Tournament Task Checklist
│   └── vecna/page.tsx                   # Vecna Gamemaster Control Room
│
├── backend/                             # Express + TypeScript Security Service
│   ├── database/
│   │   ├── schema.sql                   # Full PostgreSQL Database Schema
│   │   └── mock_data.sql                # Initial Seed Data for Chapters & Teams
│   ├── src/
│   │   ├── config/                      # In-Memory Secret Answers Vault
│   │   ├── controllers/                 # Chapters, Radiometer & Admin Controllers
│   │   ├── routes/                      # API Endpoints (/chapters, /radiometer, /admin)
│   │   └── server.ts                    # High-Concurrency Express Entrypoint
│   └── package.json                     # Backend Dependencies
│
├── components/                          # React Component Library
│   ├── chapters/
│   │   ├── ChapterManager.tsx           # Player Chapter Quest Overlay
│   │   └── HopperPoliceReportQuiz.tsx   # Case 86-04 Dossier Quiz Component
│   ├── scenes/                          # Location Views (Byers, Lab, Forest, Gate, etc.)
│   ├── tasks/                           # 7 Interactive Task Engine Components
│   ├── vecna/                           # Vecna Dashboard Modals, Maps & Panels
│   ├── ChallengePanel.tsx               # In-Game Puzzle Modal Wrapper
│   ├── ChapterCard.tsx                  # Chapter Milestone Notification Card
│   ├── CinematicBackground.tsx          # Canvas Particles & Parallax Noir Glow
│   ├── Crt.tsx                          # Retro CRT Scanline & Curved Glass Overlay
│   ├── Ending.tsx                       # Victory & Final Score Cutscene
│   ├── HawkinsMap.tsx                   # Interactive Map Hub with 8 Pins
│   ├── Hud.tsx                          # Floating Player Status Bar & Timer
│   ├── InvestigationBoard.tsx           # Corkboard Case File Threading Board
│   ├── LandingPage.tsx                  # 1986 Terminal Login Interface
│   ├── PushPin.tsx                      # 3D Vector Pushpin with Red String Physics
│   ├── Radiometer.tsx                   # 5-Pin Oscilloscope & Keypad Puzzle
│   ├── RedLightningCanvas.tsx           # Procedural Red Lightning WebGL/Canvas Shader
│   ├── SabotageOverlay.tsx              # Full-Screen Realtime Sabotage Effects
│   └── VecnaEntryScreen.tsx             # Cinematic Transition to /vecna
│
├── lib/                                 # Core Utilities & State Stores
│   ├── api.ts                           # Client HTTP Wrapper for Backend Service
│   ├── audio.ts                         # WebAudio API Synthesizer
│   ├── chapterQuestions.ts              # Fallback Chapter Prompts & Metadata
│   ├── characters.ts                    # Character Profiles & Dialogue Avatars
│   ├── config.ts                        # Credentials, Teams & Scoring Weights
│   ├── dialogue.ts                      # Narrative Scripts & Story Beats
│   ├── radiometer.ts                    # Radiometer Formulas & Pin Solutions
│   ├── realtime.ts                      # BroadcastChannel & Supabase Realtime Hub
│   ├── store.tsx                        # Global Game State Store (Context API)
│   ├── supabaseService.ts               # Supabase Database Client Layer
│   └── tasks.ts                         # Task Definitions & Requirements
│
├── utils/                               # Shared Server/Client Helpers
│   └── supabase/                        # SSR & Client Supabase Constructors
│
├── middleware.ts                        # Next.js Route Guard Middleware
├── next.config.js                       # Next.js Build Configuration
├── package.json                         # Frontend Dependencies
└── tsconfig.json                        # TypeScript Configuration
```

---

## 12. Quick Start & Execution Guide

### 12.1. Running Locally (Single Machine)
```bash
# 1. Install & start Frontend (Port 3000)
npm install
npm run dev

# 2. In a separate terminal, install & start Backend (Port 5000)
cd backend
npm install
npm run dev
```

* **Player Access**: [http://localhost:3000](http://localhost:3000)
* **Vecna Access**: [http://localhost:3000/vecna](http://localhost:3000/vecna) (or login with `Vecna` / `Henry Creel`)
* **Admin Access**: [http://localhost:3000/admin](http://localhost:3000/admin) (passkey `HAWKINS_CHIEF_1983`)
* **Leaderboard**: [http://localhost:3000/leaderboard](http://localhost:3000/leaderboard)
* **Dev Jump Mode**: [http://localhost:3000?dev=1](http://localhost:3000?dev=1)

### 12.2. Multi-Laptop Tournament Setup
1. Configure TiDB Cloud Serverless or local TiDB connection variables in `.env` and `.env.local` (`TIDB_HOST`, `TIDB_PORT=4000`, `TIDB_USER`, `TIDB_PASSWORD`, `TIDB_DATABASE`, `TIDB_SSL=true`).
2. Run database initialization: `cd backend && npm run db:init` (executes the 21-table canonical schema from `database/tidb_schema.sql`).
3. Deploy the Express backend (`backend/`) with persistent WebSocket support on port 5000.
4. Set `NEXT_PUBLIC_API_URL=http://<SERVER_IP>:5000/api` in `.env.local`.

---

## 13. Recent Changelog & Current State

* **Active Branch**: `backend`
* **TiDB & Socket.IO Specification Implementation (`STRANGER_THINGS_TIDB_SOCKETIO_BACKEND_SPEC.md`)**:
  * **21-Table TiDB Schema**: Designed and applied MySQL 8.0 / TiDB Serverless compatible DDL (`events`, `teams`, `admin_users`, `rounds`, `questions`, `question_answer_keys`, `question_hints`, `team_active_sessions`, `team_session_audit`, `team_round_progress`, `team_progress`, `question_submissions`, `team_hint_usages`, `score_ledger`, `vecna_senders`, `vecna_sender_sessions`, `vecna_message_templates`, `vecna_messages`, `vecna_message_targets`, `team_vecna_deliveries`, `realtime_outbox`, `admin_audit_log`).
  * **Single Active Session Rule**: Enforced 1 active session per team via database primary key (`team_active_sessions`). A second login attempt is rejected (`ALREADY_LOGGED_IN`), with admin force-logout support (`POST /api/admin/teams/:teamId/force-logout`).
  * **Server-Side HMAC Answer Validation**: Implemented normalization (`trim().toLowerCase()`) and HMAC-SHA256 comparison using `ANSWER_HMAC_SECRET`. Wrong answers earn 0 marks and lock the question permanently with no answer points awarded.
  * **Immutable Scoring & Hint Ledger**: Point awards and hint deductions are recorded as immutable delta entries in `score_ledger`, guaranteeing historical score integrity.
  * **Vecna Approval Pipeline**: Vecna teams have separate accounts (`vecna_senders`); messages are manual only, limited strictly to <=150 characters, and queued in `pending_approval`. No delivery to Hawkins teams or socket emission occurs until an administrator explicitly approves the message.
  * **Verification**: In-process integration test suite passed 25/25 specification tests with 100% success; frontend and backend TypeScript builds passed with 0 errors.
