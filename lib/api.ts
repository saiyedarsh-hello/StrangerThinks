/**
 * HAWKINS PROTOCOL — SECURE BACKEND API CLIENT
 * 
 * Directs all authentication, chapter questions, task validations,
 * radiometer calibrations, and admin operations to the isolated Express backend.
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
  speedBonus?: number;
  correctCount?: number;
  totalCount?: number;
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

/**
 * Authenticates team credentials against the server
 */
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
 * Validates a candidate answer for a chapter on the server (single choice, full docket answers map, or cipher).
 */
export async function validateChapterOnServer(
  chapterId: number,
  taskId: string,
  answer: string | Record<number, string> | string[],
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
 * Validates an interactive story task on the server
 */
export async function validateTaskOnServer(
  taskId: string,
  answer: string,
  teamId?: string
): Promise<BackendValidationResult> {
  try {
    const res = await fetch(`${API_BASE}/tasks/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId, answer, teamId }),
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
 * Unlocks a classified hint on the server
 */
export async function unlockHintOnServer(
  hintKey: string,
  cost = 10,
  teamId?: string
): Promise<{ success: boolean; hintKey: string; cost: number; message?: string }> {
  try {
    const res = await fetch(`${API_BASE}/tasks/hint/unlock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hintKey, cost, teamId }),
    });
    return await res.json();
  } catch (err) {
    return {
      success: false,
      hintKey,
      cost,
    };
  }
}

/**
 * Validates a radiometer pin calibration on the server.
 */
export async function validateRadiometerPinOnServer(
  pinIndex: number,
  answer: any,
  teamId?: string
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
        teamId,
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
export async function validateMasterKeypadOnServer(code: string, teamId?: string): Promise<BackendValidationResult> {
  try {
    const res = await fetch(`${API_BASE}/radiometer/validate-keypad`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ code, teamId }),
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
  teamName: string;
  leaderName: string;
  score: number;
  solvedCount: number;
  completedTasks: string[];
  lastSubmissionTime: string;
  status: "ACTIVE" | "COMPLETED" | "DISQUALIFIED" | "IDLE";
}

export async function adminLogin(passkey: string): Promise<{ success: boolean; token?: string; error?: string; message?: string }> {
  try {
    const res = await fetch(`${API_BASE}/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passkey }),
    });
    return await res.json();
  } catch (err) {
    return { success: false, error: "BACKEND_OFFLINE", message: "Security backend is offline. Ensure it is running on port 5000." };
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
    const res = await fetch(`${API_BASE}/leaderboard`, {
      headers: token ? { "Authorization": `Bearer ${token}` } : {},
    });
    return await res.json();
  } catch (err) {
    return { success: false, error: "BACKEND_OFFLINE" };
  }
}

export async function createAdminTeam(
  teamName: string,
  leaderName: string,
  initialScore = 0,
  token?: string
): Promise<{ success: boolean; team?: any; error?: string; message?: string }> {
  try {
    const res = await fetch(`${API_BASE}/admin/teams`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "Authorization": `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ teamName, leaderName, initialScore }),
    });
    return await res.json();
  } catch (err) {
    return { success: false, error: "BACKEND_OFFLINE" };
  }
}
