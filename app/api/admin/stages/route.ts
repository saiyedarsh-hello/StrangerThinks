import { NextRequest, NextResponse } from "next/server";
import { getApiBase } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const base = getApiBase();
    let token = req.headers.get("authorization");
    if (!token || token.trim() === "" || token.trim() === "Bearer") {
      const cookieTok =
        req.cookies.get("hawkins_admin_token")?.value ||
        req.cookies.get("hawkins_session_token")?.value ||
        req.cookies.get("admin_token")?.value;
      if (cookieTok) {
        token = cookieTok.startsWith("Bearer ") ? cookieTok : `Bearer ${cookieTok}`;
      }
    }
    if (token && token.trim() !== "Bearer") {
      const res = await fetch(`${base}/admin/stages`, {
        method: "GET",
        headers: {
          Authorization: token,
        },
        cache: "no-store",
      }).catch(() => null);
      if (res && res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.success && Array.isArray(data.unlockedStages)) {
          return NextResponse.json(data);
        }
      }
    }

    // Public / Participant fallback
    const pubRes = await fetch(`${base}/stages`, { cache: "no-store" }).catch(() => null);
    if (pubRes && pubRes.ok) {
      const data = await pubRes.json().catch(() => ({}));
      if (data.success && Array.isArray(data.unlockedStages)) {
        return NextResponse.json(data);
      }
    }

    // Fallback 2: /event/state
    const evRes = await fetch(`${base}/event/state`, { cache: "no-store" }).catch(() => null);
    if (evRes && evRes.ok) {
      const evData = await evRes.json().catch(() => ({}));
      const stages = Array.isArray(evData.unlockedStages)
        ? evData.unlockedStages
        : Array.isArray(evData.event?.unlockedStages)
        ? evData.event.unlockedStages
        : [1];
      return NextResponse.json({ success: true, unlockedStages: stages });
    }

    return NextResponse.json({ success: true, unlockedStages: [1] });
  } catch (err: any) {
    return NextResponse.json({ success: true, unlockedStages: [1] });
  }
}
