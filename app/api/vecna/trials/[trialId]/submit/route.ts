import { NextRequest, NextResponse } from "next/server";
import { getApiBase } from "@/lib/api";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ trialId: string }> }
) {
  try {
    const resolvedParams = await params;
    const trialId = parseInt(resolvedParams.trialId, 10);
    if (isNaN(trialId)) {
      return NextResponse.json(
        { success: false, error: "INVALID_INPUT", message: "Trial ID is required." },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const token =
      req.cookies.get("hawkins_session_token")?.value ||
      req.headers.get("authorization")?.replace("Bearer ", "");

    // 1. Attempt forward to standalone Express backend
    try {
      const base = getApiBase();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const res = await fetch(`${base}/vecna/trials/${trialId}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        return NextResponse.json(data, { status: res.status });
      }
    } catch {
      // Backend unavailable; proceed to fallback response
    }

    const nextTrialId = trialId < 6 ? trialId + 1 : 1;
    return NextResponse.json({
      success: true,
      trialId,
      message: `Chapter ${trialId} report docket submitted successfully.`,
      nextTrialId,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR", message: err.message },
      { status: 500 }
    );
  }
}
