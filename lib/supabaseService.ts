/**
 * HAWKINS PROTOCOL — SUPABASE DIRECT SERVICE LAYER
 * 
 * Provides direct connection to Supabase PostgreSQL database for:
 * - Real-time Live Leaderboard (Teams, Scores, Solves)
 * - Questions & Chapters Vault Configuration
 * - Real-time subscriptions for live tournament updates
 */

import { createClient } from "@/utils/supabase/client";
import { AdminChapterData, AdminLeaderboardItem } from "@/lib/api";

const supabase = createClient();

/**
 * Fetch live leaderboard standings directly from Supabase
 */
export async function getSupabaseLeaderboard(): Promise<{ success: boolean; leaderboard: AdminLeaderboardItem[]; error?: string }> {
  try {
    // Query teams joined with their solves
    const { data: teamsData, error: teamsError } = await supabase
      .from("teams")
      .select("*, chapter_solves(*)")
      .order("total_score", { ascending: false })
      .order("last_solved_at", { ascending: true, nullsFirst: false });

    if (teamsError) {
      console.warn("[SUPABASE] Teams query error:", teamsError.message);
      return { success: false, leaderboard: [], error: teamsError.message };
    }

    if (!teamsData || teamsData.length === 0) {
      return { success: true, leaderboard: [] };
    }

    const leaderboard: AdminLeaderboardItem[] = teamsData.map((t: any, index: number) => {
      const solvedList = Array.isArray(t.chapter_solves) ? t.chapter_solves.map((s: any) => `ch${s.chapter_id}`) : [];
      return {
        rank: index + 1,
        teamId: t.team_id,
        teamName: t.team_name,
        leaderName: t.squad_leader,
        score: t.total_score,
        solvedCount: solvedList.length,
        completedTasks: solvedList,
        lastSubmissionTime: t.last_solved_at || t.updated_at || t.created_at,
        status: t.status || "ACTIVE",
      };
    });

    return { success: true, leaderboard };
  } catch (err: any) {
    console.warn("[SUPABASE] Failed to fetch leaderboard:", err);
    return { success: false, leaderboard: [], error: err.message };
  }
}

/**
 * Fetch all chapters, questions, and options directly from Supabase
 */
export async function getSupabaseChapters(): Promise<{ success: boolean; chapters: AdminChapterData[]; error?: string }> {
  try {
    const { data: chaptersData, error: chaptersError } = await supabase
      .from("chapters")
      .select("*, chapter_questions(*), question_options(*), chapter_lore(*)")
      .order("chapter_id", { ascending: true });

    if (chaptersError) {
      console.warn("[SUPABASE] Chapters query error:", chaptersError.message);
      return { success: false, chapters: [], error: chaptersError.message };
    }

    if (!chaptersData || chaptersData.length === 0) {
      return { success: true, chapters: [] };
    }

    const chapters: AdminChapterData[] = chaptersData.map((c: any) => {
      const q = Array.isArray(c.chapter_questions) && c.chapter_questions.length > 0 ? c.chapter_questions[0] : null;
      const opts = Array.isArray(c.question_options)
        ? c.question_options
            .sort((a: any, b: any) => a.sort_order - b.sort_order)
            .map((o: any) => ({ id: o.option_key, text: o.option_text }))
        : [];
      const loreLines = Array.isArray(c.chapter_lore)
        ? c.chapter_lore.map((l: any) => `${l.speaker_name}: ${l.dialogue_script}`)
        : [];

      return {
        id: c.chapter_id,
        label: `CHAPTER ${c.chapter_id}`,
        tag: c.tag,
        archiveSector: c.sector_code,
        archiveTitle: c.title,
        archiveSubtitle: c.subtitle || "",
        taskId: c.task_id,
        type: c.task_type || "CHOICE",
        bgSrc: "/images/bg.jpg",
        questionPrompt: q?.prompt || "Prompt not yet configured",
        correctAnswer: q?.correct_answer || "N/A",
        points: c.points || 100,
        options: opts,
        archiveLines: loreLines,
      };
    });

    return { success: true, chapters };
  } catch (err: any) {
    console.warn("[SUPABASE] Failed to fetch chapters:", err);
    return { success: false, chapters: [], error: err.message };
  }
}

/**
 * Update chapter question, points, and answer directly in Supabase
 */
