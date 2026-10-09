import { NextRequest } from "next/server";
import { supabaseAdmin } from "./supabaseAdmin";

export interface AuthenticatedTeam {
  team_id: string;
  username: string;
  team_name: string;
  squad_leader: string;
  total_score: number;
  current_stage: number;
  status: string;
  is_frozen: boolean;
  freeze_remaining_seconds: number;
}

export async function getAuthenticatedTeam(req: NextRequest): Promise<AuthenticatedTeam | null> {
  const token = req.cookies.get("hawkins_session_token")?.value;
  if (!token) {
    console.log("[AUTH] No token in hawkins_session_token cookie");
    return null;
  }

  // 1. Verify active session
  const { data: session, error } = await supabaseAdmin
    .from("active_sessions")
    .select("session_id, team_id, last_heartbeat")
    .eq("session_token", token)
    .single();

  if (error || !session) {
    console.log("[AUTH] Session lookup failed for token:", token.slice(0, 10), "error:", error?.message);
    return null;
  }

  // 2. Fetch team profile
  const { data: team, error: teamError } = await supabaseAdmin
    .from("teams")
    .select("team_id, username, team_name, squad_leader, total_score, current_stage, status")
    .eq("team_id", session.team_id)
    .single();

  if (teamError || !team) return null;

  // 3. Heartbeat update (async, non-blocking)
  supabaseAdmin
    .from("active_sessions")
    .update({ last_heartbeat: new Date().toISOString() })
    .eq("session_id", session.session_id)
    .then();

  // 4. Check for active TIME_FREEZE sabotage
  const { data: activeFreeze } = await supabaseAdmin
    .from("vecna_sabotages")
    .select("created_at, duration_seconds")
    .or(`target_team.eq.${team.team_id},target_team.eq.all`)
    .eq("kind", "TIME_FREEZE")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  let is_frozen = false;
  let freeze_remaining_seconds = 0;

  if (activeFreeze) {
    const elapsedSeconds = (Date.now() - new Date(activeFreeze.created_at).getTime()) / 1000;
    if (elapsedSeconds < activeFreeze.duration_seconds) {
      is_frozen = true;
      freeze_remaining_seconds = Math.ceil(activeFreeze.duration_seconds - elapsedSeconds);
    }
  }

  return {
    ...team,
    is_frozen,
    freeze_remaining_seconds,
  };
}
