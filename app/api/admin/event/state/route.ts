import { NextRequest, NextResponse } from "next/server";
import { getApiBase } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const base = getApiBase();
    const res = await fetch(`${base}/event/state`, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      const ev = data.event || {};
      return NextResponse.json({
        success: true,
        eventState: {
          id: 1,
          status: ev.status || "active",
          login_open: ev.loginOpen !== false,
          submissions_open: ev.submissionsOpen !== false,
          current_round_max: 7,
          is_paused: !!ev.isPaused,
          unlockedStages: Array.isArray(ev.unlockedStages)
            ? ev.unlockedStages
            : Array.isArray(data.unlockedStages)
            ? data.unlockedStages
            : [1],
        },
      });
    }
    return NextResponse.json({
      success: true,
      eventState: {
        id: 1,
        status: "active",
        login_open: true,
        submissions_open: true,
        current_round_max: 7,
        unlockedStages: [1],
      },
    });
  } catch (err: any) {
    return NextResponse.json({
      success: true,
      eventState: {
        id: 1,
        status: "active",
        login_open: true,
        submissions_open: true,
        current_round_max: 7,
      },
    });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const base = getApiBase();
    const token = req.headers.get("authorization");
    if (!token) {
      return NextResponse.json({ success: false, error: "UNAUTHORIZED", message: "Admin authorization required." }, { status: 401 });
    }

    if (body.status === "ended") {
      await fetch(`${base}/admin/event/end`, { method: "POST", headers: { Authorization: token } });
    } else if (body.status === "paused") {
      await fetch(`${base}/admin/event/pause`, { method: "POST", headers: { Authorization: token } });
    } else if (body.status === "active") {
      const currentEvRes = await fetch(`${base}/event/state`, { cache: "no-store" }).catch(() => null);
      const currentEvData = currentEvRes?.ok ? await currentEvRes.json() : null;
      if (currentEvData?.event?.status === "not_started" || currentEvData?.event?.status === "ended") {
        await fetch(`${base}/admin/event/start`, { method: "POST", headers: { Authorization: token } });
      } else {
        await fetch(`${base}/admin/event/resume`, { method: "POST", headers: { Authorization: token } });
      }
    }

    if (body.loginOpen === true) {
      await fetch(`${base}/admin/event/open-login`, { method: "POST", headers: { Authorization: token } });
    } else if (body.loginOpen === false) {
      await fetch(`${base}/admin/event/close-login`, { method: "POST", headers: { Authorization: token } });
    }

    if (body.submissionsOpen === true) {
      await fetch(`${base}/admin/event/open-submissions`, { method: "POST", headers: { Authorization: token } });
    } else if (body.submissionsOpen === false) {
      await fetch(`${base}/admin/event/stop-submissions`, { method: "POST", headers: { Authorization: token } });
    }

    // Read authoritative state from backend
    const stateRes = await fetch(`${base}/event/state`, { cache: "no-store" });
    const stateData = await stateRes.json().catch(() => ({}));
    const ev = stateData.event || {};

    return NextResponse.json({
      success: true,
      message: "Event state updated",
      eventState: {
        id: 1,
        status: ev.status || (body.status || "active"),
        login_open: ev.loginOpen !== undefined ? Boolean(ev.loginOpen) : body.loginOpen !== false,
        submissions_open: ev.submissionsOpen !== undefined ? Boolean(ev.submissionsOpen) : body.submissionsOpen !== false,
        current_round_max: 7,
        is_paused: Boolean(ev.isPaused),
        unlockedStages: Array.isArray(ev.unlockedStages)
          ? ev.unlockedStages
          : Array.isArray(stateData.unlockedStages)
          ? stateData.unlockedStages
          : [1],
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
