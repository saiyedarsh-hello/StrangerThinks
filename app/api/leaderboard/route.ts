import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { data: teams, error } = await supabaseAdmin
      .from("teams")
      .select("team_id, team_name, squad_leader, total_score, current_stage, status, updated_at")
      .order("total_score", { ascending: false })
      .order("updated_at", { ascending: true });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const leaderboard = (teams || []).map((t, idx) => ({
      rank: idx + 1,
      teamId: t.team_id,
      team: t.team_name,
      leader: t.squad_leader,
      score: t.total_score,
      stage: t.current_stage,
      status: t.status,
    }));

    return NextResponse.json({ success: true, leaderboard });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
