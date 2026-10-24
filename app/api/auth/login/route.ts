import { NextRequest, NextResponse } from "next/server";
import { getApiBase } from "@/lib/api";
import { PLAYER_TEAMS, VECNA_CREDENTIAL, OPERATORS } from "@/lib/config";
import { getTeamProgress } from "@/lib/teamStore";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const teamInput = (body.teamName || body.username || "").trim();
    const leaderInput = (body.leaderName || (!body.teamName ? body.password : "") || "").trim();
    const passcodeInput = (body.password || "").trim();

    // In player login, username = teamName and password = leaderName
    const effectiveTeam = teamInput;
    const effectiveLeader = leaderInput || passcodeInput;

    if (!effectiveTeam || !effectiveLeader) {
      return NextResponse.json(
        { success: false, error: "MISSING_CREDENTIALS", message: "Squad name and leader name are required." },
        { status: 400 }
      );
    }

    // 1. Try external backend if available
    try {
      const base = getApiBase();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1000);

      const res = await fetch(`${base}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamName: effectiveTeam,
          leaderName: effectiveLeader,
          password: passcodeInput,
        }),
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

    // 2. Check Vecna credentials
    if (
      (effectiveTeam.toLowerCase() === VECNA_CREDENTIAL.teamName.toLowerCase() &&
        effectiveLeader.toLowerCase() === VECNA_CREDENTIAL.leaderName.toLowerCase()) ||
      (effectiveTeam.toLowerCase() === "vecna" && passcodeInput === "HAWKINS1986")
    ) {
      const response = NextResponse.json({
        success: true,
        token: `hawk_vecna_${Date.now()}`,
        session: {
          teamId: "VECNA-001",
          teamName: VECNA_CREDENTIAL.teamName,
          leaderName: VECNA_CREDENTIAL.leaderName,
          role: "VECNA",
        },
        team: {
          id: "VECNA-001",
          name: VECNA_CREDENTIAL.teamName,
          score: 0,
        },
      });

      response.cookies.set("hawkins_session_token", `hawk_vecna_${Date.now()}`, {
        httpOnly: false,
        sameSite: "lax",
        path: "/",
      });

      return response;
    }

    // 3. Check Admin / Operators
    const matchedOperator = OPERATORS.find(
      (op) =>
        (op.name.toLowerCase() === effectiveLeader.toLowerCase() ||
          op.name.toLowerCase() === effectiveTeam.toLowerCase()) &&
        (passcodeInput === op.passcode || effectiveLeader.toLowerCase() === op.name.toLowerCase())
    );

    if (matchedOperator) {
      const response = NextResponse.json({
        success: true,
        token: `hawk_admin_${matchedOperator.id}_${Date.now()}`,
        session: {
          teamId: matchedOperator.id,
          adminId: matchedOperator.id,
          teamName: matchedOperator.name,
          leaderName: matchedOperator.name,
          role: "ADMIN",
        },
      });

      response.cookies.set("hawkins_session_token", `hawk_admin_${matchedOperator.id}_${Date.now()}`, {
        httpOnly: false,
        sameSite: "lax",
        path: "/",
      });

      return response;
    }

    // 4. Local fallback against PLAYER_TEAMS
    const matched = PLAYER_TEAMS.find(
      (t) =>
        t.teamName.toLowerCase() === effectiveTeam.toLowerCase() &&
        t.leaderName.toLowerCase() === effectiveLeader.toLowerCase()
    );

    if (matched) {
      const progress = getTeamProgress(matched.id);
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
          score: progress?.totalScore || 0,
          totalScore: progress?.totalScore || 0,
          solvedChapters: progress?.solvedChapters || [],
          completedTasks: progress?.completedTasks || [],
          breakdown: progress?.breakdown || {
            tech: progress?.totalScore || 0,
            puzzle: 0,
            clue: 0,
            speed: 0,
            story: 0,
            teamwork: 0,
          },
          taskScores: progress?.taskScores || {},
          unlockedLocations: progress?.unlockedLocations || {},
          storyProgress: progress?.storyProgress || 10,
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
