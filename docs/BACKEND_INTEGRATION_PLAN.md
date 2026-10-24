# The Hawkins Protocol — Backend Integration Roadmap

> **Project:** StrangerThinks / The Hawkins Protocol  
> **Prepared:** 9 October 2026  
> **Purpose:** Define the backend services, APIs, data flows, security controls, real-time events, and operational work required to make the existing cinematic CTF tournament platform reliable and safe to run across multiple devices.

---

## 1. Goal and Architectural Principles

The backend must be the authoritative source of truth for identity, permissions, puzzle validation, progress, scoring, tournament timing, organizer actions, and audit history. The frontend may animate and present game state, but it must never be trusted to decide whether an answer is correct, award points, grant an ability, change a timer, or authorize an administrative action.

### Required principles

- **Server-authoritative gameplay:** validate answers, unlock chapters, calculate points, apply penalties, and record solves on the server.
- **Clear separation of responsibilities:** Next.js renders the game; Express exposes APIs and realtime authorization; Supabase PostgreSQL persists durable data.
- **Private-by-default data:** answer keys, admin secrets, passcodes, and hidden challenge material never appear in public API responses or client bundles.
- **Authenticated, role-checked actions:** every protected endpoint checks identity, role, tournament scope, and resource-level permissions.
- **Durable state:** game progress and scoring must survive page refreshes, browser restarts, server restarts, and reconnections.
- **Realtime with persistence:** WebSocket/Supabase Realtime events notify clients of committed changes; the database remains the source of truth.
- **Observable operations:** important actions, errors, security events, and performance are logged without recording secrets.
- **Accessible fallbacks:** a disconnected client can display the last confirmed state, but cannot make authoritative updates offline.

---

## 2. Target System Architecture

```text
Player / Vecna Organizer / Chief Admin
                 |
                 v
       Next.js Frontend (Port 3000)
       UI, scenes, local animation, WebAudio
                 |
          HTTPS / WSS only
                 v
       Express + TypeScript API (Port 5000)
       Authentication + Authorization
       Challenge validation + scoring
       Tournament state + admin operations
       Rate limits + audit logging
          |                  |
          |                  +----------------------+
          v                                         v
 Supabase PostgreSQL                         Realtime transport
 durable source of truth                    Supabase Realtime or
 teams, challenges, solves,                 authenticated WebSockets
 scores, actions, audit logs                 event delivery only
          |
          v
 Backups, migrations, monitoring, alerting
```

### Keep the existing stack

- **Frontend:** Next.js 14 App Router, React, TypeScript, Framer Motion, custom CSS, Canvas/SVG, WebAudio API.
- **API:** Node.js, Express, TypeScript (`backend/`, default port `5000`).
- **Database:** Supabase PostgreSQL.
- **Realtime:** Supabase Realtime for cross-device events, or an authenticated WebSocket service if there is a specific operational reason. `BroadcastChannel` may remain as an optional same-browser convenience, not as tournament-wide synchronization.
- **Validation:** server-side schemas for every request and response, preferably with a consistent library such as Zod.
- **Tests:** unit, API integration, permission, realtime, and end-to-end tests.

Do not add Redis, a job queue, or a separate microservice by default. Introduce them only when measured load or a required feature justifies the extra operational complexity.

---

## 3. Backend Integration Checklist

Legend: `[ ]` = implementation or verification required; `[x]` should only be marked after it is confirmed in the codebase and tested.

### A. Application foundation and configuration — P0

- [ ] Establish one documented API prefix, such as `/api/v1`, and version it consistently.
- [ ] Validate all environment variables at startup; fail fast with a safe message when required configuration is missing.
- [ ] Separate development, staging, and production configuration and credentials.
- [ ] Configure explicit allowed CORS origins; do not use unrestricted origins with credentials.
- [ ] Add security headers, request size limits, request timeouts, and appropriate HTTP method restrictions.
- [ ] Add centralized request validation, error handling, and a consistent JSON response format.
- [ ] Generate a request/correlation ID and include it in logs and error responses.
- [ ] Add `/api/health` for process health and a separate readiness check for database/realtime dependencies.
- [ ] Make startup and shutdown graceful: stop accepting new requests, finish in-flight work, and close database/realtime connections.
- [ ] Keep production stack traces and internal database details out of client-facing errors.

**Suggested response format**

```json
{
  "data": {},
  "error": null,
  "meta": { "requestId": "..." }
}
```

For failures, return a stable error code and safe message; do not expose secret values, SQL, file paths, or stack traces.

### B. Authentication, sessions, and roles — P0

