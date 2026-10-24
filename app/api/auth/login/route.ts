import { NextRequest, NextResponse } from "next/server";
import { getApiBase } from "@/lib/api";
import { PLAYER_TEAMS } from "@/lib/config";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const username = (body.username || body.teamName || "").trim();
    const password = (body.password || body.leaderName || "").trim();

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: "MISSING_CREDENTIALS", message: "Username and password are required." },
        { status: 400 }
      );
    }

    // 1. Try external backend
    try {
      const base = getApiBase();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const res = await fetch(`${base}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamName: username, leaderName: password }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        return NextResponse.json(data, { status: res.status });
      }
    } catch (backendErr) {
      // Backend unreachable; fall back to local credentials
    }

    // 2. Local fallback against PLAYER_TEAMS
    const matched = PLAYER_TEAMS.find(
      (t) =>
        t.teamName.toLowerCase() === username.toLowerCase() &&
        t.leaderName.toLowerCase() === password.toLowerCase()
    );

    if (matched) {
      const response = NextResponse.json({
        success: true,
        token: `hawk_${matched.id}_${Date.now()}`,
        session: {
          teamId: matched.id,
          teamName: matched.teamName,
          leaderName: matched.leaderName,
          role: "PLAYER",
        },
        team: {
          id: matched.id,
          name: matched.teamName,
          score: 0,
        },
      });

      response.cookies.set("hawkins_session_token", `hawk_${matched.id}_${Date.now()}`, {
        httpOnly: false,
        sameSite: "lax",
        path: "/",
      });

      return response;
    }

    return NextResponse.json(
      { success: false, error: "INVALID_CREDENTIALS", message: "Invalid squad name or leader name." },
      { status: 401 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR", message: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
