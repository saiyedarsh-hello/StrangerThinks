import { NextRequest, NextResponse } from "next/server";
import { getApiBase } from "@/lib/api";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const questionId = String(body.questionId || "").trim();
    const hintNumber = parseInt(body.hintNumber || 1, 10);
    const token =
      req.cookies.get("hawkins_session_token")?.value ||
      req.headers.get("authorization")?.replace("Bearer ", "");

    if (!questionId) {
      return NextResponse.json({ success: false, error: "INVALID_INPUT" }, { status: 400 });
    }

    try {
      const base = getApiBase();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const res = await fetch(`${base}/questions/${encodeURIComponent(questionId)}/hints/${hintNumber}/use`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        return NextResponse.json(data, { status: res.status });
      }
    } catch (backendErr) {
      // Backend offline; proceed to fallback
    }

    // Local fallback: allow hint unlock
    return NextResponse.json({
      success: true,
      hintUnlocked: true,
      cost: 5,
      message: "Intel clue decrypted.",
    });
  } catch (err: any) {
    console.error("[HINT USE ERROR]", err);
    return NextResponse.json({ success: true, hintUnlocked: true, cost: 5 });
  }
}
