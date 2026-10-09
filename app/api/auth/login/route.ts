import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";
import crypto from "crypto";

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

    // 1. Check Event Login State
    const { data: eventState } = await supabaseAdmin
      .from("event_state")
      .select("login_open, status")
      .eq("id", 1)
      .single();

    if (eventState && !eventState.login_open) {
      return NextResponse.json(
        { success: false, error: "LOGIN_CLOSED", message: "The login window for this event is currently closed." },
        { status: 403 }
      );
    }

    // 2. Validate Team Credentials against Database
    const { data: teams, error: teamQueryError } = await supabaseAdmin
      .from("teams")
      .select("team_id, username, password_plain, team_name, squad_leader, total_score, current_stage, status")
      .or(`username.ilike.${username},team_name.ilike.${username}`)
      .limit(1);

    if (teamQueryError || !teams || teams.length === 0) {
      return NextResponse.json(
        { success: false, error: "INVALID_CREDENTIALS", message: "ACCESS DENIED: Unknown squad or invalid security clearance." },
        { status: 401 }
      );
    }

    const team = teams[0];
    const passwordMatches =
      team.password_plain.trim() === password ||
      team.squad_leader.trim().toLowerCase() === password.toLowerCase();

    if (!passwordMatches) {
      return NextResponse.json(
        { success: false, error: "INVALID_CREDENTIALS", message: "ACCESS DENIED: Inconsistent password clearance." },
        { status: 401 }
      );
    }

    if (team.status === "DISQUALIFIED") {
      return NextResponse.json(
        { success: false, error: "DISQUALIFIED", message: "This squad has been decommissioned by the Hawkins Command." },
        { status: 403 }
      );
    }

    // 3. Strict Single Active Session Enforcement
    const { data: existingSession } = await supabaseAdmin
      .from("active_sessions")
      .select("session_id, created_at, last_heartbeat")
      .eq("team_id", team.team_id)
      .single();

    if (existingSession) {
      return NextResponse.json(
        {
          success: false,
          error: "ALREADY_LOGGED_IN",
          message: "This team is already logged in on another device. Only one device per squad is authorized. Please logout from the other device or contact an administrator.",
        },
        { status: 409 }
      );
    }

    // 4. Create New Authenticated Session
    const sessionToken = crypto.randomUUID() + "-" + crypto.randomBytes(16).toString("hex");
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || "unknown";

    const { error: sessionInsertError } = await supabaseAdmin
      .from("active_sessions")
      .insert({
        team_id: team.team_id,
        session_token: sessionToken,
        ip_address: ip,
        user_agent: userAgent,
      });

    if (sessionInsertError) {
      console.error("[LOGIN] Session insert failure:", sessionInsertError);
      return NextResponse.json(
        { success: false, error: "SESSION_CREATION_FAILED", message: "Failed to establish secure session telemetry." },
        { status: 500 }
      );
    }

    // 5. Send HTTP-only Secure Cookie
    const response = NextResponse.json({
      success: true,
      message: "SECURITY CLEARANCE VERIFIED · ACCESS GRANTED",
      team: {
        id: team.team_id,
        username: team.username,
        teamName: team.team_name,
        squadLeader: team.squad_leader,
        totalScore: team.total_score,
        currentStage: team.current_stage,
      },
    });

    response.cookies.set("hawkins_session_token", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24, // 24 hours
    });

    return response;
  } catch (err: any) {
    console.error("[LOGIN API ERROR]", err);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR", message: "Internal server error occurred." },
      { status: 500 }
    );
  }
}
