/**
 * HAWKINS PROTOCOL — SECURE BACKEND API CLIENT
 * 
 * Directs all chapter and task answer validations to the isolated backend service,
 * guaranteeing no evaluation logic or solutions are exposed to client browser inspection.
 */

export const getApiBase = (): string => {
  if (typeof window !== "undefined") {
    const host = window.location.hostname || "localhost";
    return `http://${host}:5000/api`;
  }
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
};

export const API_BASE = {
  toString(): string {
    return getApiBase();
  },
};

export interface BackendValidationResult {
  success: boolean;
  pointsAwarded: number;
  message?: string;
  error?: string;
  completionLore?: {
    title: string;
    text: string;
    lines: string[];
  };
}

export interface PinValidationResult {
  success: boolean;
  pinIndex?: number;
  digit?: string;
  label?: string;
  pointsAwarded?: number;
  error?: string;
  message?: string;
}

export interface LoginResponse {
  success: boolean;
  token?: string;
  session?: {
    teamId: string;
    teamName: string;
    leaderName: string;
    role: "PLAYER" | "VECNA" | "ADMIN";
  };
  team?: any;
  error?: string;
  message?: string;
}

export async function loginOnServer(
  teamName: string,
  leaderName: string
): Promise<LoginResponse> {
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamName, leaderName }),
    });
    return await res.json();
  } catch (err) {
    return {
      success: false,
      error: "BACKEND_UNREACHABLE",
      message: "Security backend is offline. Ensure backend is running on port 5000.",
    };
  }
}

/**
 * Validates a candidate answer for a chapter on the server.
 */
export async function validateChapterOnServer(
  chapterId: number,
  taskId: string,
  answer: string | string[],
  teamId?: string
): Promise<BackendValidationResult> {
  try {
    const res = await fetch(`${API_BASE}/chapters/validate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chapterId,
        taskId,
        answer,
        teamId,
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return {
        success: false,
        pointsAwarded: 0,
        error: errData.error || "HTTP_ERROR",
        message: errData.message || `Server responded with status ${res.status}`,
      };
    }

    return await res.json();
  } catch (err: any) {
    console.warn("[BACKEND OFFLINE] Could not reach security backend on", API_BASE, err);
    return {
      success: false,
      pointsAwarded: 0,
      error: "BACKEND_UNREACHABLE",
      message: "Security backend is offline. Ensure backend is running on port 5000.",
    };
  }
}

/**
 * Validates a radiometer pin calibration on the server.
 */
export async function validateRadiometerPinOnServer(
  pinIndex: number,
  answer: any
): Promise<PinValidationResult> {
  try {
    const res = await fetch(`${API_BASE}/radiometer/validate-pin`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        pinIndex,
        answer,
      }),
    });

    return await res.json();
  } catch (err) {
    return {
      success: false,
      error: "BACKEND_UNREACHABLE",
    };
  }
}

/**
 * Validates the 5-digit master keypad access cipher on the server.
 */
export async function validateMasterKeypadOnServer(code: string): Promise<BackendValidationResult> {
  try {
    const res = await fetch(`${API_BASE}/radiometer/validate-keypad`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ code }),
    });

    return await res.json();
  } catch (err) {
    return {
      success: false,
      pointsAwarded: 0,
      error: "BACKEND_UNREACHABLE",
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Admin Control API Clients
// ─────────────────────────────────────────────────────────────────────────────

export interface AdminChapterData {
  id: number;
  label: string;
  tag: string;
  archiveSector: string;
  archiveTitle: string;
  archiveSubtitle: string;
  archiveLines: string[];
  bgSrc: string;
  taskId: string;
  points: number;
  questionPrompt?: string;
  options?: Array<{ id: string; text: string }>;
  codeSnippet?: string;
  initialTiles?: string[];
  type: string;
  correctAnswer: string;
  completionLoreTitle?: string;
  completionLoreText?: string;
  completionLines?: string[];
}

export interface AdminLeaderboardItem {
  rank: number;
  teamId: string;
  username?: string;
  password?: string;
  teamName: string;
  leaderName: string;
  score: number;
  currentStage?: number;
  stageTimes?: Record<string, number>;
  isOnline?: boolean;
  hasSession?: boolean;
  isIdle?: boolean;
  lastHeartbeatMinutesAgo?: number | null;
  solvedCount: number;
  completedTasks: string[];
  lastSubmissionTime: string;
  status: "ACTIVE" | "COMPLETED" | "IDLE" | "OFFLINE";
}

export async function adminLogin(passkey: string): Promise<{ success: boolean; token?: string; error?: string; message?: string }> {
  try {
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passkey }),
    });
    return await res.json();
  } catch (err) {
    return { success: false, error: "SERVER_OFFLINE", message: "Mainframe unreachable." };
  }
}

export async function fetchAdminChapters(token: string): Promise<{ success: boolean; chapters?: AdminChapterData[]; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/admin/chapters`, {
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });
    return await res.json();
  } catch (err) {
    return { success: false, error: "BACKEND_OFFLINE" };
  }
}

