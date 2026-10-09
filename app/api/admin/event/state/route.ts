import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";

export async function GET() {
  try {
    const { data: state, error } = await supabaseAdmin.from("event_state").select("*").eq("id", 1).single();
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, eventState: state });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const updates: any = { updated_at: new Date().toISOString() };

    if (body.status !== undefined) updates.status = body.status;
    if (body.loginOpen !== undefined) updates.login_open = body.loginOpen;
    if (body.submissionsOpen !== undefined) updates.submissions_open = body.submissionsOpen;
    if (body.currentRoundMax !== undefined) updates.current_round_max = body.currentRoundMax;

    const { data: updated, error } = await supabaseAdmin
      .from("event_state")
      .update(updates)
      .eq("id", 1)
      .select()
      .single();

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });

    // Broadcast event state change to all clients
    const channel = supabaseAdmin.channel("hawkins-protocol");
    await channel.send({
      type: "broadcast",
      event: "event_state_change",
      payload: updated,
    });

    return NextResponse.json({ success: true, eventState: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
