import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedTeam } from "@/lib/server/session";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";

export async function POST(req: NextRequest) {
  try {
    // 1. Session verification
    const team = await getAuthenticatedTeam(req);
    if (!team) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED", message: "Invalid or expired session. Please login again." },
        { status: 401 }
      );
    }

    // 2. Freezing Check
    if (team.is_frozen) {
      return NextResponse.json(
        {
          success: false,
          error: "VECNA_FREEZE",
          message: `Your telemetry is frozen by Vecna. Access locked for ${team.freeze_remaining_seconds}s.`,
        },
        { status: 423 }
      );
    }

    // 3. Event State Check
    const { data: eventState } = await supabaseAdmin
      .from("event_state")
      .select("status, submissions_open")
      .eq("id", 1)
      .single();

    if (!eventState || eventState.status !== "active" || !eventState.submissions_open) {
      return NextResponse.json(
        {
          success: false,
          error: "SUBMISSIONS_CLOSED",
          message: "Submissions are currently suspended by Hawkins Command.",
        },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const questionId = String(body.questionId || "").trim();
    const rawAnswer = String(body.answer ?? "").trim();

    if (!questionId || rawAnswer === "") {
      return NextResponse.json(
        { success: false, error: "INVALID_INPUT", message: "Question ID and Answer are required." },
        { status: 400 }
      );
    }

    // 4. Retrieve Question from Secret Answers Vault
    const { data: secretQ, error: secretError } = await supabaseAdmin
      .from("question_answers")
      .select("question_id, round_number, correct_answer, accepted_answers, points")
      .eq("question_id", questionId)
      .single();

    if (secretError || !secretQ) {
      return NextResponse.json(
        { success: false, error: "QUESTION_NOT_FOUND", message: `Question ${questionId} does not exist.` },
        { status: 404 }
      );
    }

    // 5. Round Access Check: Cannot submit questions beyond unlocked round
    if (secretQ.round_number > team.current_stage) {
      return NextResponse.json(
        {
          success: false,
          error: "ROUND_LOCKED",
          message: `Round ${secretQ.round_number} is locked. Complete earlier rounds first.`,
        },
        { status: 403 }
      );
    }

    // 6. Duplicate Submission Protection (Check before inserting)
    const { data: existingSub } = await supabaseAdmin
      .from("team_submissions")
      .select("submission_id, is_correct, points_awarded")
      .eq("team_id", team.team_id)
      .eq("question_id", questionId)
      .single();

    if (existingSub) {
      return NextResponse.json(
        {
          success: false,
          error: "ALREADY_SUBMITTED",
          message: "This question was already submitted. Attempts are final.",
          isCorrect: existingSub.is_correct,
          pointsAwarded: existingSub.points_awarded,
        },
        { status: 409 }
      );
    }

    // 7. Answer Normalization & Verification (Server-Side ONLY)
    const normalizedInput = rawAnswer.toLowerCase();
    const normalizedTarget = secretQ.correct_answer.trim().toLowerCase();
    const acceptedList = (Array.isArray(secretQ.accepted_answers) ? secretQ.accepted_answers : []).map(
      (a: any) => String(a).trim().toLowerCase()
    );

    const isCorrect = normalizedInput === normalizedTarget || acceptedList.includes(normalizedInput);

    // 8. Calculate Points & Hint Deductions
    let pointsAwarded = 0;
    if (isCorrect) {
      // Check if team used hints on this question
      const { data: hintDeductions } = await supabaseAdmin
        .from("team_hint_usage")
        .select("deduction")
        .eq("team_id", team.team_id)
        .eq("question_id", questionId);

      const totalDeduction = (hintDeductions || []).reduce((sum, h) => sum + (h.deduction || 0), 0);
      pointsAwarded = Math.max(0, (secretQ.points || 5) - totalDeduction);
    }

    // 9. Transactional Submission Insert with Database Constraint
    const { error: insertError } = await supabaseAdmin.from("team_submissions").insert({
      team_id: team.team_id,
      question_id: questionId,
      round_number: secretQ.round_number,
      submitted_answer: rawAnswer,
      is_correct: isCorrect,
      points_awarded: pointsAwarded,
    });

    if (insertError) {
      // Handles race condition if two requests hit simultaneously
      if (insertError.code === "23505") {
        return NextResponse.json(
          { success: false, error: "ALREADY_SUBMITTED", message: "Concurrent attempt blocked. Question already submitted." },
          { status: 409 }
        );
      }
      throw insertError;
    }

    // 10. Update Team Total Score
    let newScore = team.total_score;
    if (pointsAwarded > 0) {
      newScore += pointsAwarded;
      await supabaseAdmin
        .from("teams")
        .update({ total_score: newScore, updated_at: new Date().toISOString() })
        .eq("team_id", team.team_id);
    }

    // 11. Check if Current Round is Fully Completed
    let stageCompleted = false;
    let nextStage = team.current_stage;

    const { count: totalQuestionsInRound } = await supabaseAdmin
      .from("question_answers")
      .select("question_id", { count: "exact", head: true })
      .eq("round_number", team.current_stage);

    const { count: submittedQuestionsInRound } = await supabaseAdmin
      .from("team_submissions")
      .select("submission_id", { count: "exact", head: true })
      .eq("team_id", team.team_id)
      .eq("round_number", team.current_stage);

    if (totalQuestionsInRound && submittedQuestionsInRound && submittedQuestionsInRound >= totalQuestionsInRound) {
      stageCompleted = true;
      nextStage = Math.min(7, team.current_stage + 1);
      await supabaseAdmin
        .from("teams")
        .update({ current_stage: nextStage, updated_at: new Date().toISOString() })
        .eq("team_id", team.team_id);

      // Automated Vecna Trigger for stage completion
      const { data: triggerMsg } = await supabaseAdmin
        .from("vecna_messages")
        .select("message_id")
        .eq("trigger_type", "ROUND")
        .eq("trigger_value", String(nextStage))
        .single();

      if (triggerMsg) {
        try {
          await supabaseAdmin
            .from("vecna_deliveries")
            .insert({ message_id: triggerMsg.message_id, team_id: team.team_id });
        } catch {}
      }
    }

    return NextResponse.json({
      success: true,
      isCorrect,
      pointsAwarded,
      totalScore: newScore,
      stageCompleted,
      currentStage: nextStage,
      message: isCorrect ? "TELEMETRY VERIFIED · CORRECT" : "INCONSISTENT SIGNAL · WRONG",
    });
  } catch (err: any) {
    console.error("[SUBMIT API ERROR]", err);
    return NextResponse.json({ success: false, error: "SERVER_ERROR", message: "Failed to process submission." }, { status: 500 });
  }
}