export async function updateAdminChapter(
  id: number,
  data: Partial<AdminChapterData>,
  token: string
): Promise<{ success: boolean; chapter?: AdminChapterData; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/admin/chapters/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    return await res.json();
  } catch (err) {
    return { success: false, error: "BACKEND_OFFLINE" };
  }
}

export async function deleteAdminChapter(id: number, token: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/admin/chapters/${id}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });
    return await res.json();
  } catch (err) {
    return { success: false, error: "BACKEND_OFFLINE" };
  }
}

export async function resetAdminChapters(token: string): Promise<{ success: boolean; chapters?: AdminChapterData[]; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/admin/chapters/reset`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });
    return await res.json();
  } catch (err) {
    return { success: false, error: "BACKEND_OFFLINE" };
  }
}

export async function fetchAdminLeaderboard(_token?: string): Promise<{ success: boolean; leaderboard?: AdminLeaderboardItem[]; error?: string }> {
  try {
    const res = await fetch("/api/admin/teams");
    const data = await res.json();
    if (data.success && Array.isArray(data.teams)) {
      const items: AdminLeaderboardItem[] = data.teams.map((t: any) => ({
        rank: t.rank,
        teamId: t.teamId,
        username: t.username,
        password: t.password,
        teamName: t.teamName,
        leaderName: t.leaderName,
        score: t.score,
        currentStage: t.currentStage,
        stageTimes: t.stageTimes,
        isOnline: t.isOnline,
        hasSession: t.hasSession,
        isIdle: t.isIdle,
        lastHeartbeatMinutesAgo: t.lastHeartbeatMinutesAgo,
        solvedCount: t.submissionsCount || 0,
        completedTasks: [],
        lastSubmissionTime: t.lastHeartbeat ? new Date(t.lastHeartbeat).toLocaleTimeString() : "OFFLINE",
        status: t.isOnline ? "ACTIVE" : (t.hasSession ? "IDLE" : "OFFLINE"),
      }));
      return { success: true, leaderboard: items };
    }
    return { success: false, error: data.error || "FETCH_FAILED" };
  } catch (err) {
    return { success: false, error: "SERVER_OFFLINE" };
  }
}

export async function forceLogoutTeam(teamId: string): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await fetch("/api/admin/teams/force-logout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId }),
    });
    return await res.json();
  } catch (err) {
    return { success: false };
  }
}

export async function resetAllSessions(): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await fetch("/api/admin/teams/reset-all-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    return await res.json();
  } catch (err) {
    return { success: false };
  }
}

export async function importTeamsFromCsvOrJson(payload: { csv?: string; teams?: any[] }): Promise<{ success: boolean; message?: string; importedCount?: number }> {
  try {
    const res = await fetch("/api/admin/teams/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (err) {
    return { success: false };
  }
}

export async function createAdminTeam(
  teamName: string,
  leaderName: string,
  initialScore = 0,
  token?: string
): Promise<{ success: boolean; team?: any; error?: string; message?: string }> {
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers.Authorization = "Bearer " + token;
    }

    const res = await fetch(`${API_BASE}/admin/teams`, {
      method: "POST",
      headers,
      body: JSON.stringify({ teamName, leaderName, initialScore }),
    });
    return await res.json();
  } catch (err) {
    return { success: false, error: "BACKEND_OFFLINE" };
  }
}

export async function updateAdminTeamScore(
  teamId: string,
  score: number,
  token: string = "HAWKINS_CHIEF_1983"
): Promise<{ success: boolean; leaderboard?: AdminLeaderboardItem[]; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/admin/leaderboard/score`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ teamId, score: Number(score) }),
    });
    return await res.json();
  } catch (err) {
    return { success: false, error: "BACKEND_OFFLINE" };
  }
}