- [ ] Replace credential matching based only on names with a real, server-validated login flow.
- [ ] Define the identity model for **Player/Team**, **Vecna Organizer**, and **Chief Admin**.
- [ ] Store passwords or passcodes only as strong one-way hashes, using a reputable password-hashing algorithm and appropriate parameters. Never store or log raw secrets.
- [ ] Prefer Supabase Auth for user identity if it fits the deployment; otherwise implement a well-reviewed server-side session mechanism. Do not build a home-grown token scheme without a clear need.
- [ ] Use secure, `HttpOnly`, `Secure` (in production), appropriately `SameSite` cookies for browser sessions where possible. Protect cookie-authenticated state-changing requests against CSRF.
- [ ] Rotate/revoke sessions at logout, credential reset, user deactivation, and incident response.
- [ ] Enforce authorization on every protected API endpoint, not merely through Next.js middleware or hidden UI links.
- [ ] Apply resource-level checks: an ordinary player can access only their own team's data; an organizer can operate only the tournament(s) they are assigned to; a chief admin has explicitly scoped administrative privileges.
- [ ] Return generic login failures to reduce account/team enumeration.
- [ ] Apply login throttling, progressive delays, and monitoring for repeated failures.
- [ ] Add session expiry and idle-timeout policy; document organizer/admin reauthentication for sensitive actions.
- [ ] Add a safe procedure for creating the first administrator and rotating administrator credentials.
- [ ] Remove secrets and real credentials from source code, seed files intended for production, documentation, frontend bundles, and Git history where feasible.

**Important current-state check:** the project notes list demo team names, team-leader names, and an admin passkey in client-side configuration. Treat these as development/demo data only. A value in `lib/config.ts`, `NEXT_PUBLIC_*`, or any browser-delivered bundle is not a secret. The documented `localStorage` session is also not proof of authorization; the server must independently validate the session on each protected request.

### C. Tournament, teams, and membership — P0

- [ ] Create persistent tournament records with name, status, start/end timestamps, duration, rules version, and configuration.
- [ ] Support team registration, editing, disabling, and roster management through authorized admin endpoints.
- [ ] Represent team membership explicitly instead of relying only on a leader's display name.
- [ ] Enforce unique team identifiers within a tournament and normalize identifiers consistently.
- [ ] Add an event/tournament lifecycle: `draft`, `ready`, `running`, `paused`, `completed`, `cancelled`.
- [ ] Store who made every roster, registration, and status change.
- [ ] Decide whether players authenticate individually or share a team session. If a shared team session is used for an event, issue and revoke it server-side, make its permissions narrow, and support organizer-controlled session invalidation.
- [ ] Handle deleted/disabled teams without deleting historical score and audit records.

### D. Challenge and question vault — P0

- [ ] Keep correct answers, answer regexes, hidden validation rules, and secret codes exclusively on the server/database access layer.
- [ ] Split public challenge content from private validation material in the schema and API serialization.
- [ ] Ensure player-facing chapter/question endpoints never return `correct_answer`, accepted answer variants, private test cases, scoring internals, or answer-validation metadata.
- [ ] Support challenge metadata: chapter, location, title, prompt, task type, points, prerequisites, hints, attempt limits, availability, and version.
- [ ] Support question options with public option text and stable option IDs; the correct option must remain private.
- [ ] Validate task types against an allowlist; never dynamically execute user-submitted code on the API server.
- [ ] Add versioning or an immutable snapshot so live edits do not silently change the rules underneath teams who have already started.
- [ ] Validate organizer edits on the backend and record before/after audit metadata without logging secret answers in plaintext.
- [ ] Add a default-data import/restore flow that is safe to run more than once and does not overwrite live tournament data unintentionally.
- [ ] Add publication controls so drafts and disabled questions are not exposed to players.

### E. Answer submission and solve records — P0

- [ ] Build a single authoritative answer-submission pipeline shared by all seven task engines where appropriate.
- [ ] Verify the caller's team, tournament status, chapter availability, prerequisites, and attempt limits before checking the answer.
- [ ] Normalize answers on the server consistently; do not trust client-side normalization or validation.
- [ ] Use constant-time comparison where applicable for secret tokens/codes, and design validation to avoid revealing how close a guess was unless the game explicitly intends that feedback.
- [ ] Apply per-user/team/IP rate limits and cooldowns based on risk and tournament rules.
- [ ] Record each submission with team, challenge/version, timestamp, outcome, attempt count, and any awarded points; never store unnecessary raw secrets.
- [ ] Use database transactions to make solve creation, chapter unlocks, score updates, and point awards atomic.
- [ ] Make submissions idempotent where a network retry could otherwise award duplicate points.
- [ ] Return only the minimum feedback needed by the game UI (for example, accepted/rejected, safe hint, awarded points, and next eligible chapter).
- [ ] Add protection against replaying an old successful request to collect points again.
- [ ] Add consistent error behavior for invalid, locked, expired, and already-solved challenges.

### F. Scoring engine and leaderboard — P0

The project blueprint defines these weights:

```text
Final Score =
  0.30 × Tech
+ 0.20 × Puzzle
+ 0.15 × Speed
+ 0.15 × Clues
+ 0.10 × Story
+ 0.10 × Teamwork
− Penalties
```

