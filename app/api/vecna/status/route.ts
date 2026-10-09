import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedTeam } from "@/lib/server/session";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const team = await getAuthenticatedTeam(req);
    if (!team) {
      return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    // 1. Fetch active sabotages created in the last 2 minutes
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    const { data: activeSabotages } = await supabaseAdmin
      .from("vecna_sabotages")
      .select("sabotage_id, target_team, kind, message, duration_seconds, created_at")
      .or(`target_team.eq.${team.team_id},target_team.eq.all`)
      .gt("created_at", twoMinutesAgo)
      .order("created_at", { ascending: false });

    // 2. Fetch delivered Vecna story messages
    const { data: delivered } = await supabaseAdmin
      .from("vecna_deliveries")
      .select("delivered_at, vecna_messages(message_id, title, content)")
      .eq("team_id", team.team_id)
      .order("delivered_at", { ascending: false });

    return NextResponse.json({
      success: true,
      sabotages: activeSabotages || [],
      messages: (delivered || []).map((d: any) => ({
        id: d.vecna_messages?.message_id,
        title: d.vecna_messages?.title,
        content: d.vecna_messages?.content,
        deliveredAt: d.delivered_at,
      })),
    });
  } catch (err: any) {
    console.error("[VECNA STATUS ERROR]", err);
    return NextResponse.json({ success: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
