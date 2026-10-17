import { NextRequest, NextResponse } from "next/server";
import { getApiBase } from "@/lib/api";
import { STAGE_QUIZ_CONFIGS } from "@/lib/chapterQuestions";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ trialId: string; questionIdx: string }> }
) {
  try {
    const resolvedParams = await params;
    const trialId = parseInt(resolvedParams.trialId, 10);
    const questionIdx = parseInt(resolvedParams.questionIdx, 10);

    if (isNaN(trialId) || isNaN(questionIdx)) {
      return NextResponse.json(
        { success: false, error: "INVALID_INPUT", message: "Trial ID and question index are required." },
        { status: 400 }
      );
    }

    const token =
      req.cookies.get("hawkins_session_token")?.value ||
      req.headers.get("authorization")?.replace("Bearer ", "");

    // 1. Attempt forward to standalone Express backend
    try {
      const base = getApiBase();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const res = await fetch(`${base}/vecna/trials/${trialId}/questions/${questionIdx}/clue`, {
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
    } catch {
      // Backend unavailable; proceed to local hint resolution
    }

    // 2. Authoritative local hint retrieval from STAGE_QUIZ_CONFIGS
    const config = STAGE_QUIZ_CONFIGS[trialId];
    const q = config?.questions?.[questionIdx];
    if (!q) {
      return NextResponse.json(
        { success: false, error: "QUESTION_NOT_FOUND", message: "Item not found in classified archive." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      hint: q.hint || "Review covert frequency telemetry.",
      pointsDeducted: 5,
      message: "Intel clue decrypted (-5 PTS).",
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR", message: err.message },
      { status: 500 }
    );
  }
}
