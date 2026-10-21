import { NextRequest, NextResponse } from "next/server";
import { getApiBase } from "@/lib/api";

export async function GET(req: NextRequest) {
  try {
    const base = getApiBase();
    const token =
      req.cookies.get("hawkins_session_token")?.value ||
      req.headers.get("authorization")?.replace("Bearer ", "");

    const res = await fetch(`${base}/vecna/dispatch/quota`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    console.error("[DISPATCH QUOTA API ERROR]", err);
    return NextResponse.json({ success: true, remaining: 5, used: 0, max: 5 }, { status: 200 });
  }
}
