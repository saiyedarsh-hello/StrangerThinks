import { NextRequest, NextResponse } from "next/server";
import { getApiBase } from "@/lib/api";
import { STAGE_QUIZ_CONFIGS } from "@/lib/chapterQuestions";

export async function POST(
  req: NextRequest,
  { params }: { params: { trialId: string; questionIdx: string } }
) {
  try {
    const trialId = parseInt(params.trialId, 10);
    const questionIdx = parseInt(params.questionIdx, 10);
    const body = await req.json().catch(() => ({}));
    const answer = String(body.answer || "").trim();
    const attemptNumber = Math.max(1, parseInt(body.attemptNumber || 1, 10));

    if (isNaN(trialId) || isNaN(questionIdx) || !answer) {
      return NextResponse.json(
        { success: false, error: "INVALID_INPUT", message: "Trial ID, question index and answer are required." },
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

      const res = await fetch(`${base}/vecna/trials/${trialId}/questions/${questionIdx}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ answer, attemptNumber }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        return NextResponse.json(data, { status: res.status });
      }
    } catch {
      // Backend unavailable; proceed to local evaluation
    }

    // 2. Authoritative local evaluation from STAGE_QUIZ_CONFIGS
    const config = STAGE_QUIZ_CONFIGS[trialId];
    const q = config?.questions?.[questionIdx];
    if (!q) {
      return NextResponse.json(
        { success: false, error: "QUESTION_NOT_FOUND", message: "Item not found in classified archive." },
        { status: 404 }
      );
    }

    const normAnswer = answer.toLowerCase();
    const expectedId = (q.correctAnswerId || "").trim().toLowerCase();
    let isCorrect = normAnswer === expectedId;

    if (!isCorrect && q.options) {
      const correctOpt = q.options.find(
        (opt) => (opt.id || "").trim().toLowerCase() === expectedId
      );
      if (correctOpt) {
        const optText = (correctOpt.text || "").trim().toLowerCase();
        if (
          normAnswer === optText ||
          normAnswer.startsWith(expectedId) ||
          (optText.includes(normAnswer) && normAnswer.length > 3) ||
          (normAnswer.includes(optText) && optText.length > 3)
        ) {
          isCorrect = true;
        }
      }
    }

    if (isCorrect) {
      const pointsAwarded = attemptNumber <= 1 ? 10 : 5;
      return NextResponse.json({
        success: true,
        isCorrect: true,
        isLocked: true,
        pointsAwarded,
        attempts: attemptNumber,
        nextQuestionIdx: Math.min(9, questionIdx + 1),
        message: attemptNumber <= 1
          ? `LEVEL ${questionIdx + 1} OVERRIDE CONFIRMED (+10 PTS)`
          : `LEVEL ${questionIdx + 1} OVERRIDE CONFIRMED (+5 PTS)`,
      });
    } else {
      const isLocked = attemptNumber >= 2;
      return NextResponse.json({
        success: true,
        isCorrect: false,
        isLocked,
        pointsAwarded: 0,
        attempts: attemptNumber,
        attemptsRemaining: isLocked ? 0 : 1,
        nextQuestionIdx: isLocked ? Math.min(9, questionIdx + 1) : questionIdx,
        message: isLocked
          ? "TERMINAL LOCKED · 2/2 ATTEMPTS EXHAUSTED [0 PTS]"
          : "INCORRECT · VALUE REDUCED TO 5 PTS (1 ATTEMPT REMAINING)",
      });
    }
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR", message: err.message },
      { status: 500 }
    );
  }
}
