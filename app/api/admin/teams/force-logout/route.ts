import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const teamId = String(body.teamId || "").trim();

    if (!teamId) {
      return NextResponse.json({ success: false, error: "MISSING_TEAM_ID" }, { status: 400 });
    }

    // 1. Remove active session from database
    await supabaseAdmin.from("active_sessions").delete().eq("team_id", teamId);

    // 2. Broadcast force logout to Realtime channel
    const channel = supabaseAdmin.channel("hawkins-protocol");
    await channel.send({
      type: "broadcast",
      event: "force_logout",
      payload: {
        type: "force_logout",
        target: teamId,
        ts: Date.now(),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Team [${teamId}] session terminated. Device forced to logout.`,
    });
  } catch (err: any) {
    console.error("[FORCE LOGOUT ERROR]", err);
    return NextResponse.json({ success: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