- [ ] Confirm whether the weights apply to normalized category scores or raw points; document the exact formula before production use.
- [ ] Implement one server-side scoring module; never calculate final scores only in React or accept a score sent by the client.
- [ ] Store score events/ledger entries instead of only mutating one total. Each entry should capture the team, event type, points delta, reason code, source record, actor if applicable, and timestamp.
- [ ] Make score awarding transactional and idempotent.
- [ ] Define and test tie-break behavior, including the documented rule that earlier `last_solved_at` wins where the rule applies.
- [ ] Store a scoring-rules version per tournament so rule changes do not silently rewrite the past.
- [ ] Support live leaderboard queries using server/database-computed values.
- [ ] Ensure admin score adjustments require a reason and are auditable.
- [ ] Add reconciliation tooling to recompute standings from the score ledger and compare against cached totals.
- [ ] Define how penalties, hints, repeated attempts, teamwork points, pauses, and late solves affect scores.

### G. Chapter progression and eight story locations — P0

- [ ] Persist unlocked chapters and completed objectives per team.
- [ ] Enforce the required progression and prerequisites on the server.
- [ ] Persist radiometer pin completion and final keypad unlock status.
- [ ] Treat the five pin values and master keypad result as server-validated outcomes, not trusted frontend state.
- [ ] Verify whether `83479` is meant to be a public clue, a shared puzzle answer, or a private key. If it is a secret key, remove it from client-delivered files and rotate it; if it is the intended puzzle solution, still validate it server-side and rate-limit submissions.
- [ ] Persist character powers (`eleven`, `will`, `vision`) as explicit unlock records with server-controlled conditions.
- [ ] Store story beats/cutscene completion when needed so reloads and reconnects do not repeat or skip essential progression.
- [ ] Keep cosmetic animation state on the frontend when it does not affect rules or scoring.

### H. Realtime events and multi-device synchronization — P0/P1

- [ ] Select one primary cloud realtime transport; do not treat `BroadcastChannel` as a cross-device solution.
- [ ] Authenticate realtime connections and authorize channel/topic subscription by role and tournament membership.
- [ ] Define a typed event catalogue (examples below) with schema validation and event versioning.
- [ ] Publish events only after the corresponding database transaction has committed.
- [ ] Include event IDs and sequence/version information so clients can discard duplicates and detect gaps.
- [ ] Make clients fetch an authoritative snapshot after initial connection, reconnect, missed sequence, or uncertain state.
- [ ] Implement reconnect with bounded exponential backoff and clean subscription teardown.
- [ ] Avoid publishing secret answers, admin-only metadata, hidden options, raw credentials, or private participant data to public channels.
- [ ] Separate player-visible events from organizer/admin events.
- [ ] Rate-limit organizer broadcasts and sabotage actions; require confirmation for high-impact tournament-wide actions.
- [ ] Add a realtime health indicator to organizer tools and show a degraded/offline state rather than pretending updates succeeded.

**Suggested event catalogue**

| Event | Publisher | Recipients | Purpose |
|---|---|---|---|
| `team.presence.updated` | API/presence service | Authorized organizers | Team online/last-seen status |
| `team.progress.updated` | API | Team + authorized organizers | Chapter and pin progress |
| `challenge.solve.accepted` | API | Team + authorized organizers | Confirm solve and awarded points |
| `leaderboard.updated` | API | Tournament participants | Refresh standings |
| `tournament.state.changed` | API/admin | Tournament clients | Running/paused/completed state |
| `story.triggered` | Organizer API | Intended tournament/team | Story beat or scene effect |
| `sabotage.issued` | Organizer API | Target team(s) | Apply a time-bounded gameplay effect |
| `dialogue.dispatched` | Organizer API | Target team(s) | Deliver character dialogue |
| `teamwork.points.awarded` | Organizer API | Target team + admins | Publish an audited award |
| `admin.configuration.updated` | Admin API | Authorized admins | Refresh control-room configuration |

### I. Presence and telemetry — P1

- [ ] Define presence separately from durable game state. A heartbeat is an estimate of connectivity, not proof that a participant is actively playing.
- [ ] Replace hardcoded or misleading heartbeat assumptions with a documented heartbeat/last-seen mechanism.
- [ ] Record minimal telemetry: team ID, last seen, current location/chapter if available, completed chapters, radiometer progress, and score snapshot.
- [ ] Derive active/offline status using a configurable timeout and show the last-seen timestamp to organizers.
- [ ] Avoid collecting unnecessary device fingerprints or personal data.
- [ ] Store telemetry in a way that cannot create excessive database writes; aggregate or throttle updates where necessary.
- [ ] Define stale-data behavior for the Vecna map and distinguish stale telemetry from a verified offline state.

### J. Vecna Control Room / Organizer controls — P0/P1

