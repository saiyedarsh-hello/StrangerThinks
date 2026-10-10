/**
 * HAWKINS PROTOCOL — TIDB & SECURITY MAINFRAME SERVICE LAYER
 * 
 * Directs all authentication, real-time leaderboard, chapter queries,
 * and admin operations to the TiDB-backed Hawkins Security Mainframe.
 */

import {
  API_BASE,
  AdminChapterData,
  AdminLeaderboardItem,
  fetchAdminLeaderboard,
  fetchAdminChapters,
  updateAdminChapter,
  deleteAdminChapter,
  createAdminTeam,
  loginOnServer,
} from "@/lib/api";
import { getSocket } from "@/lib/realtime";

export interface TiDBAuthResult {
  success: boolean;
  session?: {
    role: "PLAYER" | "VECNA";
    teamName: string;
    leaderName: string;
    teamId: string;
  };
  token?: string;
  source?: "tidb" | "backend" | "canon";
  error?: string;
}

// Canon fallback teams when offline or initializing
const CANON_FALLBACK_TEAMS = [
  { id: "T01", teamName: "Null Pointers", leaderName: "Aarav Sharma" },
  { id: "T02", teamName: "Stack Smashers", leaderName: "Maya Lin" },
  { id: "T03", teamName: "Rift Runners", leaderName: "Lucas Sinclair" },
  { id: "T04", teamName: "Byte Byters", leaderName: "Dustin Henderson" },
  { id: "T05", teamName: "Shadow Walkers", leaderName: "Mike Wheeler" },
  { id: "T06", teamName: "Hellfire Club", leaderName: "Eddie Munson" },
  { id: "T07", teamName: "Hawkins AV Club", leaderName: "Will Byers" },
  { id: "T08", teamName: "Mind Flayers", leaderName: "Max Mayfield" },
  { id: "TEAM-AV-CLUB", teamName: "Hawkins AV Club", leaderName: "Dustin Henderson" },
  { id: "TEAM-HELLFIRE", teamName: "The Hellfire Club", leaderName: "Eddie Munson" },
  { id: "TEAM-SCOOPS", teamName: "Scoops Troop", leaderName: "Robin Buckley" },
  { id: "TEAM-THE-PARTY", teamName: "The Party (Paladins)", leaderName: "Mike Wheeler" },
];

/**
 * Fetch live leaderboard standings from the TiDB backend
 */
export async function getTiDBLeaderboard(token?: string): Promise<{
  success: boolean;
  leaderboard: AdminLeaderboardItem[];
  error?: string;
}> {
  try {
    if (token) {
      const res = await fetchAdminLeaderboard(token);
      if (res.success && res.leaderboard) {
        return { success: true, leaderboard: res.leaderboard };
      }
    }

    // Public leaderboard endpoint
    const res = await fetch(`${API_BASE}/leaderboard`, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.leaderboard) {
        return { success: true, leaderboard: data.leaderboard };
      }
    }
    throw new Error("Backend leaderboard query returned empty or unready");
  } catch (err: any) {
    console.warn("[TIDB SERVICE] Leaderboard fetch fallback:", err.message);
    // Construct local fallback leaderboard
    const fallback: AdminLeaderboardItem[] = CANON_FALLBACK_TEAMS.slice(0, 8).map((t, idx) => ({
      rank: idx + 1,
      teamId: t.id,
      teamName: t.teamName,
      leaderName: t.leaderName,
      score: 0,
      solvedCount: 0,
      completedTasks: [],
      lastSubmissionTime: new Date().toISOString(),
      status: "ACTIVE",
    }));
    return { success: true, leaderboard: fallback };
  }
}

/**
 * Fetch all chapters, questions, and options from TiDB vault
 */
export async function getTiDBChapters(token?: string): Promise<{
  success: boolean;
  chapters: AdminChapterData[];
  error?: string;
}> {
  try {
    if (token) {
      const res = await fetchAdminChapters(token);
      if (res.success && res.chapters) {
        return { success: true, chapters: res.chapters };
      }
    }

    const res = await fetch(`${API_BASE}/chapters`, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.chapters) {
        const chapters: AdminChapterData[] = data.chapters.map((c: any) => ({
          id: c.id,
          label: c.label,
          tag: c.tag,
          archiveSector: c.archiveSector,
          archiveTitle: c.archiveTitle,
          archiveSubtitle: c.archiveSubtitle || "",
          archiveLines: c.archiveLines || [],
          bgSrc: c.bgSrc || "/images/bg.jpg",
          taskId: c.taskId,
          points: c.points || 100,
          questionPrompt: c.questions?.[0]?.question || c.archiveSubtitle,
          options: c.questions?.[0]?.options || [],
          type: "CHOICE",
          correctAnswer: "PROTECTED_SERVER_SIDE",
          completionLoreTitle: c.completionLoreTitle,
          completionLoreText: c.completionLoreText,
          completionLines: c.completionLines,
        }));
        return { success: true, chapters };
      }
    }
    throw new Error("Backend chapters query failed");
  } catch (err: any) {
    console.warn("[TIDB SERVICE] Chapters query fallback:", err.message);
    return { success: true, chapters: [] };
  }
}

