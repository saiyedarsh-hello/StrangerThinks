import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedTeam } from "@/lib/server/session";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const team = await getAuthenticatedTeam(req);
    console.log("[SESSION API] Authenticated team:", team?.team_id || "NONE (401)");
    if (!team) {
      return NextResponse.json(
        { authenticated: false },
        {
          status: 401,
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
          },
        }
      );
    }

    // Fetch team completed questions & hints
    const { data: submissions } = await supabaseAdmin
      .from("team_submissions")
      .select("question_id, is_correct, points_awarded, submitted_at")
      .eq("team_id", team.team_id);

    const { data: hintsUsed } = await supabaseAdmin
      .from("team_hint_usage")
      .select("hint_id, question_id, deduction")
      .eq("team_id", team.team_id);

    const { data: eventState } = await supabaseAdmin
      .from("event_state")
      .select("status, submissions_open")
      .eq("id", 1)
      .single();

    return NextResponse.json(
      {
        authenticated: true,
        team: {
          id: team.team_id,
          username: team.username,
          teamName: team.team_name,
          squadLeader: team.squad_leader,
          totalScore: team.total_score,
          currentStage: team.current_stage,
          isFrozen: team.is_frozen,
          freezeRemainingSeconds: team.freeze_remaining_seconds,
        },
        submissions: submissions || [],
        hintsUsed: hintsUsed || [],
        event: {
          status: eventState?.status || "active",
          submissionsOpen: eventState?.submissions_open ?? true,
        },
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          "Pragma": "no-cache",
          "Expires": "0",
        },
      }
    );
  } catch (err: any) {
    console.error("[SESSION API ERROR]", err);
    return NextResponse.json({ authenticated: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
