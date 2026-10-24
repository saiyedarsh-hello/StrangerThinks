import { NextRequest, NextResponse } from "next/server";
import { getApiBase } from "@/lib/api";
import { STAGE_QUIZ_CONFIGS } from "@/lib/chapterQuestions";

function evaluateLocally(questionCode: string, answer: string, attemptNumber: number = 1) {
  const normalizedCode = questionCode.toLowerCase();
  for (const config of Object.values(STAGE_QUIZ_CONFIGS)) {
    for (const q of config.questions) {
      const qId = (q.id || "").toLowerCase();
      const codeAlias = `ch${config.chapterId}-q${q.itemNumber}`.toLowerCase();
      if (qId === normalizedCode || codeAlias === normalizedCode) {
        const isCorrect = (q.correctAnswerId || "").trim().toLowerCase() === answer.trim().toLowerCase();
        if (isCorrect) {
          const pointsAwarded = attemptNumber <= 1 ? 10 : 5;
          return {
            success: true,
            isCorrect: true,
            isLocked: true,
            pointsAwarded,
            attempts: attemptNumber,
            message:
              attemptNumber <= 1
                ? "TELEMETRY VERIFIED · DOCKET ITEM ACCURATE [+10 PTS]"
                : "TELEMETRY VERIFIED ON SECOND ATTEMPT [+5 PTS]",
            questionId: q.id,
          };
        } else {
          const isLocked = attemptNumber >= 2;
          return {
            success: true,
            isCorrect: false,
            isLocked,
            availablePoints: isLocked ? 0 : 5,
            pointsAwarded: 0,
            attempts: attemptNumber,
            attemptsRemaining: isLocked ? 0 : 1,
            message: isLocked
              ? "TERMINAL LOCKED · 2/2 ATTEMPTS EXHAUSTED [0 PTS]"
              : "EVIDENCE DISCREPANCY DETECTED · VALUE REDUCED TO 5 PTS (1 ATTEMPT REMAINING)",
            questionId: q.id,
          };
        }
      }
    }
  }
  return null;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ questionCode: string }> }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const questionCode = resolvedParams.questionCode;
    const body = await req.json().catch(() => ({}));
    const answer = String(body.answer ?? "").trim();
    const attemptNumber = Math.max(1, Number(body.attemptNumber) || 1);
    const token =
      req.cookies.get("hawkins_session_token")?.value ||
      req.headers.get("authorization")?.replace("Bearer ", "");

    if (!questionCode) {
      return NextResponse.json(
        { success: false, error: "INVALID_INPUT", message: "Question code is required." },
        { status: 400 }
      );
    }

    // 1. Attempt authoritative validation via standalone backend
    try {
      const base = getApiBase();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const res = await fetch(`${base}/questions/${encodeURIComponent(questionCode)}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ answer, teamId: body.teamId, attemptNumber }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        return NextResponse.json(data, { status: res.status });
      }
    } catch (backendErr) {
      // Standalone backend is offline or timed out; proceed to local evaluation fallback
    }

    // 2. Resilient local fallback when backend is unreachable
    const localEval = evaluateLocally(questionCode, answer, attemptNumber);
    if (localEval) {
      return NextResponse.json(localEval, { status: 200 });
    }

    return NextResponse.json(
      { success: false, error: "QUESTION_NOT_FOUND", message: "Question not recognized." },
      { status: 404 }
    );
  } catch (err: any) {
    console.error("[QUESTION SUBMIT ERROR]", err);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR", message: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