/**
 * Update chapter in TiDB vault
 */
export async function updateTiDBChapter(
  chapterId: number,
  payload: Partial<AdminChapterData>,
  token?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (token) {
      const res = await updateAdminChapter(chapterId, payload, token);
      return { success: res.success, error: res.error };
    }

    const res = await fetch(`${API_BASE}/admin/chapters/${chapterId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    return { success: data.success, error: data.error };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Delete / deactivate chapter in TiDB
 */
export async function deleteTiDBChapter(
  chapterId: number,
  token?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (token) {
      const res = await deleteAdminChapter(chapterId, token);
      return { success: res.success, error: res.error };
    }

    const res = await fetch(`${API_BASE}/admin/chapters/${chapterId}`, {
      method: "DELETE",
    });
    const data = await res.json();
    return { success: data.success, error: data.error };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Subscribe to real-time changes on leaderboard via Socket.io
 */
export function subscribeToTiDBLeaderboard(onUpdate: (data?: any) => void): () => void {
  try {
    const socket = getSocket();
    if (socket) {
      const handler = (data: any) => onUpdate(data);
      socket.on("leaderboard:update", handler);
      return () => {
        socket.off("leaderboard:update", handler);
      };
    }
  } catch (e) {
    console.warn("[TIDB REALTIME] Socket subscription unavailable:", e);
  }
  return () => {};
}

/**
 * Authenticate team credentials against TiDB Security Mainframe
 */
export async function authenticateTeamWithTiDB(
  teamNameInput: string,
  leaderNameInput: string
): Promise<TiDBAuthResult> {
  const normTeam = teamNameInput.trim().toLowerCase();
  const normLeader = leaderNameInput.trim().toLowerCase();

  if (!normTeam || !normLeader) {
    return { success: false, error: "Team name and squad leader are required." };
  }

  // 1. Try server-side authentication (TiDB + JWT)
  try {
    const res = await loginOnServer(teamNameInput, leaderNameInput);
    if (res.success && res.session) {
      const role: "PLAYER" | "VECNA" = res.session.role === "VECNA" ? "VECNA" : "PLAYER";
      return {
        success: true,
        session: {
          role,
          teamName: res.session.teamName,
          leaderName: res.session.leaderName,
          teamId: res.session.teamId,
        },
        token: res.token,
        source: "tidb",
      };
    }
  } catch (err) {
    console.warn("[TIDB AUTH] Server unreachable, attempting local canon check:", err);
  }

  // 2. Vecna Game Character Credentials
  if (normTeam === "vecna" && (normLeader === "henry creel" || normLeader === "vecna" || normLeader === "001")) {
    return {
      success: true,
      session: {
        role: "VECNA",
        teamName: "Vecna",
        leaderName: "Henry Creel",
        teamId: "VECNA-001",
      },
      source: "canon",
    };
  }

  // 3. Fallback to Canon Player Teams
  const canonMatch = CANON_FALLBACK_TEAMS.find(
    (t) =>
      t.teamName.trim().toLowerCase() === normTeam &&
      t.leaderName.trim().toLowerCase() === normLeader
  );

  if (canonMatch) {
    return {
      success: true,
      session: {
        role: "PLAYER",
        teamName: canonMatch.teamName,
        leaderName: canonMatch.leaderName,
        teamId: canonMatch.id,
      },
      source: "canon",
    };
  }

  return { success: false, error: "Unrecognized squad credentials. Confirm team and leader name." };
}

/**
 * Register a new squad in TiDB
 */
export async function registerTeamInTiDB(
  teamName: string,
  leaderName: string,
  initialScore: number = 0,
  token?: string
): Promise<{ success: boolean; team?: any; error?: string }> {
  try {
    if (token) {
      const res = await createAdminTeam(teamName, leaderName, initialScore, token);
      return { success: res.success, team: res.team, error: res.error };
    }

    const res = await fetch(`${API_BASE}/admin/teams`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamName, leaderName, initialScore }),
    });
    const data = await res.json();
    return { success: data.success, team: data.team, error: data.error };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
