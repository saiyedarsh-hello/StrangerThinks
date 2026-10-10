# THE HAWKINS PROTOCOL

An immersive, cinematic story-driven coding and puzzle event frontend built with **Next.js 14 (App Router)**, **TypeScript**, and **Framer Motion**. Zero image assets (100% SVG, Canvas, and CSS) and zero audio files (100% live synthesized WebAudio API).

---

## Unified Shared Login & Routing Architecture

The Hawkins Protocol features **ONE single shared login screen at `/`** that routes all participants to their appropriate website based on their credentials, with zero hint of which roles exist:

```
                          ┌───────────────────────────┐
                          │   SHARED LOGIN SCREEN     │
                          │           (/)             │
                          │  1. TEAM NAME             │
                          │  2. TEAM LEADER NAME      │
                          └─────────────┬─────────────┘
                                        │
                 ┌──────────────────────┴──────────────────────┐
                 ▼                                             ▼
       [Player Credentials]                          [Vecna Credentials]
                 │                                             │
                 ▼                                             ▼
  ┌─────────────────────────────┐               ┌─────────────────────────────┐
  │      PLAYER EXPERIENCE      │               │     VECNA CONTROL ROOM      │
  │            (/)              │               │          (/vecna)           │
  │ • Cinematic Typewriter      │               │ • Dark-red Control Room     │
  │ • Hawkins Map Hub           │               │ • Registered Teams Monitor  │
  │ • Team & Leader in HUD      │               │ • Status: ACTIVE / OFFLINE  │
  │ • LOGOUT button in HUD      │               │ • Full Sabotage & Controls  │
  │ • Locked out of /vecna      │               │ • LOGOUT button in Header   │
  └─────────────────────────────┘               └─────────────────────────────┘
```

### 1. Unified Login Screen (`/`)
- Displayed first before anything else at `/`.
- Authentic 1986 terminal look: CRT scanline overlay, ambient red/noir glow, typewriter initialization sequence.
- Neutral interface: identical two fields for everyone:
  1. `TEAM NAME`
  2. `TEAM LEADER NAME`
  and an `ENTER PROTOCOL →` button.
- **Matching:** Trimmed and case-insensitive exact matching on both fields.
- **Access Denied:** Screen shakes and displays a red `ACCESS DENIED / UNKNOWN TEAM` error with zero hint about which field was incorrect.

### 2. Post-Login Routing & Route Guards
- **Player Credentials:** Enters the player game (cinematic typewriter intro, then the Hawkins interactive map). Team Name, Leader Name, and Team ID are saved in state, persisted across refreshes in `localStorage`, and displayed in the HUD.
- **Vecna Credentials:** Redirects immediately to `/vecna` (VECNA CONTROL dark-red control room). Shows the logged-in name in the Vecna header, displays all registered teams, and grants access to all tournament controls.
- **Route Guards:**
  - Visiting `/vecna` without a Vecna session redirects to `/` (login screen).
  - Visiting the player game without a player session redirects to `/` (login screen).
  - A logged-in player who types `/vecna` in the address bar is automatically bounced back to `/` (their player game), never seeing Vecna.
  - A logged-in Vecna user who visits `/` is automatically redirected to `/vecna`.
  - The standalone `/leaderboard` page remains publicly accessible.
- **Session Persistence & Logout:**
  - Active session (`role`, `teamName`, `leaderName`, `teamId`) is saved in `localStorage`.
  - Dedicated **LOGOUT** button on both the Player HUD and the Vecna Header clears the session and returns to the login screen.

---

## Credentials Configuration (`lib/config.ts`)

> [!WARNING]
> **SECURITY NOTICE:**
> Credentials defined in client code are visible in the browser JavaScript bundle. This is fine for an in-person event, LAN tournament, or local demonstration. However, for any public internet deployment, move credential verification to the server-side check (e.g., our authenticated Express backend + TiDB Distributed SQL database).

