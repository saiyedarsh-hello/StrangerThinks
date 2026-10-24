import { NextRequest, NextResponse } from "next/server";
import { getApiBase } from "@/lib/api";

export async function GET(req: NextRequest) {
  try {
    const base = getApiBase();
    const token =
      req.cookies.get("hawkins_session_token")?.value ||
      req.headers.get("authorization")?.replace("Bearer ", "");

    const res = await fetch(`${base}/vecna/tactical-map`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    console.error("[TACTICAL MAP API ERROR]", err);
    return NextResponse.json({ success: false, error: "BACKEND_UNREACHABLE" }, { status: 500 });
  }
}
