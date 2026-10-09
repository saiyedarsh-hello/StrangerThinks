import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("hawkins_session_token")?.value;
    if (token) {
      await supabaseAdmin.from("active_sessions").delete().eq("session_token", token);
    }

    const response = NextResponse.json({ success: true, message: "Logged out successfully." });
    response.cookies.delete("hawkins_session_token");
    return response;
  } catch (err: any) {
    console.error("[LOGOUT API ERROR]", err);
    return NextResponse.json({ success: false, error: "LOGOUT_FAILED" }, { status: 500 });
  }
}