- [ ] Protect every organizer endpoint with server-side role and tournament-scope checks.
- [ ] Implement targeted and tournament-wide story triggers.
- [ ] Implement sabotage issuance for `GLITCH`, `CORRUPT`, `TIME_FREEZE`, `DISTORT`, `SIGNAL_JAM`, and `LOCK`.
- [ ] Store each sabotage as a durable record with target, effect, issued-by, start/end time, parameters, status, and cancellation reason.
- [ ] Make temporary effects expire server-side even if the client disconnects; do not rely on the browser timer alone.
- [ ] Prevent conflicting effects or define their precedence and stacking rules.
- [ ] Validate allowed durations, targets, payload sizes, and effect types against an allowlist.
- [ ] Add explicit confirmation and audit reasons for high-impact actions such as tournament-wide locks, freezes, resets, and score changes.
- [ ] Implement pause/resume with a consistent server-authoritative clock model.
- [ ] Support safe cancellation/reversal where the action is reversible.
- [ ] Record custom teamwork awards with reason, actor, and score-ledger entry.
- [ ] Ensure organizer views can distinguish commanded, delivered, acknowledged, expired, and failed actions.

### K. Chief Admin tools — P0/P1

- [ ] Move admin authorization away from a hardcoded shared passkey in frontend/source configuration.
- [ ] Implement secure admin sign-in and explicit permission scopes.
- [ ] Implement CRUD for chapters, questions, options, lore, teams, tournament settings, and scoring rules.
- [ ] Validate all edits on the backend and return sanitized public data after changes.
- [ ] Add draft/publish/disable states and guard live-event edits.
- [ ] Add a protected leaderboard and solve-log view with pagination and filters.
- [ ] Add safe reset/reseed behavior with an explicit environment check and confirmation; never provide an unguarded production-wide reset-to-defaults operation.
- [ ] Record audit logs for logins, failed logins, changes, exports, resets, score adjustments, role changes, and sensitive reads where practical.
- [ ] Require a reason for manual overrides and preserve the original event history.
- [ ] Provide export endpoints only to authorized admins and use CSV-safe output to reduce spreadsheet formula injection risks.

### L. Persistence, database integrity, and migrations — P0

- [ ] Review `backend/database/schema.sql` against actual controller queries and current Supabase tables.
- [ ] Create repeatable, ordered migrations; do not rely on manually editing production tables.
- [ ] Add foreign keys, unique constraints, `NOT NULL` rules, and check constraints for important invariants.
- [ ] Add indexes for tournament ID, team ID, challenge/chapter ID, solve timestamps, score events, and leaderboard ordering based on actual queries.
- [ ] Use transactions for related changes (solve + score + unlock + audit event where appropriate).
- [ ] Use connection pooling appropriate to the Supabase plan and expected concurrency. Avoid opening one new database connection per request.
- [ ] Enable and verify Row Level Security (RLS) if client-side Supabase access is used. Keep service-role credentials exclusively on the server; never ship them to the browser.
- [ ] Prefer routing sensitive mutations through Express, even if safe public reads use Supabase directly.
- [ ] Back up production data and test restoring it to a separate environment.
- [ ] Define data retention and clean-up policies for transient presence and operational logs.
- [ ] Use UTC timestamps in storage; render local time in the UI.

**Core durable tables to verify or add**

| Table | Purpose |
|---|---|
| `tournaments` | Lifecycle, schedule, duration, rules version, settings |
| `teams` | Team identity, tournament link, status, display name |
| `team_members` | Participants, roles, and membership |
| `chapters` | Public chapter metadata and progression prerequisites |
| `chapter_questions` | Prompts plus protected validation configuration separated by access control |
| `question_options` | Public options and stable IDs; correct keys remain private |
| `chapter_lore` | Story/dialogue content with publication and audience controls |
| `team_progress` | Current progression snapshot for efficient reads |
| `chapter_solves` | Accepted solves and relevant attempt/result metadata |
| `answer_attempts` | Rate-limited submission history, without unnecessary raw answers |
| `score_ledger` | Append-oriented record of score changes and awards |
| `radiometer_progress` | Pin completion and validated results |
| `team_abilities` | Character powers and unlock timestamps |
| `sabotage_events` | Targeted effects, lifecycle, expiry, cancellation |
| `story_events` | Story trigger history and delivery status |
| `sessions` or auth-provider records | Session lifecycle if not fully delegated to an auth provider |
| `audit_logs` | Sensitive actor/action/resource/result metadata |
| `idempotency_keys` | Deduplicate retried state-changing requests where needed |

Names can be adapted to existing schema. Avoid duplicating state across tables without a clearly defined owner and reconciliation strategy.

### M. Security controls — P0

