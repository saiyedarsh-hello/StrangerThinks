import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  try {
    // 1. Fetch all teams
    const { data: teams, error: teamsError } = await supabaseAdmin
      .from("teams")
      .select("team_id, username, password_plain, team_name, squad_leader, total_score, current_stage, stage_times, status, created_at, updated_at")
      .order("total_score", { ascending: false });

    if (teamsError) {
      return NextResponse.json({ success: false, error: teamsError.message }, { status: 500 });
    }

    // 2. Fetch all active sessions
    const { data: activeSessions } = await supabaseAdmin
      .from("active_sessions")
      .select("session_id, team_id, ip_address, created_at, last_heartbeat");

    const sessionMap = new Map((activeSessions || []).map((s) => [s.team_id, s]));

    // 3. Fetch submissions count per team
    const { data: submissions } = await supabaseAdmin
      .from("team_submissions")
      .select("team_id, is_correct, points_awarded");

    const subMap: Record<string, { total: number; correct: number }> = {};
    (submissions || []).forEach((sub) => {
      if (!subMap[sub.team_id]) subMap[sub.team_id] = { total: 0, correct: 0 };
      subMap[sub.team_id].total++;
      if (sub.is_correct) subMap[sub.team_id].correct++;
    });

    const now = Date.now();
    const result = (teams || []).map((t, idx) => {
      const sess = sessionMap.get(t.team_id);
      const hasSession = !!sess;
      const lastHeartbeatMs = sess?.last_heartbeat ? now - new Date(sess.last_heartbeat).getTime() : null;
      // Online if heartbeat was in last 2 minutes
      const isOnline = hasSession && lastHeartbeatMs !== null && lastHeartbeatMs < 2 * 60 * 1000;
      const isIdle = hasSession && !isOnline;
      const lastHeartbeatMinutesAgo = lastHeartbeatMs !== null ? Math.floor(lastHeartbeatMs / 60000) : null;

      return {
        rank: idx + 1,
        teamId: t.team_id,
        username: t.username,
        password: t.password_plain, // Visible to admin for team recovery
        teamName: t.team_name,
        leaderName: t.squad_leader,
        score: t.total_score,
        currentStage: t.current_stage,
        stageTimes: t.stage_times || {},
        status: t.status,
        hasSession,
        isOnline,
        isIdle,
        lastHeartbeatMinutesAgo,
        sessionId: sess?.session_id,
        loginTime: sess?.created_at,
        lastHeartbeat: sess?.last_heartbeat,
        ipAddress: sess?.ip_address,
        submissionsCount: subMap[t.team_id]?.total || 0,
        correctCount: subMap[t.team_id]?.correct || 0,
      };
    });

    return NextResponse.json({ success: true, teams: result });
  } catch (err: any) {
    console.error("[ADMIN TEAMS ERROR]", err);
    return NextResponse.json({ success: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