All credentials and game configurations are centralized in [`lib/config.ts`](file:///c:/Users/MUSKAN/Downloads/hawkins-protocol/hawkins-protocol/lib/config.ts):

### How to Add or Edit Player Teams
Edit the `PLAYER_TEAMS` array in [`lib/config.ts`](file:///c:/Users/MUSKAN/Downloads/hawkins-protocol/hawkins-protocol/lib/config.ts):

```typescript
export const PLAYER_TEAMS: PlayerTeamConfig[] = [
  { id: "T01", teamName: "Null Pointers", leaderName: "Aarav Sharma" },
  { id: "T02", teamName: "Stack Smashers", leaderName: "Maya Lin" },
  { id: "T03", teamName: "Rift Runners", leaderName: "Lucas Sinclair" },
  { id: "T04", teamName: "Byte Byters", leaderName: "Dustin Henderson" },
  { id: "T05", teamName: "Shadow Walkers", leaderName: "Mike Wheeler" },
  { id: "T06", teamName: "Hellfire Club", leaderName: "Eddie Munson" },
  { id: "T07", teamName: "Hawkins AV Club", leaderName: "Will Byers" },
  { id: "T08", teamName: "Mind Flayers", leaderName: "Max Mayfield" },
];
```

### How to Edit Vecna Credentials
Edit `VECNA_CREDENTIAL` in [`lib/config.ts`](file:///c:/Users/MUSKAN/Downloads/hawkins-protocol/hawkins-protocol/lib/config.ts):

```typescript
export const VECNA_CREDENTIAL = {
  teamName: "Vecna",
  leaderName: "Henry Creel",
};
```

---

## Demo Credentials Cheatsheet

| Role | Team Name | Leader Name | Destination |
|---|---|---|---|
| **Player (T01)** | `Null Pointers` | `Aarav Sharma` | Player Game (`/`) |
| **Player (T02)** | `Stack Smashers` | `Maya Lin` | Player Game (`/`) |
| **Player (T03)** | `Rift Runners` | `Lucas Sinclair` | Player Game (`/`) |
| **Player (T04)** | `Byte Byters` | `Dustin Henderson` | Player Game (`/`) |
| **Player (T05)** | `Shadow Walkers` | `Mike Wheeler` | Player Game (`/`) |
| **Player (T06)** | `Hellfire Club` | `Eddie Munson` | Player Game (`/`) |
| **Player (T07)** | `Hawkins AV Club` | `Will Byers` | Player Game (`/`) |
| **Player (T08)** | `Mind Flayers` | `Max Mayfield` | Player Game (`/`) |
| **Vecna Control** | `Vecna` | `Henry Creel` | Vecna Control (`/vecna`) |

---

## Vecna Side: Registered Teams Telemetry

The Vecna Control dashboard displays every team configured in `PLAYER_TEAMS`:
- **`● ACTIVE (LIVE DATA)`:** Green badge when the team is logged in and sending live telemetry via `BroadcastChannel` (location, stage, score, time left, radiometer pins).
- **`○ OFFLINE (NOT LOGGED IN)`:** Dim badge when the team has not yet logged in or is not transmitting.
- **Fallback:** If `PLAYER_TEAMS` is empty, fallback simulated teams are displayed.
- **All Controls Active:** The Vecna operator sees all teams and has full controls (no per-operator permissions). Can dispatch sabotages, trigger story transitions (Gate Opening, Upside Down, Will's Signal, Final Showdown), lock/unlock challenges, and award teamwork points.

---

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Or build and start production server
npm run build
npm run start
```

Access the applications:
- **Player Website / Shared Login:** [http://localhost:3000](http://localhost:3000)
- **Organizer Website:** [http://localhost:3000/vecna](http://localhost:3000/vecna)
- **Leaderboard:** [http://localhost:3000/leaderboard](http://localhost:3000/leaderboard)
- **Dev Jump Mode:** Add `?dev=1` to [http://localhost:3000?dev=1](http://localhost:3000?dev=1) for a stage-jump dropdown in the HUD.

---

## Realtime Adapter & Running the Real Event Across Devices

All player <-> Vecna Control messaging flows through `lib/realtime.ts`:
- **`publish(msg: RealtimeMessage)`**: Dispatches events (sabotage, story events, challenge locks, awards, presence).
- **`subscribe(handler)`**: Registers real-time event listeners.
- **`presence(data)`**: Broadcasts 2-second team telemetry heartbeats.

### Default Implementation: HTML5 `BroadcastChannel`
For single-machine demos and testing across multiple browser tabs or windows on the same origin, the native `BroadcastChannel` API (`hawkins-protocol`) requires zero setup, zero external dependencies, and delivers zero-latency instant messaging.

### Running the Real Event Across Devices
In a physical live event or tournament where players and organizers operate on **separate laptops/machines**, multi-laptop synchronization is handled automatically by the **Socket.io engine on port 5000** backed by **TiDB Distributed SQL**.

#### TiDB Database Configuration & Schema
1. Configure your TiDB Cloud Serverless or local instance credentials in `backend/.env`:
   ```bash
   TIDB_HOST=127.0.0.1
   TIDB_PORT=4000
   TIDB_USER=root
   TIDB_PASSWORD=
   TIDB_DATABASE=stranger_thinks
   TIDB_SSL=false
   ```
   Or use a unified connection URL:
   ```bash
   TIDB_DATABASE_URL=mysql://<user>:<password>@<host>:4000/stranger_thinks?ssl={"rejectUnauthorized":true}
   ```
2. Run database migration & seeding:
   ```bash
   cd backend
   npm run db:init
   ```
3. Start the secure backend:
   ```bash
   npm run dev
   ```

#### Option B: Firebase Realtime Database
1. Run: `npm install firebase`
2. Create a Firebase project at [https://console.firebase.google.com](https://console.firebase.google.com)
3. In `lib/realtime.ts`, activate the Firebase stub:
```typescript
import { initializeApp } from "firebase/app";
import { getDatabase, ref, push, onChildAdded } from "firebase/database";
const app = initializeApp({ databaseURL: "https://XYZ.firebaseio.com" });
const db = getDatabase(app);
const eventsRef = ref(db, "events");

onChildAdded(eventsRef, (snapshot) => {
  subscribers.forEach((fn) => fn(snapshot.val()));
});

function publishToExternalBackend(msg) {
  push(eventsRef, msg);
}
```

---

## 7 Task Engines & Locations

| # | Task Type | In-World Object | Location | Component | Story Progression Result |
|---|-----------|-----------------|----------|-----------|---------------------------|
| 1 | **QUIZ** | Hawkins Police File Case 86-04 (Paperclip, stamps, redaction bars) | Police Station | `components/tasks/QuizTask.tsx` | Uncovers suppressed electromagnetic spike logs |
| 2 | **CONNECTION** | Christmas Lights Alphabet Wall (Animated glowing SVG cables) | Byers House | `components/tasks/ConnectionTask.tsx` | Establishes communication ("RIGHT HERE / RUN") |
| 3 | **REARRANGE** | Will's Scrambled Notes (Draggable tiles with keyboard/touch support) | Byers House / Upside Down | `components/tasks/RearrangeTask.tsx` | Restores message ("DO NOT OPEN THE GATE") |
| 4 | **CASE STUDY** | Hawkins Incident Report Board (Pinnable evidence cards) | Police Station | `components/tasks/CaseStudyTask.tsx` | Triangulates transmission epicenter to Radio Tower |
| 5 | **SERIES** | Repeater Beacon Frequency Blips (Pulsing radar blip visualizer) | Radio Tower / Forest | `components/tasks/SeriesTask.tsx` | Yields Sublevel Room 32 coordinate & Forest 4-1-7 |
| 6 | **RADIO** | VLF Radio Station (87.6 MHz tuning dial, proximity static fade, Morse helper) | Town Square / Radio Tower | `components/tasks/RadioTask.tsx` | Decodes distress transmission ("HELP WILL") |
| 7 | **LAB TASK** | Virtual Lab Terminal (Power, Security, Comms, Gate gauges + code editor) | Hawkins Lab Sublevel 4 | `components/tasks/LabTerminalTask.tsx` | Bypasses security & releases Key Fragment β |

---

## The 5-Pin Radiometer (Radio Tower)

Located at the **East Hill Radio Tower** (`components/Radiometer.tsx`):
- Features an interactive arched instrument with an animated phosphor oscilloscope canvas, tuning needle jitter, rotating inner dial, and 5 readout windows.
- The 5 pins correspond to 5 in-world sub-tasks solvable in any order:
  1. `Tuning Dial` (87.6 MHz + Morse `---..` -> Digit `8`)
  2. `Series Panel` (Powers of two `2, 4, 8, 16, ?` -> Digit `3`)
  3. `Wire Patch Bay` (Color cord patch routing -> Digit `4`)
  4. `Scrambled Log` (Tile sequence rebuilding -> Digit `7`)
  5. `Debug Terminal` (Odd-number code accumulator -> Digit `9`)
- **Keypad Unlock:** Once all 5 pins are restored, the player types the 5-digit code (`83479`) at the physical keypad to unlock the Hawkins Lab security door.

---

## 6-Component Weighted Scoring

Scoring weights adhere strictly to tournament parameters in `lib/config.ts`:
- **Technical & Coding:** 30%
- **Puzzle Solving:** 20%
- **Speed Bonus:** 15%
- **Clue Discovery:** 15%
- **Story Progress:** 10%
- **Teamwork Award:** 10% (Allocated live by organizers via `/vecna`)

---

## Production Architecture Notes

- **Client-Side Validation Notice:** All story tasks, ciphers, and codes in `lib/tasks.ts`, `lib/stages.ts`, and `lib/radiometer.ts` use client-side regular expressions for rapid prototyping and tournament simulation. In production, answer verification and key granting should transition to authenticated server-side API routes.
- **Real-Time Synchronization:** Managed through `lib/realtime.ts`. BroadcastChannel default allows multi-tab operation; cloud backend stubs enable multi-device tournaments across separate laptops.
