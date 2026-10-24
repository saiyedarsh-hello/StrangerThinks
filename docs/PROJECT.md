# Project: Hawkins Protocol Tournament System Fixes

## Architecture
The Hawkins Protocol is a high-concurrency real-time CTF/tournament platform consisting of:
1. **Next.js 14 Frontend** (`app/`, `components/`, `lib/`): Competitor Player HUD, Vecna Terminal, Admin Dashboard, and Public Leaderboard. Interacts via REST API calls and real-time Socket.IO subscriptions.
2. **Node.js/Express Backend** (`backend/src/`): REST API handling authentication, event lifecycle, chapter/task progress, question validation, and admin actions.
3. **Socket.IO Real-Time Service** (`backend/src/services/socket.service.ts`): Manages authenticated WebSocket connections, segmented presence rooms (`admins`, `role:vecna`, `team:${teamId}`), state broadcasts (`event:state_changed`, `presence:update`, `score:update`, `leaderboard:update`).
4. **TiDB Cloud Database** (`backend/src/config/tidb.ts`, `backend/database/`): MySQL-compatible distributed SQL database storing users, squads, sessions, event metadata, question catalog, answer HMAC keys, submissions, and immutable ledger entries (`score_ledger`).

```
                    ┌──────────────────────────────┐
                    │     Next.js Frontend         │
                    │  (Player, Vecna, Admin, LB)  │
                    └──────────────┬───────────────┘
                                   │
              HTTP / Next API      │       WebSocket / Socket.IO
              Proxy & Direct REST  │       Real-Time Events
                                   ▼
                    ┌──────────────────────────────┐
                    │   Node.js / Express Backend  │
                    │   (Auth, Questions, Events)  │
                    └──────────────┬───────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────┐
                    │      TiDB Distributed DB     │
                    │ (questions, keys, ledger...) │
                    └──────────────────────────────┘
```

## Code Layout
- `backend/src/config/tidb.ts`: TiDB MySQL pool configuration, pool error handlers, retry logic.
- `backend/src/controllers/auth.controller.ts`: Authentication, session verification (`getMe`), login.
- `backend/src/controllers/specGame.controller.ts`: Submission endpoint (`POST /api/questions/:questionCode/submit`).
- `backend/src/controllers/admin.controller.ts`: Admin controls (event actions, role toggle, reset scores, force logout).
- `backend/src/services/question.service.ts`: Backend-authoritative question evaluation, score calculation (+10/0), atomic transactions (`score_ledger`, `question_submissions`), dual-store memory sync.
- `backend/src/services/answerValidation.service.ts`: HMAC-SHA256 calculation and timing-safe comparison.
- `backend/src/services/session.service.ts`: Active session tracking, TiDB session persistence, single-session enforcement.
- `backend/src/services/socket.service.ts`: Real-time presence, room routing, broadcast emissions.
- `backend/database/tidb_schema.sql` & seeds: Table definitions and catalog seeding.
- `app/api/admin/login/route.ts`: Admin authentication proxy (passkey clearance).
- `app/api/admin/event/state/route.ts`: Admin event state proxy.
- `app/admin/page.tsx`: Admin dashboard UI, real-time presence indicators, action buttons.
- `components/Leaderboard.tsx`: Public leaderboard rendering.
- `components/chapters/`: Chapter quiz runners (`HopperPoliceReportQuiz.tsx`, `ChapterManager.tsx`, `QuestionTypeRenderer.tsx`).
- `components/tasks/`: Interactive tasks (`TaskEngine.tsx`, `QuizTask.tsx`, `RearrangeTask.tsx`, etc.).
- `lib/chapterQuestions.ts`, `lib/tasks.ts`, `lib/stages.ts`, `lib/radiometer.ts`: Question and task definitions.
- `lib/store.tsx`: Client-side game store and state sync.
- `lib/tidbService.ts`: Client socket listeners and presence subscriptions.