- [ ] Use HTTPS in production and WSS for realtime transport.
- [ ] Validate all request bodies, query parameters, path parameters, headers, and uploaded content, if any.
- [ ] Use parameterized queries and safe database APIs; never concatenate user input into SQL.
- [ ] Apply endpoint-specific rate limits: login, submissions, pin checks, keypad checks, admin login, exports, and organizer broadcasts.
- [ ] Enforce maximum request/body sizes, pagination limits, and bounded query costs.
- [ ] Restrict secrets by least privilege; separate database roles where practical.
- [ ] Add CSRF protection if browser authentication uses cookies; use strict CORS as an additional control, not a substitute.
- [ ] Prevent authorization bypass through direct API calls, changing IDs, mass assignment, or role fields supplied by clients.
- [ ] Protect against replay and duplicate awards with idempotency and database constraints.
- [ ] Sanitize user-controlled text before rendering it in admin dashboards, logs, and player screens.
- [ ] Do not log credentials, session cookies, authorization headers, full secret answers, or unnecessary personal data.
- [ ] Scan dependencies and lockfile; define a process for critical vulnerability updates.
- [ ] Keep `.env*` secrets out of Git and ensure production secrets are supplied by the deployment environment.
- [ ] Threat-model cheat paths: answer extraction, repeated guessing, forged score updates, spoofed realtime events, organizer impersonation, and replayed solve requests.

### N. Monitoring, logging, and incident response — P1

- [ ] Use structured logs with timestamp, severity, request ID, route, latency, status, and safe actor/resource identifiers.
- [ ] Add metrics for API latency/error rate, database pool pressure, connection failures, rate-limit blocks, solve volume, realtime disconnects, and organizer action failures.
- [ ] Alert on repeated admin login failures, abnormal guessing rates, unexpected score mutations, and database/realtime outages.
- [ ] Add error reporting with secret/PII scrubbing.
- [ ] Write runbooks for database outage, lost realtime transport, leaked credential, corrupted tournament state, and accidental admin action.
- [ ] Document how to pause the tournament safely, revoke sessions, rotate credentials, restore backups, and reconcile the score ledger.

### O. Performance and capacity — P1

- [ ] Measure normal and peak traffic before claiming a capacity number such as 5,000 concurrent sockets.
- [ ] Load-test the full path (frontend → API → database/realtime), not merely open TCP connections.
- [ ] Keep database queries bounded and use pagination; avoid loading all teams, solves, or attempts for every dashboard refresh.
- [ ] Use a cached leaderboard snapshot only if needed; update/invalidate it from authoritative score changes.
- [ ] Use a bounded connection pool and monitor pool saturation.
- [ ] Avoid emitting a global event for every telemetry heartbeat; aggregate low-priority updates.
- [ ] Test reconnect storms and burst traffic at tournament start, puzzle announcements, and scoreboard refreshes.
- [ ] Set explicit rate limits and graceful degradation behavior for noncritical features.

### P. Deployment and operations — P0/P1

- [ ] Deploy the frontend and Express API with separate environment configuration and independent health checks.
- [ ] Configure the frontend's public API URL for the deployment environment; never hardcode a developer's LAN IP.
- [ ] Store the Supabase URL and public anon key in the appropriate frontend configuration only when direct public client access is deliberately used; keep service-role and database secrets server-only.
- [ ] Configure production CORS origins, allowed redirect URLs, cookies, proxy/trust settings, and HTTPS.
- [ ] Set up automated build, type-check, lint, test, migration, and deployment steps in CI/CD.
- [ ] Run migrations as a controlled deployment step, with a rollback/forward-fix procedure.
- [ ] Add staging with nonproduction credentials and seeded demo data.
- [ ] Ensure secrets are not printed in build logs or exposed in client source maps.
- [ ] Define database backup frequency, retention, restore drills, and recovery objectives.
- [ ] Document start commands for frontend and backend, environment variable names, ports, troubleshooting, and production restart procedures.

---

## 4. API Contract Inventory

These are recommended endpoint contracts to verify against existing routes and implement where missing. Preserve current routes temporarily if necessary, but avoid two endpoints with conflicting behavior for the same operation.

### Health and session

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `GET` | `/api/health` | Public, minimal | Process health |
| `GET` | `/api/ready` | Internal/monitoring | Dependency readiness |
| `POST` | `/api/v1/auth/login` | Public, throttled | Authenticate participant/admin |
| `POST` | `/api/v1/auth/logout` | Authenticated | Revoke current session |
| `GET` | `/api/v1/auth/session` | Authenticated | Return current identity and allowed capabilities |

### Player gameplay

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `GET` | `/api/v1/game/state` | Player | Return authoritative team snapshot |
| `GET` | `/api/v1/chapters` | Player | Return published, sanitized chapter metadata |
| `GET` | `/api/v1/chapters/:chapterId` | Player | Return the chapter the team is allowed to view |
| `POST` | `/api/v1/chapters/:chapterId/submit` | Player, throttled | Validate answer and perform solve transaction |
| `POST` | `/api/v1/radiometer/pins/:pinId/validate` | Player, throttled | Validate one pin submission |
| `POST` | `/api/v1/radiometer/keypad/validate` | Player, throttled | Validate final keypad attempt |
| `GET` | `/api/v1/teams/me/progress` | Player | Return own team's progress |
| `GET` | `/api/v1/leaderboard` | Public or tournament participant | Return safe leaderboard data |

