import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedTeam } from "@/lib/server/session";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";

export async function POST(req: NextRequest) {
  try {
    const team = await getAuthenticatedTeam(req);
    if (!team) {
      return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const questionId = String(body.questionId || "").trim();
    const hintNumber = parseInt(body.hintNumber || 1, 10);
    const hintId = `${questionId}-h${hintNumber}`;

    if (!questionId) {
      return NextResponse.json({ success: false, error: "INVALID_INPUT" }, { status: 400 });
    }

    // 1. Fetch Hint definition
    const { data: hintDef, error: hintError } = await supabaseAdmin
      .from("question_hints")
      .select("hint_id, question_id, hint_text, deduction")
      .eq("hint_id", hintId)
      .single();

    if (hintError || !hintDef) {
      return NextResponse.json({ success: false, error: "HINT_NOT_FOUND" }, { status: 404 });
    }

    // 2. Check if Hint has already been used by this team
    const { data: existingUsage } = await supabaseAdmin
      .from("team_hint_usage")
      .select("usage_id, deduction")
      .eq("team_id", team.team_id)
      .eq("hint_id", hintId)
      .single();

    if (existingUsage) {
      // Already unlocked: return hint text with 0 additional deduction
      return NextResponse.json({
        success: true,
        hintText: hintDef.hint_text,
        deductionApplied: 0,
        alreadyUnlocked: true,
      });
    }

    // 3. Record Hint Usage in database
    const deduction = hintDef.deduction || 2;
    await supabaseAdmin.from("team_hint_usage").insert({
      team_id: team.team_id,
      hint_id: hintId,
      question_id: questionId,
      deduction: deduction,
    });

    return NextResponse.json({
      success: true,
      hintText: hintDef.hint_text,
      deductionApplied: deduction,
      alreadyUnlocked: false,
    });
  } catch (err: any) {
    console.error("[HINT API ERROR]", err);
    return NextResponse.json({ success: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
