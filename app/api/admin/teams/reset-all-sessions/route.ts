import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";

export async function POST(_req: NextRequest) {
  try {
    // 1. Purge all rows from active_sessions
    const { error: deleteError } = await supabaseAdmin
      .from("active_sessions")
      .delete()
      .neq("team_id", "");

    if (deleteError) {
      console.error("[RESET ALL SESSIONS ERROR]", deleteError);
      return NextResponse.json({ success: false, error: deleteError.message }, { status: 500 });
    }

    // 2. Broadcast force logout to Realtime channel for all active devices
    try {
      const channel = supabaseAdmin.channel("hawkins-protocol");
      await channel.send({
        type: "broadcast",
        event: "force_logout",
        payload: {
          type: "force_logout",
          target: "ALL",
          ts: Date.now(),
        },
      });
    } catch (e) {
      console.warn("[RESET ALL SESSIONS] Realtime broadcast warning:", e);
    }

    return NextResponse.json({
      success: true,
      message: "All active team sessions have been terminated. All squads are unlocked.",
    });
  } catch (err: any) {
    console.error("[RESET ALL SESSIONS ERROR]", err);
    return NextResponse.json({ success: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
