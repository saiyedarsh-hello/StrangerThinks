import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const target = String(body.target || "all").trim();
    const kind = String(body.kind || "GLITCH").trim();
    const message = body.message ? String(body.message) : undefined;
    const duration = parseInt(body.duration || 45, 10);
    const operatorName = String(body.operatorName || "HENRY CREEL");

    // 1. Record sabotage in database
    const { data: sabotage, error } = await supabaseAdmin
      .from("vecna_sabotages")
      .insert({
        target_team: target,
        kind: kind,
        message: message,
        duration_seconds: duration,
        triggered_by: operatorName,
      })
      .select()
      .single();

    if (error) {
      console.error("[SABOTAGE INSERT ERROR]", error);
      return NextResponse.json({ success: false, error: "DB_ERROR" }, { status: 500 });
    }

    // 2. Broadcast via Supabase Realtime Channel
    const channel = supabaseAdmin.channel("hawkins-protocol");
    await channel.send({
      type: "broadcast",
      event: "sabotage",
      payload: {
        type: "sabotage",
        id: sabotage.sabotage_id,
        kind,
        target,
        message,
        duration,
        operatorName,
        until: Date.now() + duration * 1000,
        ts: Date.now(),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Vecna power [${kind}] unleashed on [${target}].`,
      sabotage,
    });
  } catch (err: any) {
    console.error("[SABOTAGE TRIGGER ERROR]", err);
    return NextResponse.json({ success: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
