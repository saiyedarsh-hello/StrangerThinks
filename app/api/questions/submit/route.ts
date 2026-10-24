import { NextRequest, NextResponse } from "next/server";
import { getApiBase } from "@/lib/api";
import { STAGE_QUIZ_CONFIGS } from "@/lib/chapterQuestions";

function evaluateLocally(questionId: string, answer: string) {
  const normalizedCode = questionId.toLowerCase();
  for (const config of Object.values(STAGE_QUIZ_CONFIGS)) {
    for (const q of config.questions) {
      const qId = (q.id || "").toLowerCase();
      const codeAlias = `ch${config.chapterId}-q${q.itemNumber}`.toLowerCase();
      if (qId === normalizedCode || codeAlias === normalizedCode) {
        const isCorrect = (q.correctAnswerId || "").trim().toLowerCase() === answer.trim().toLowerCase();
        return {
          success: true,
          isCorrect,
          pointsAwarded: isCorrect ? 10 : 0,
          message: isCorrect
            ? "TELEMETRY VERIFIED · DOCKET ITEM ACCURATE"
            : "EVIDENCE DISCREPANCY DETECTED · DIAGNOSTIC FAILED",
          questionId: q.id,
        };
      }
    }
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const questionId = String(body.questionId || "").trim();
    const answer = String(body.answer ?? "").trim();
    const token =
      req.cookies.get("hawkins_session_token")?.value ||
      req.headers.get("authorization")?.replace("Bearer ", "");

    if (!questionId) {
      return NextResponse.json(
        { success: false, error: "INVALID_INPUT", message: "Question ID is required." },
        { status: 400 }
      );
    }

    // 1. Attempt validation via standalone backend
    try {
      const base = getApiBase();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const res = await fetch(`${base}/questions/${encodeURIComponent(questionId)}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ answer }),
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

    // 2. Local fallback
    const localEval = evaluateLocally(questionId, answer);
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