### Vecna organizer

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `GET` | `/api/v1/organizer/overview` | Organizer | Team status, score, progress summary |
| `GET` | `/api/v1/organizer/teams` | Organizer | Authorized team telemetry and progress |
| `POST` | `/api/v1/organizer/sabotages` | Organizer, audited | Issue targeted or global effect |
| `POST` | `/api/v1/organizer/sabotages/:id/cancel` | Organizer, audited | Cancel an active effect |
| `POST` | `/api/v1/organizer/story-triggers` | Organizer, audited | Dispatch a story event |
| `POST` | `/api/v1/organizer/dialogue` | Organizer, audited | Dispatch character dialogue |
| `POST` | `/api/v1/organizer/teams/:teamId/teamwork-awards` | Organizer, audited | Award teamwork points |
| `POST` | `/api/v1/organizer/tournament/pause` | Organizer, audited | Pause event according to policy |
| `POST` | `/api/v1/organizer/tournament/resume` | Organizer, audited | Resume event |

### Chief admin

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `GET/POST` | `/api/v1/admin/tournaments` | Admin | List/create tournaments |
| `GET/PATCH` | `/api/v1/admin/tournaments/:id` | Admin | Inspect/update tournament configuration |
| `GET/POST` | `/api/v1/admin/teams` | Admin | List/register teams |
| `PATCH/DELETE` | `/api/v1/admin/teams/:teamId` | Admin, audited | Update/disable team safely |
| `GET/POST` | `/api/v1/admin/chapters` | Admin | List/create chapter records |
| `GET/PATCH/DELETE` | `/api/v1/admin/chapters/:chapterId` | Admin, audited | Manage chapter records |
| `GET/POST` | `/api/v1/admin/questions` | Admin | List/create questions with private fields protected |
| `PATCH/DELETE` | `/api/v1/admin/questions/:questionId` | Admin, audited | Edit/disable question |
| `GET` | `/api/v1/admin/leaderboard` | Admin | Full tournament standings |
| `GET` | `/api/v1/admin/solves` | Admin | Filtered solve history |
| `GET` | `/api/v1/admin/audit-logs` | Admin with permission | Security and change history |
| `POST` | `/api/v1/admin/score-adjustments` | Admin, reason required | Record manual score adjustment |

**Contract requirements for all write endpoints:** validate input; authorize on the server; use transactions when multiple records change; return stable error codes; record required audit metadata; and support idempotency for retry-prone operations.

---

## 5. Important End-to-End Data Flows

### Flow 1 — Player signs in

1. The browser submits the login identifier and secret over HTTPS.
2. The backend validates the request, applies login throttling, checks the credential against the authentication store, and creates a server-verifiable session.
3. The response contains only safe identity details, team membership, and allowed capabilities.
4. The frontend loads the team's authoritative game snapshot.
5. Realtime subscriptions are established only after authorization and are scoped to permitted channels.

### Flow 2 — Player solves a challenge

1. The frontend submits the answer with challenge ID and an idempotency key.
2. The API verifies the session, team membership, tournament status, chapter prerequisites, question version, and attempt limit.
3. The server validates the answer using protected server-side logic.
4. If accepted, a database transaction inserts the solve, creates score-ledger entries, updates progression, unlocks any next stage, and records relevant audit metadata.
5. Only after commit does the API publish a solve/progress/leaderboard event.
6. The client receives a minimal accepted result and refreshes from the authoritative snapshot if needed.

### Flow 3 — Organizer triggers an event

1. The organizer submits a typed event payload to the API.
2. The API checks role, tournament scope, target team IDs, effect allowlist, duration, and confirmation/reason requirements.
3. The action is written to the database and audit log.
4. A realtime event is published to authorized recipients after commit.
5. Target clients acknowledge delivery where practical; the organizer UI shows the event status.
6. Expiry/cancellation is enforced by the backend and reconciled after reconnects.

### Flow 4 — Leaderboard updates

1. A score-changing event is committed through the server-side scoring engine.
2. The leaderboard query or cache is refreshed from durable score records.
3. A `leaderboard.updated` event notifies authorized clients.
4. Clients render the published standings and do not calculate authoritative rankings themselves.

---

## 6. Frontend-to-Backend Integration Map

