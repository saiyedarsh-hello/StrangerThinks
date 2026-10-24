/**
 * THE HAWKINS PROTOCOL - GAME & CREDENTIAL CONFIGURATION
 * 
 * SECURITY NOTICE:
 * Credentials in client code are visible in the browser bundle; fine for an event / LAN
 * tournament, but move to a server check (authenticated API / backend database) before any public use.
 * 
 * HOW TO ADD OR EDIT TEAMS:
 * Add, edit, or remove objects in PLAYER_TEAMS below.
 * Each team requires:
 *   - id: Unique team ID string (e.g. "T01")
 *   - teamName: Case-insensitive exact match required at login
 *   - leaderName: Case-insensitive exact match required at login
 * 
 * HOW TO EDIT VECNA CREDENTIALS:
 * Edit VECNA_CREDENTIAL below. Shared by the whole Vecna team to access /vecna.
 */

export interface PlayerTeamConfig {
  id: string;
  teamName: string;
  leaderName: string;
}

/**
 * REGISTERED PLAYER TEAMS
 * Only these exact (teamName, leaderName) pairs can log in as a player.
 */
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

/**
 * VECNA CREDENTIAL
 * Shared login for the Vecna tournament operations team.
 */
export const VECNA_CREDENTIAL = {
  teamName: "Vecna",
  leaderName: "Henry Creel",
};

export type OperatorRole = "ADMIN" | "VECNA" | "OBSERVER";

export interface Operator {
  id: string;
  name: string;
  role: OperatorRole;
  passcode: string;
}

export const OPERATORS: Operator[] = [
  {
    id: "op-vecna",
    name: "Henry Creel",
    role: "ADMIN",
    passcode: "HAWKINS1986",
  },
];

export interface AuthSession {
  role: "PLAYER" | "VECNA" | "ADMIN";
  teamName: string;
  leaderName: string;
  teamId?: string;
  adminId?: string;
  token?: string;
}

export const SESSION_KEY = "hawkins-protocol:session";

export function getStoredSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

export function saveSession(session: AuthSession): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {}
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem("hawkins-protocol:operator");
  } catch {}
}

export function authenticateCredentials(
  teamNameInput: string,
  leaderNameInput: string
): { success: true; session: AuthSession } | { success: false } {
  const normTeam = teamNameInput.trim().toLowerCase();
  const normLeader = leaderNameInput.trim().toLowerCase();

  if (!normTeam || !normLeader) {
    return { success: false };
  }

  // 1. Check Vecna credential
  if (
    normTeam === VECNA_CREDENTIAL.teamName.trim().toLowerCase() &&
    normLeader === VECNA_CREDENTIAL.leaderName.trim().toLowerCase()
  ) {
    return {
      success: true,
      session: {
        role: "VECNA",
        teamName: VECNA_CREDENTIAL.teamName,
        leaderName: VECNA_CREDENTIAL.leaderName,
        teamId: "VECNA-001",
      },
    };
  }

  // 2. Check Player credentials
  const match = PLAYER_TEAMS.find(
    (t) =>
      t.teamName.trim().toLowerCase() === normTeam &&
      t.leaderName.trim().toLowerCase() === normLeader
  );

  if (match) {
    return {
      success: true,
      session: {
        role: "PLAYER",
        teamName: match.teamName,
        leaderName: match.leaderName,
        teamId: match.id,
      },
    };
  }

  return { success: false };
}

export const CONFIG = {
  // Game timer in seconds (90 minutes)
  TOTAL_GAME_TIME: 90 * 60,

  // Scoring Weights
  WEIGHTS: {
    tech: 0.30,      // 30% Technical / Coding
    puzzle: 0.20,    // 20% Puzzle solving
    speed: 0.15,     // 15% Speed
    clue: 0.15,      // 15% Clue discovery
    story: 0.10,     // 10% Story progress
    teamwork: 0.10,  // 10% Teamwork (awarded by organizers)
  },

  // BroadcastChannel network channel name
  BROADCAST_CHANNEL: "hawkins-protocol",

  // Storage key
  STORAGE_KEY: "hawkins-protocol:v2",
};

