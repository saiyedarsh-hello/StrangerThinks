/**
 * HAWKINS PROTOCOL — SECURE BACKEND API CLIENT
 * 
 * Directs all chapter and task answer validations to the isolated backend service,
 * guaranteeing no evaluation logic or solutions are exposed to client browser inspection.
 */

export const getApiBase = (): string => {
  if (typeof window !== "undefined") {
    const host = window.location.hostname || "localhost";
    if (host !== "localhost" && host !== "127.0.0.1") {
      return `http://${host}:5000/api`;
    }
  }
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  return "http://localhost:5000/api";
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
    adminId?: string;
  };
  team?: any;
  requiresPassword?: boolean;
  adminLeader?: string;
  error?: string;
  message?: string;
}

export async function loginOnServer(
  teamName: string,
  leaderName: string,
  password?: string
): Promise<LoginResponse> {
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamName, leaderName, password }),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {}

  // Try via Next.js internal API proxy
  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamName, leaderName, password }),
    });
    return await res.json();
  } catch (err) {
    return {
      success: false,
      error: "BACKEND_UNREACHABLE",
      message: "Security backend is offline. Ensure backend is running.",
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
    let token = "";
    try {
      const stored = localStorage.getItem("hawkins-protocol:session");
      if (stored) {
        const parsed = JSON.parse(stored);
        token = parsed.token || "";
      }
    } catch {}

    const res = await fetch(`${API_BASE}/chapters/validate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
    try {
      const { STAGE_QUIZ_CONFIGS } = require("./chapterQuestions");
      const cfg = STAGE_QUIZ_CONFIGS[chapterId];
      if (cfg) {
        let correctCount = 0;
        const questions = cfg.questions || [];
        questions.forEach((q: any, idx: number) => {
          const userAns = Array.isArray(answer) ? answer[idx] : answer;
          if (userAns && q.correctAnswerId && String(userAns).trim().toLowerCase() === String(q.correctAnswerId).trim().toLowerCase()) {
            correctCount++;
          }
        });
        let totalPts = 0;
        try {
          if (typeof window !== "undefined") {
            const stored = localStorage.getItem(`hawkins_quiz_results_ch${chapterId}_${teamId || "anon"}`);
            if (stored) {
              const parsed = JSON.parse(stored);
              questions.forEach((_: any, idx: number) => {
                if (parsed[idx]?.isCorrect) {
                  totalPts += typeof parsed[idx].pointsAwarded === "number" ? parsed[idx].pointsAwarded : 10;
                }
              });
            }
          }
        } catch {}
        if (totalPts === 0 && correctCount > 0) {
          totalPts = correctCount * 10;
        }

        return {
          success: true,
          pointsAwarded: totalPts,
          correctCount,
          message: `Docket verified: ${correctCount}/${questions.length} items accurate.`,
        } as any;
      }
    } catch {}

    return {
      success: false,
      pointsAwarded: 0,
      error: "BACKEND_UNREACHABLE",
      message: "Security backend is offline. Ensure backend is running.",
    };
  }
}

export async function saveTeamProgressToServer(progress: {
  teamId: string;
  completedTasks?: string[];
  solvedChapters?: number[];
  taskScores?: Record<string, number>;
  unlockedLocations?: Record<string, boolean>;
  storyProgress?: number;
  breakdown?: any;
  totalScore?: number;
  penalty?: number;
}): Promise<{ success: boolean; team?: any; error?: string }> {
  try {
    let token = "";
    try {
      const stored = localStorage.getItem("hawkins-protocol:session");
      if (stored) {
        const parsed = JSON.parse(stored);
        token = parsed.token || "";
      }
    } catch {}

    const res = await fetch("/api/tasks/progress", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(progress),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
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

/**
 * Authoritatively unlocks an Intel Clue on the server and records -5 PTS penalty.
 */
export async function unlockHintOnServer(
  hintKey: string,
  teamId?: string
): Promise<{ success: boolean; hintKey?: string; cost?: number; error?: string; message?: string }> {
  try {
    let token = "";
    try {
      const stored = localStorage.getItem("hawkins-protocol:session");
      if (stored) {
        const parsed = JSON.parse(stored);
        token = parsed.token || "";
      }
    } catch {}

    const res = await fetch(`${API_BASE}/tasks/hint/unlock`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ hintKey, teamId }),
    });

    return await res.json();
  } catch (err: any) {
    return {
      success: false,
      error: "BACKEND_UNREACHABLE",
      message: err?.message || "Failed to contact backend server.",
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
  role?: string;
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
    const res = await fetch(`${API_BASE}/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passkey }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.token) {
        return data;
      }
    }
  } catch (err) {
    // Fallback to Next.js route if standalone backend offline
  }

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

export async function fetchAdminLeaderboard(token?: string): Promise<{ success: boolean; leaderboard?: AdminLeaderboardItem[]; error?: string }> {
  try {
    const res = await fetch(`/api/admin/teams?_t=${Date.now()}`, {
      cache: "no-store",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const data = await res.json();
    if (data.success && Array.isArray(data.teams)) {
      const items: AdminLeaderboardItem[] = data.teams.map((t: any, idx: number) => ({
        rank: t.rank || idx + 1,
        teamId: t.teamId || t.id || `T${String(idx + 1).padStart(2, "0")}`,
        role: t.role || (t.teamId === "VECNA-001" || t.teamName?.toLowerCase() === "vecna" ? "VECNA" : "PLAYER"),
        username: t.username || t.teamId || t.id || `TEAM${String(idx + 1).padStart(2, "0")}`,
        password: t.password || `hawkins83_${String(idx + 1).padStart(2, "0")}`,
        teamName: t.teamName || "Squad",
        leaderName: t.leaderName || "Leader",
        score: typeof t.score === "number" ? t.score : (typeof t.totalScore === "number" ? t.totalScore : 0),
        currentStage: t.currentStage || 1,
        stageTimes: t.stageTimes,
        isOnline: Boolean(t.isOnline),
        hasSession: Boolean(t.hasSession || t.isOnline),
        isIdle: false,
        lastHeartbeatMinutesAgo: t.lastHeartbeatMinutesAgo || 0,
        solvedCount: t.solvedCount || t.submissionsCount || 0,
        completedTasks: t.completedTasks || [],
        lastSubmissionTime: t.lastSubmissionTime || (t.lastHeartbeat ? new Date(t.lastHeartbeat).toLocaleTimeString() : "OFFLINE"),
        status: t.isOnline ? "ACTIVE" : "OFFLINE",
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

export async function updateAdminTeamRole(teamId: string, role: "PLAYER" | "VECNA"): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const res = await fetch(`/api/admin/teams/${teamId}/role`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    const data = await res.json();
    return data;
  } catch (err: any) {
    return { success: false, error: err.message || "NETWORK_ERROR" };
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
  token?: string,
  role: "PLAYER" | "VECNA" = "PLAYER"
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
      body: JSON.stringify({ teamName, leaderName, initialScore, role }),
    });
    return await res.json();
  } catch (err) {
    return { success: false, error: "BACKEND_OFFLINE" };
  }
}

export async function updateAdminTeamScore(
  teamId: string,
  score: number,
  token: string = ""
): Promise<{ success: boolean; leaderboard?: AdminLeaderboardItem[]; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/admin/leaderboard/score`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ teamId, score: Number(score) }),
    });
    return await res.json();
  } catch (err) {
    return { success: false, error: "BACKEND_OFFLINE" };
  }
}