| Existing frontend area | Backend integration needed |
|---|---|
| `LandingPage.tsx` / shared login `/` | Real authentication, safe error responses, server session, logout/revocation |
| `Hud.tsx` | Authoritative team state, timer, progress, score, session expiry |
| `HawkinsMap.tsx` and `components/scenes/` | Authorized chapter discovery/unlock state and persistent progression |
| `components/tasks/*` | Shared submit API contract, server-side validation, attempt limits, solve results |
| `Radiometer.tsx`, radio and radiotower pages | Server-validated pin/keypad submissions and persistent pin completion |
| `InvestigationBoard.tsx` / `PushPin.tsx` | Persist meaningful clue discoveries/solves; keep decorative positions client-side unless gameplay-relevant |
| `Ending.tsx` | Server-confirmed completion, final scoring snapshot, recorded completion timestamp |
| `/leaderboard` | Safe public/participant leaderboard endpoint and realtime update subscription |
| `/vecna` | Authenticated organizer API, telemetry, effect lifecycle, story triggers, score adjustments |
| `/admin` | Protected CRUD endpoints, role checks, input validation, audit logging, safe reset workflow |
| `lib/realtime.ts` | Authorized cloud transport, typed events, reconnect/snapshot strategy; local BroadcastChannel remains optional |
| `lib/store.tsx` | Rehydrate from API snapshot; treat client state as a cache of server-confirmed state |
| `lib/api.ts` | Shared typed API client, credentials/session handling, request IDs, error normalization, timeouts |
| `lib/config.ts` | Move secrets/validation configuration to server-only environment and database settings; keep only nonsecret UI configuration client-side |

---

## 7. Testing Requirements Before a Live Tournament

### Unit tests

- [ ] Answer normalization and validator edge cases for all seven task types.
- [ ] Scoring weights, penalties, speed calculation, teamwork awards, tie-breakers, and rounding.
- [ ] Chapter prerequisite and character-ability unlock rules.
- [ ] Sabotage duration, precedence, expiry, and cancellation behavior.

### API/security tests

- [ ] Unauthenticated requests cannot read or mutate protected resources.
- [ ] A player cannot read or mutate another team's state by swapping IDs.
- [ ] An organizer cannot control a tournament outside their scope.
- [ ] A player/admin cannot submit arbitrary score values or change their own role.
- [ ] Correct answers and private validation configuration never appear in player API responses.
- [ ] Repeated/replayed solve requests never award duplicate points.
- [ ] Rate limits apply to login, guessing, keypad checks, and organizer broadcasts.
- [ ] Invalid, oversized, malformed, and unexpected payloads return safe errors.
- [ ] Cookies, CORS, CSRF protections, session revocation, and logout behave as intended.

### Integration and end-to-end tests

- [ ] Full path from login to chapter unlock to solve to scoring to leaderboard update.
- [ ] Radiometer pin flow survives refresh and reconnect.
- [ ] Vecna trigger reaches only the intended team(s) and is auditable.
- [ ] Temporary effects expire even when the player disconnects.
- [ ] Admin question edits publish correctly without leaking private fields.
- [ ] Two clients on different devices see consistent authoritative progress.
- [ ] Backend restart and realtime reconnection restore correct state.
- [ ] Database restore and score reconciliation work in a staging environment.

### Load tests

- [ ] Simulate expected player count plus a safety margin.
- [ ] Simulate burst logins, simultaneous answer submissions, and leaderboard refreshes.
- [ ] Simulate realtime reconnect storms and organizer-wide broadcasts.
- [ ] Measure API latency, database pool saturation, error rate, and event delivery delay; set thresholds based on results rather than assumptions.

---

## 8. Recommended Implementation Order

### Phase 0 — Audit the current implementation

- [ ] Map each existing Express route to its controller, database query, authentication check, validation, and tests.
- [ ] Inspect `backend/src/server.ts`, `controllers/`, `routes/`, `config/`, `backend/database/schema.sql`, `lib/api.ts`, `lib/realtime.ts`, and `lib/store.tsx`.
- [ ] Confirm which items in the project memory are actually implemented, working, and deployed. Do not infer completion from documentation alone.
- [ ] Produce an endpoint inventory and a list of known gaps before adding duplicate implementations.

### Phase 1 — Security and durable gameplay foundations (P0)

- [ ] Secure authentication, sessions, and role-based/resource-level authorization.
- [ ] Validate environment configuration and remove hardcoded production secrets.
- [ ] Complete schema constraints/migrations and server-only answer validation.
- [ ] Implement transactional solve, progression, and score-ledger operations.
- [ ] Add rate limits, request validation, safe error handling, and security tests.

### Phase 2 — Complete player game integration (P0)

- [ ] Connect all seven task engines to the authoritative submission API.
- [ ] Persist chapter progress, radiometer pins, abilities, clues, and completion state.
- [ ] Implement safe game-state snapshot endpoints and reconnect recovery.
- [ ] Integrate the authoritative scoring and leaderboard calculation.

### Phase 3 — Organizer/admin integration (P0/P1)