---

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| F1 | TiDB 70-Question Catalog & HMAC Key Seeding | Seed all 70 tournament questions (`ch1-q1`..`ch7-q10`) with HMAC-SHA256 answer hashes into `questions` and `question_answer_keys`. | M1 | Survey R1 |
| F2 | Backend Authoritative Question Evaluation Endpoint | Route all question submissions through `POST /api/questions/:questionCode/submit`, enforcing exact +10 PTS for correct and 0 PTS + permanent question lock for wrong answers. | M1 | Survey R1 |
| F3 | Atomic Persistence to Ledger & Submissions | Write every verified submission atomically to `score_ledger` and `question_submissions` with transaction rollback safety. | M1 | Survey R1 |
| F4 | Dual-Store (TiDB + Memory) Synchronization | Ensure `QuestionService` and `AdminController` synchronize `db.teams` in memory alongside TiDB so `db.getLeaderboard()` always matches database state. | M1 | Survey R3 |
| F5 | Client Data Sanitization (Zero Leakage) | Remove all embedded `correctAnswerId`, `correctOrder`, `textAnswer`, and `answer: RegExp` definitions from client bundle files (`lib/chapterQuestions.ts`, `lib/tasks.ts`, `lib/stages.ts`, `lib/radiometer.ts`). | M2 | Survey R1 |
| F6 | Elimination of Client-Side Evaluation Shortcuts | Eliminate all local answer checking and client point awards across `HopperPoliceReportQuiz`, `ChapterManager`, `QuestionTypeRenderer`, `TaskEngine`, `components/tasks/*`, `Radiometer`, `vecna/page.tsx`, and `lib/store.tsx`. | M2 | Survey R1 |
| F7 | Explicit Offline/Unreachable Error Indicators | Display prominent visual error banners when backend is unreachable; strictly disallow silent local simulation or unverified progression. | M2 | Survey R1 |
| F8 | Rock-Solid Socket Presence Lifecycle | Broadcast `presence:update` instantly on socket connect and disconnect to the `admins` room, ensuring status reflects accurately within <= 1 second. | M3 | Survey R2 |
| F9 | False 409 Session Lockout Remediation | Make `getMe` session validation check database-authoritative state asynchronously; hydrate `localTeamSessions` on startup to eliminate spurious 401 kicks and 409 re-login conflicts. | M3 | Survey R2 |
| F10| Admin Passkey Clearance Hardening | Update `app/api/admin/login/route.ts` to accept master passkey `"HAWKINS_CHIEF_1983"` consistently with backend auth. | M3 | Survey R2 |
| F11| TiDB Connection Resilience & Error Recovery | Implement `pool.on('error')` handler in `backend/src/config/tidb.ts` and transient query retry mechanism (`queryWithRetry`) to prevent server crashes on idle disconnects. | M4 | Survey R3 |
| F12| Comprehensive Admin Controls Hardening | Ensure all 8 admin action buttons (Start, Pause, Resume, End, Reset Scores, Reset Sessions, Force Logout, Role Toggle) execute reliably with authorized credentials. | M4 | Survey R3 |
| F13| Real-Time Broadcast Matrix Alignment | Emit `score:update` across competitor HUDs upon score changes (including Reset All Scores); fix `components/Leaderboard.tsx` field bindings (`team`, `leader`, `stage`); add `event:state_changed` listener in Admin UI. | M4 | Survey R3 |
| F14| Full E2E Test Suite (Tiers 1-4) & Adversarial Hardening (Tier 5) | Comprehensive requirement-driven opaque-box test suite verifying presence, evaluation, admin controls, and edge cases. | M5 | Survey Dual Track |

---

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Backend Authoritative Evaluation & TiDB Catalog Seeding | Features F1, F2, F3, F4 | none | PLANNED |
| M2 | Client-Side Security Sanitization & Offline Error Handling | Features F5, F6, F7 | M1 | PLANNED |
| M3 | Rock-Solid Admin Real-Time Presence & Session Reliability | Features F8, F9, F10 | none | PLANNED |
| M4 | Admin Dashboard Controls Hardening & TiDB Resilience | Features F11, F12, F13 | M1, M3 | PLANNED |
| M5 | Full E2E Test Suite Verification & Adversarial Hardening | Feature F14 (Tiers 1-5) | M1, M2, M3, M4 | PLANNED |

---

## Interface Contracts

### 1. Question Submission Endpoint Contract
`POST /api/questions/:questionCode/submit`
- **Headers**: `Authorization: Bearer <player_jwt>`, `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "answer": "B"
  }
  ```
- **Response (Correct Answer)**:
  ```json
  {
    "success": true,
    "isCorrect": true,
    "pointsAwarded": 10,
    "isLocked": true,
    "currentScore": 10,
    "message": "CORRECT! Solution verified by central cipher."
  }
  ```
- **Response (Incorrect Answer)**:
  ```json
  {
    "success": true,
    "isCorrect": false,
    "pointsAwarded": 0,
    "isLocked": true,
    "currentScore": 0,
    "message": "INCORRECT! Terminal access for this frequency has been locked."
  }
  ```
- **Response (Duplicate/Locked Attempt)**:
  ```json
  {
    "success": true,
    "isLocked": true,
    "idempotentRecovery": true,
    "message": "Question already attempted and locked."
  }
  ```
- **Response (Event Paused)**: HTTP 403 `{ "success": false, "error": "EVENT_PAUSED" }`
- **Response (Event Ended)**: HTTP 403 `{ "success": false, "error": "EVENT_ENDED" }`

### 2. Socket.IO Event Contracts
- `presence:update`:
  ```json
  {
    "teamId": "T01",
    "isOnline": true
  }
  ```
  Broadcast targets: room `admins`, room `public:broadcast`.
- `score:update`:
  ```json
  {
    "teamId": "T01",
    "newScore": 10,
    "score": 10,
    "delta": 10,
    "reason": "SUBMISSION"
  }
  ```
  Broadcast targets: room `team:T01`, room `admins`, room `public:broadcast`.
- `event:state_changed`:
  ```json
  {
    "status": "active",
    "isPaused": false,
    "phase": "TOURNAMENT",
    "updatedAt": "2026-10-12T12:00:00.000Z"
  }
  ```
  Broadcast targets: all connected sockets (`io.emit`).

### 3. Database Schema Contracts
- `question_submissions`:
  `submission_id`, `team_id`, `question_id`, `submitted_answer`, `is_correct`, `points_awarded`, `submitted_at`. Unique key on `(team_id, question_id)`.
- `score_ledger`:
  `ledger_id`, `team_id`, `source_type` ('QUESTION_SUBMISSION'), `source_id`, `points_delta`, `created_at`. Unique key on `(team_id, source_type, source_id)`.
- `question_answer_keys`:
  `key_id`, `question_id`, `answer_hash` (HMAC-SHA256 hex string), `created_at`.
