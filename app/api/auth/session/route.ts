import { NextRequest, NextResponse } from "next/server";
import { getApiBase } from "@/lib/api";
import { PLAYER_TEAMS, VECNA_CREDENTIAL, OPERATORS } from "@/lib/config";
import { getTeamProgress } from "@/lib/teamStore";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const token =
      req.cookies.get("hawkins_session_token")?.value ||
      req.headers.get("authorization")?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json(
        { authenticated: false },
        {
          status: 200,
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        }
      );
    }

    const base = getApiBase();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1000);
    const meRes = await fetch(`${base}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: controller.signal,
    }).catch(() => null);
    clearTimeout(timeoutId);

    if (!meRes || !meRes.ok) {
      // Local fallback for local tokens when backend is offline
      if (token.startsWith("hawk_")) {
        const parts = token.split("_");
        if (token.startsWith("hawk_vecna_")) {
          return NextResponse.json({
            authenticated: true,
            role: "VECNA",
            session: {
              role: "VECNA",
              teamId: "VECNA-001",
              teamName: VECNA_CREDENTIAL.teamName,
              leaderName: VECNA_CREDENTIAL.leaderName,
            },
            team: {
              id: "VECNA-001",
              name: VECNA_CREDENTIAL.teamName,
              score: 0,
            },
          });
        }

        if (token.startsWith("hawk_admin_")) {
          const adminId = parts[2] || "op-vecna";
          const op = OPERATORS.find((o) => o.id === adminId) || OPERATORS[0];
          return NextResponse.json({
            authenticated: true,
            role: "ADMIN",
            session: {
              role: "ADMIN",
              teamId: op.id,
              adminId: op.id,
              teamName: op.name,
              leaderName: op.name,
            },
          });
        }

        const teamId = parts[1];
        const matched = PLAYER_TEAMS.find((t) => t.id === teamId) || PLAYER_TEAMS[0];
        const progress = getTeamProgress(matched.id);
        return NextResponse.json({
          authenticated: true,
          role: "PLAYER",
          session: {
            role: "PLAYER",
            teamId: matched.id,
            teamName: matched.teamName,
            leaderName: matched.leaderName,
          },
          team: {
            id: matched.id,
            username: matched.teamName,
            teamName: matched.teamName,
            squadLeader: matched.leaderName,
            totalScore: progress?.totalScore || 0,
            breakdown: progress?.breakdown || {
              tech: progress?.totalScore || 0,
              puzzle: 0,
              clue: 0,
              speed: 0,
              story: 0,
              teamwork: 0,
            },
            penalty: progress?.penalty || 0,
            solvedChapters: progress?.solvedChapters || [],
            completedTasks: progress?.completedTasks || [],
            unlockedLocations: progress?.unlockedLocations || {},
            storyProgress: progress?.storyProgress || 10,
            taskScores: progress?.taskScores || {},
            currentStage: 1,
            isFrozen: false,
            freezeRemainingSeconds: 0,
          },
          submissions: [],
          hintsUsed: [],
          event: { status: "active", submissionsOpen: true, isPaused: false },
          activeSabotages: [],
        });
      }

      return NextResponse.json(
        { authenticated: false, forceLoggedOut: meRes?.status === 401 },
        {
          status: meRes?.status === 401 ? 401 : 200,
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        }
      );
    }

    const meData = await meRes.json().catch(() => ({}));
    if (!meData.success || !meData.session) {
      return NextResponse.json(
        { authenticated: false, forceLoggedOut: true },
        {
          status: 401,
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        }
      );
    }

    // Query submissions and event state in parallel
    const [subsRes, eventRes] = await Promise.all([
      fetch(`${base}/me/submissions`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      }).catch(() => null),
      fetch(`${base}/event/state`, {
        cache: "no-store",
      }).catch(() => null),
    ]);

    const subsData = subsRes && subsRes.ok ? await subsRes.json().catch(() => ({})) : {};
    const eventData = eventRes && eventRes.ok ? await eventRes.json().catch(() => ({})) : {};

    const team = meData.team || {};
    const session = meData.session || {};

    return NextResponse.json(
      {
        authenticated: true,
        role: session.role || "PLAYER",
        session: {
          role: session.role || "PLAYER",
          teamId: session.teamId || team.id || "",
          teamName: session.teamName || team.teamName || "",
          leaderName: session.leaderName || team.leaderName || "",
          ...(session.adminId ? { adminId: session.adminId } : {}),
        },
        team: {
          id: team.id || session.teamId || "T01",
          username: team.teamName || session.teamName || "",
          teamName: team.teamName || session.teamName || "",
          squadLeader: team.leaderName || session.leaderName || "",
          totalScore: team.totalScore ?? team.score ?? 0,
          breakdown: team.breakdown || {
            tech: team.totalScore ?? 0,
            puzzle: 0,
            clue: 0,
            speed: 0,
            story: 0,
            teamwork: 0,
          },
          penalty: team.penalty || 0,
          solvedChapters: team.solvedChapters || [],
          completedTasks: team.completedTasks || [],
          unlockedLocations: team.unlockedLocations || {},
          storyProgress: team.storyProgress || 10,
          currentStage: 1,
          isFrozen: false,
          freezeRemainingSeconds: 0,
        },
        submissions: subsData.submissions || [],
        hintsUsed: [],
        event: {
          status: eventData.event?.status || "active",
          submissionsOpen: eventData.event?.submissionsOpen ?? true,
          isPaused: eventData.event?.isPaused ?? (eventData.event?.status === "paused"),
        },
        activeSabotages: meData.activeSabotages || [],
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (err: any) {
    console.error("[SESSION API ERROR]", err);
    return NextResponse.json({ authenticated: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