- [ ] Secure Vecna commands and durable sabotage/story event records.
- [ ] Add pause/resume and server-controlled tournament clock semantics.
- [ ] Complete admin CRUD, publication controls, audited score adjustments, and safe recovery operations.
- [ ] Add operator action status and audit-log visibility.

### Phase 4 — Realtime, telemetry, and operations (P1)

- [ ] Finish authenticated realtime topics/events and cross-device synchronization.
- [ ] Add presence, reconnect handling, health checks, structured logs, metrics, and alerts.
- [ ] Add CI/CD, staging, backups, restore drills, and deployment runbooks.

### Phase 5 — Tournament readiness (release gate)

- [ ] Pass all critical security and end-to-end tests.
- [ ] Run load tests at the expected maximum participant count.
- [ ] Verify that the organizer can pause safely and recover from a service interruption.
- [ ] Verify score-ledger reconciliation and backup restoration.
- [ ] Freeze the tournament rules/configuration and record the version used for the event.
- [ ] Run a full rehearsal on multiple laptops and separate networks.

---

## 9. Environment Variable Plan

The exact variable names may follow the current codebase. Validate them at startup and document which are required in each environment.

```dotenv
# API runtime
NODE_ENV=development
PORT=5000
FRONTEND_ORIGIN=http://localhost:3000
API_PUBLIC_URL=http://localhost:5000

# Supabase — server-side configuration
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Authentication/session configuration, if not fully delegated to an auth provider
SESSION_SECRET=
SESSION_MAX_AGE_SECONDS=

# Optional operational settings
LOG_LEVEL=info
RATE_LIMIT_WINDOW_SECONDS=
RATE_LIMIT_MAX_REQUESTS=
```

**Rules:** never commit real values; never expose `SUPABASE_SERVICE_ROLE_KEY` or session secrets to the browser; do not prefix secrets with `NEXT_PUBLIC_`; use a secret manager or deployment secret store in production. Only include variables actually used by the chosen implementation, and remove unused configuration.

---

## 10. Definition of Done

The backend is ready for a live, multi-device tournament only when all of the following are true:

- [ ] The server independently authenticates and authorizes every protected operation.
- [ ] No answer keys, privileged credentials, or secret validation data ship to the browser.
- [ ] All gameplay results, progression, score changes, timers, and organizer actions are durable and server-authoritative.
- [ ] Duplicate/replayed submissions cannot generate duplicate awards.
- [ ] All seven task engines use the defined API contracts and have automated tests.
- [ ] Cross-device state synchronization works and clients recover after reconnect.
- [ ] Vecna actions are scoped, time-bounded, auditable, and recoverable.
- [ ] Admin operations are protected, validated, and recorded in audit logs.
- [ ] Production secrets, HTTPS, database access, backups, monitoring, and deployment are configured.
- [ ] Security, recovery, and load tests pass against the expected tournament size.
- [ ] A tournament rehearsal verifies the complete experience from login to final leaderboard.

---

## 11. Rules for Any AI Coding Agent Working on This Repository

1. **Audit before editing.** Read the current route/controller/schema and frontend caller before claiming a feature is missing or implementing a new one.
2. **Do not rewrite the stack.** Preserve Next.js 14, Express/TypeScript, and Supabase unless a measured constraint justifies a change.
3. **Do not trust client state.** Frontend state is presentation/cache only for anything affecting identity, challenges, progression, points, timers, or permissions.
4. **Do not expose secrets.** Keep answers and privileged settings in server-only modules/database access paths; never add secrets to `NEXT_PUBLIC_*` or frontend config.
5. **Use transactions for multi-record gameplay operations** and idempotency for operations that may be retried.
6. **Authorize every API route** and test direct API access—not just the visible UI flow.
7. **Use migrations, not destructive manual edits.** Preserve existing tournament history and provide safe rollback/forward-fix plans.
8. **Keep changes incremental.** Avoid replacing working UI or unrelated code while integrating backend behavior.
9. **Add tests and update documentation** for each route, schema, role, event, and scoring change.
10. **Report evidence honestly.** Mark checklist items complete only after inspecting code and running relevant tests; distinguish implemented, partially implemented, unverified, and missing functionality.

---

## 12. Final Priority Summary

**P0 — Must work before a live event:** authentication and authorization, private answer vault, validated APIs, transactional solves/scoring/progression, tournament state, durable radiometer state, admin/organizer permissions, rate limits, database integrity, safe secrets, and core tests.

**P1 — Required for a dependable multi-device event:** authenticated realtime, reliable presence/telemetry, sabotage expiry, pause/resume semantics, observability, backups/restore, staging/CI/CD, and load testing.

**P2 — Add when the core is stable:** advanced analytics, richer audit search/export, dashboards for performance trends, automated incident workflows, and optional caching/queue infrastructure if measurements justify it.

**Implementation note:** this document is a roadmap, not a claim that every listed item is currently absent. Verify the repository and deployment before changing existing functionality.