export async function updateSupabaseChapter(
  chapterId: number,
  payload: Partial<AdminChapterData>
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Update chapters table
    if (payload.points !== undefined) {
      await supabase
        .from("chapters")
        .update({ points: payload.points, updated_at: new Date().toISOString() })
        .eq("chapter_id", chapterId);
    }

    // 2. Update chapter_questions table
    if (payload.questionPrompt || payload.correctAnswer) {
      const updateData: any = { updated_at: new Date().toISOString() };
      if (payload.questionPrompt) updateData.prompt = payload.questionPrompt;
      if (payload.correctAnswer) updateData.correct_answer = payload.correctAnswer;

      const { error: qError } = await supabase
        .from("chapter_questions")
        .update(updateData)
        .eq("chapter_id", chapterId);

      if (qError) {
        console.error("[SUPABASE] Question update failed:", qError);
      }
    }

    // 3. Update question_options if provided
    if (payload.options && payload.options.length > 0) {
      for (let i = 0; i < payload.options.length; i++) {
        const opt = payload.options[i];
        await supabase
          .from("question_options")
          .upsert({
            chapter_id: chapterId,
            option_key: opt.id,
            option_text: opt.text,
            sort_order: i + 1,
          }, { onConflict: "chapter_id,option_key" });
      }
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Delete / deactivate a chapter in Supabase
 */
export async function deleteSupabaseChapter(chapterId: number): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from("chapters")
      .update({ is_active: false })
      .eq("chapter_id", chapterId);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Subscribe to real-time changes on teams / leaderboard
 */
export function subscribeToSupabaseLeaderboard(onUpdate: () => void) {
  try {
    const channel = supabase
      .channel("public:teams")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "teams" },
        () => {
          onUpdate();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (e) {
    console.warn("[SUPABASE] Realtime subscription not available:", e);
    return () => {};
  }
}

export interface SupabaseAuthResult {
  success: boolean;
  session?: {
    role: "PLAYER" | "VECNA";
    teamName: string;
    leaderName: string;
    teamId: string;
  };
  source?: "supabase" | "canon";
  error?: string;
}

/**
 * Authenticate team credentials against Supabase teams table
 */
export async function authenticateTeamWithSupabase(
  teamNameInput: string,
  leaderNameInput: string
): Promise<SupabaseAuthResult> {
  const normTeam = teamNameInput.trim().toLowerCase();
  const normLeader = leaderNameInput.trim().toLowerCase();

  if (!normTeam || !normLeader) {
    return { success: false, error: "Team name and squad leader are required." };
  }

  // 1. Vecna Game Character / Storyline Credentials
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

  // 2. Query Supabase Teams Table
  try {
    const { data, error } = await supabase
      .from("teams")
      .select("team_id, team_name, squad_leader, total_score, status");

    if (!error && data && data.length > 0) {
      // Find matching team (case-insensitive)
      const match = data.find(
        (t: any) =>
          t.team_name.trim().toLowerCase() === normTeam &&
          t.squad_leader.trim().toLowerCase() === normLeader
      );

      if (match) {
        return {
          success: true,
          session: {
            role: "PLAYER",
            teamName: match.team_name,
            leaderName: match.squad_leader,
            teamId: match.team_id,
          },
          source: "supabase",
        };
      }
    }
  } catch (e) {
    console.warn("[SUPABASE AUTH] Supabase query failed, falling back to local registry:", e);
  }

  // 3. Fallback to Canon Player Teams
  const CANON_TEAMS = [
    { id: "TEAM-AV-CLUB", teamName: "Hawkins AV Club", leaderName: "Dustin Henderson" },
    { id: "TEAM-HELLFIRE", teamName: "The Hellfire Club", leaderName: "Eddie Munson" },
    { id: "TEAM-SCOOPS", teamName: "Scoops Troop", leaderName: "Robin Buckley" },
    { id: "TEAM-THE-PARTY", teamName: "The Party (Paladins)", leaderName: "Mike Wheeler" },
    { id: "T01", teamName: "Null Pointers", leaderName: "Aarav Sharma" },
    { id: "T02", teamName: "Stack Smashers", leaderName: "Maya Lin" },
    { id: "T03", teamName: "Rift Runners", leaderName: "Lucas Sinclair" },
    { id: "T04", teamName: "Byte Byters", leaderName: "Dustin Henderson" },
    { id: "T05", teamName: "Shadow Walkers", leaderName: "Mike Wheeler" },
    { id: "T06", teamName: "Hellfire Club", leaderName: "Eddie Munson" },
    { id: "T07", teamName: "Hawkins AV Club", leaderName: "Will Byers" },
    { id: "T08", teamName: "Mind Flayers", leaderName: "Max Mayfield" },
  ];

  const canonMatch = CANON_TEAMS.find(
    (t) =>
      t.teamName.trim().toLowerCase() === normTeam &&
      t.leaderName.trim().toLowerCase() === normLeader
  );

  if (canonMatch) {
    // Attempt background sync into Supabase so future queries see it
    try {
      supabase.from("teams").upsert({
        team_id: canonMatch.id,
        team_name: canonMatch.teamName,
        squad_leader: canonMatch.leaderName,
        access_passcode: "salt_pass_player",
        total_score: 0,
        status: "ACTIVE",
      }, { onConflict: "team_id" }).then();
    } catch {}

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
 * Register a new squad directly into Supabase
 */
export async function registerTeamInSupabase(
  teamName: string,
  leaderName: string,
  initialScore: number = 0
): Promise<{ success: boolean; team?: any; error?: string }> {
  try {
    const teamId = `TEAM-${teamName.trim().toUpperCase().replace(/[^A-Z0-9]/g, "-").slice(0, 16)}-${Math.floor(100 + Math.random() * 900)}`;

    const { data, error } = await supabase
      .from("teams")
      .insert({
        team_id: teamId,
        team_name: teamName.trim(),
        squad_leader: leaderName.trim(),
        access_passcode: "salt_pass_auto",
        total_score: initialScore,
        status: "ACTIVE",
      })
      .select()
      .single();

    if (error) throw error;
    return { success: true, team: data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
