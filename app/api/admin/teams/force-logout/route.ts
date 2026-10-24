import { NextRequest, NextResponse } from "next/server";
import { getApiBase } from "@/lib/api";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const teamId = String(body.teamId || "").trim();

    if (!teamId) {
      return NextResponse.json({ success: false, error: "MISSING_TEAM_ID" }, { status: 400 });
    }

    const base = getApiBase();
    const token = req.headers.get("authorization");
    if (!token) {
      return NextResponse.json({ success: false, error: "UNAUTHORIZED", message: "Admin authorization required." }, { status: 401 });
    }
    const res = await fetch(`${base}/admin/teams/${encodeURIComponent(teamId)}/force-logout`, {
      method: "POST",
      headers: {
        Authorization: token,
        "Content-Type": "application/json",
      },
    });

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    console.error("[FORCE LOGOUT ERROR]", err);
    return NextResponse.json({ success: false, error: "BACKEND_UNREACHABLE" }, { status: 500 });
  }
}
