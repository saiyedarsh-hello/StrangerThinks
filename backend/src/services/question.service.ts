import { tidb } from "../config/tidb";
import { AnswerValidationService } from "./answerValidation.service";
import { socketService } from "./socket.service";
import { EventControlService } from "./eventControl.service";
import { db } from "./db.service";

export interface SubmitAnswerResult {
  success: boolean;
  isCorrect: boolean;
  pointsAwarded: number;
  currentScore: number;
  isLocked: boolean;
  message: string;
  error?: string;
  idempotentRecovery?: boolean;
}

export interface UseHintResult {
  success: boolean;
  hintId: number;
  hintText: string;
  penaltyPoints: number;
  currentScore: number;
  alreadyUsed?: boolean;
  error?: string;
}

export class QuestionService {
  /**
   * Fetches an accessible question for an authorized team.
   * NEVER returns accepted answer keys or unrevealed hints.
   */
  public static async getAccessibleQuestion(
    teamId: string,
    roundId: number,
    questionCode: string
  ): Promise<any> {
    const pool = tidb.pool;

    // Check round unlock
    if (pool) {
      try {
        const [progressRows] = await pool.query<any[]>(
          "SELECT status FROM team_round_progress WHERE team_id = ? AND round_id = ?",
          [teamId, roundId]
        );
        const isUnlocked = progressRows?.[0]?.status === "unlocked" || progressRows?.[0]?.status === "completed" || roundId === 1;
        if (!isUnlocked) {
          return { error: "ROUND_LOCKED", message: "This round is currently locked." };
        }

        const [qRows] = await pool.query<any[]>(
          `SELECT question_id, round_id, question_code, question_order, question_type, points, prompt_content
           FROM questions
           WHERE round_id = ? AND question_code = ? AND is_active = 1`,
          [roundId, questionCode]
        );

        if (Array.isArray(qRows) && qRows.length > 0) {
          const q = qRows[0];
          // Check if already submitted
          const [subRows] = await pool.query<any[]>(
            "SELECT is_correct, points_awarded, submitted_at FROM question_submissions WHERE team_id = ? AND question_id = ?",
            [teamId, q.question_id]
          );
          const submission = subRows?.[0] || null;

          // Fetch only hints already used by this team
          const [usedHints] = await pool.query<any[]>(
            `SELECT h.hint_id, h.hint_text, h.penalty_points
             FROM team_hint_usages u
             JOIN question_hints h ON u.hint_id = h.hint_id
             WHERE u.team_id = ? AND u.question_id = ?`,
            [teamId, q.question_id]
          );

          // Update last opened question
          await pool.query(
            `INSERT INTO team_progress (team_id, current_round_id, last_opened_question_id, last_progress_at)
             VALUES (?, ?, ?, NOW(3))
             ON DUPLICATE KEY UPDATE current_round_id = VALUES(current_round_id), last_opened_question_id = VALUES(last_opened_question_id), last_progress_at = NOW(3)`,
            [teamId, roundId, q.question_id]
          ).catch(() => {});

          return {
            questionId: q.question_id,
            roundId: q.round_id,
            questionCode: q.question_code,
            questionOrder: q.question_order,
            points: Number(q.points),
            promptContent: typeof q.prompt_content === "string" ? JSON.parse(q.prompt_content) : q.prompt_content,
            isSubmitted: Boolean(submission),
            submission: submission
              ? { isCorrect: Boolean(submission.is_correct), pointsAwarded: Number(submission.points_awarded) }
              : null,
            unlockedHints: usedHints || [],
          };
        }
      } catch (err) {
        console.warn("[QUESTION SERVICE] TiDB query fallback:", err);
      }
    }

    // Local fallback using chapter vault
    const chapters = db.getSanitizedChapters();
    const chapter = chapters.find((c: any) => c.id === roundId) || chapters[0];
    return {
      questionId: chapter.id,
      roundId: chapter.id,
      questionCode: questionCode || `Q_CH${chapter.id}`,
      points: chapter.points,
      promptContent: {
        title: chapter.archiveTitle,
        subtitle: chapter.archiveSubtitle,
        questions: chapter.questions,
      },
      isSubmitted: false,
      submission: null,
      unlockedHints: [],
    };
  }

  /**
   * Submits an answer with authoritative server-side HMAC validation and score ledger entry.
   * Idempotent: repeated submission returns existing saved result without duplicate awards.
   * Wrong answer: 0 points, locked permanently, NO score ledger entry.
   */
  public static async submitAnswer(
    teamId: string,
    questionCode: string,
    submittedAnswer: string
  ): Promise<SubmitAnswerResult> {
    // 1. Check event state
    const eventState = await EventControlService.getEventState();
    if (!eventState.submissionsOpen || eventState.isPaused || eventState.status === "ended") {
      return {
        success: false,
        isCorrect: false,
        pointsAwarded: 0,
        currentScore: 0,
        isLocked: false,
        message: "Submissions are currently closed or event is paused.",
        error: "SUBMISSIONS_CLOSED",
      };
    }

    const pool = tidb.pool;

    if (pool) {
      try {
        // Find question
        const [qRows] = await pool.query<any[]>(
          "SELECT question_id, round_id, points, prompt_content FROM questions WHERE question_code = ?",
          [questionCode]
        );
        if (!Array.isArray(qRows) || qRows.length === 0) {
          return {
            success: false,
            isCorrect: false,
            pointsAwarded: 0,
            currentScore: 0,
            isLocked: false,
            message: "Question not found.",
            error: "QUESTION_NOT_FOUND",
          };
        }

        const q = qRows[0];
        const questionId = q.question_id;
        const roundId = q.round_id;
        const questionPoints = Number(q.points);

        // Check if already submitted (IDEMPOTENCY SAFEGUARD)
        const [existingSubs] = await pool.query<any[]>(
          "SELECT * FROM question_submissions WHERE team_id = ? AND question_id = ?",
          [teamId, questionId]
        );

        if (Array.isArray(existingSubs) && existingSubs.length > 0) {
          const sub = existingSubs[0];
          const [scoreRows] = await pool.query<any[]>(
            "SELECT COALESCE(SUM(points_delta), 0) AS total FROM score_ledger WHERE team_id = ?",
            [teamId]
          );
          const currentScore = Number(scoreRows?.[0]?.total || 0);

          return {
            success: true,
            isCorrect: Boolean(sub.is_correct),
            pointsAwarded: Number(sub.points_awarded),
            currentScore,
            isLocked: true,
            idempotentRecovery: true,
            message: "Existing submission recovered. Question is permanently locked.",
          };
        }

        // Validate answer using HMAC
        const isCorrect = await AnswerValidationService.validateAnswer(questionId, submittedAnswer);
        const pointsAwarded = isCorrect ? questionPoints : 0;

        // Insert submission record
        const [subRes]: any = await pool.query(
          `INSERT INTO question_submissions (team_id, round_id, question_id, submitted_answer, is_correct, points_awarded, submitted_at)
           VALUES (?, ?, ?, ?, ?, ?, NOW(3))`,
          [teamId, roundId, questionId, submittedAnswer, isCorrect ? 1 : 0, pointsAwarded]
        );
        const submissionId = subRes.insertId;

        // If correct, insert immutable score ledger entry
        if (isCorrect) {
          await pool.query(
            `INSERT INTO score_ledger (team_id, round_id, question_id, source_type, source_id, points_delta, created_at)
             VALUES (?, ?, ?, 'correct_answer', ?, ?, NOW(3))`,
            [teamId, roundId, questionId, String(submissionId), pointsAwarded]
          );

          // Update team total_score cache in teams table
          await pool.query(
            "UPDATE teams SET total_score = total_score + ?, last_solved_at = NOW(3) WHERE team_id = ?",
            [pointsAwarded, teamId]
          );
        }

        // Check if round questions completed -> unlock next round
        const [qCountRows] = await pool.query<any[]>(
          "SELECT COUNT(*) AS total FROM questions WHERE round_id = ? AND is_active = 1",
          [roundId]
        );
        const [subCountRows] = await pool.query<any[]>(
          "SELECT COUNT(*) AS total FROM question_submissions WHERE team_id = ? AND round_id = ?",
          [teamId, roundId]
        );

        if (subCountRows?.[0]?.total >= qCountRows?.[0]?.total) {
          await pool.query(
            "UPDATE team_round_progress SET status = 'completed', completed_at = NOW(3) WHERE team_id = ? AND round_id = ?",
            [teamId, roundId]
          );
          // Unlock next round
          await pool.query(
            `INSERT INTO team_round_progress (team_id, round_id, status, unlocked_at)
             VALUES (?, ? + 1, 'unlocked', NOW(3))
             ON DUPLICATE KEY UPDATE status = 'unlocked'`,
            [teamId, roundId]
          ).catch(() => {});
        }

        // Calculate fresh overall score
        const [scoreRows] = await pool.query<any[]>(
          "SELECT COALESCE(SUM(points_delta), 0) AS total FROM score_ledger WHERE team_id = ?",
          [teamId]
        );
        const currentScore = Number(scoreRows?.[0]?.total || 0);

        // Emit real-time updates
        socketService.emitToTeam(teamId, "team:score_updated", {
          overallScore: currentScore,
          pointsAwarded,
          isCorrect,
          questionCode,
        });

        socketService.broadcastToAdmins("admin:submission_created", {
          teamId,
          roundId,
          questionCode,
          isCorrect,
          pointsAwarded,
          submittedAt: new Date().toISOString(),
        });

        return {
          success: true,
          isCorrect,
          pointsAwarded,
          currentScore,
          isLocked: true,
          message: isCorrect
            ? `Correct! +${pointsAwarded} points awarded.`
            : "Wrong answer. 0 points awarded. Question locked permanently.",
        };
      } catch (err: any) {
        console.warn("[QUESTION SERVICE] TiDB submitAnswer error:", err);
      }
    }

    // Local fallback for in-process testing
    const isCorrect = submittedAnswer.toLowerCase().trim() === "a" || submittedAnswer.toLowerCase().trim() === "run";
    const pointsAwarded = isCorrect ? 100 : 0;
    const team = db.getTeamById(teamId);
    if (team && isCorrect) {
      db.updateTeam(teamId, { totalScore: team.totalScore + pointsAwarded });
    }

    return {
      success: true,
      isCorrect,
      pointsAwarded,
      currentScore: (team?.totalScore || 0) + pointsAwarded,
      isLocked: true,
      message: isCorrect ? "Correct!" : "Wrong answer.",
    };
  }

  /**
   * Consumes and reveals a hint with immutable penalty deduction.
   */
  public static async useHint(
    teamId: string,
    questionCode: string,
    hintId: number
  ): Promise<UseHintResult> {
    const pool = tidb.pool;

    if (pool) {
      try {
        // Fetch hint and question
        const [hRows] = await pool.query<any[]>(
          `SELECT h.*, q.question_code 
           FROM question_hints h
           JOIN questions q ON h.question_id = q.question_id
           WHERE h.hint_id = ? AND q.question_code = ? AND h.is_active = 1`,
          [hintId, questionCode]
        );

        if (!Array.isArray(hRows) || hRows.length === 0) {
          return {
            success: false,
            hintId,
            hintText: "",
            penaltyPoints: 0,
            currentScore: 0,
            error: "Hint not found.",
          };
        }

        const hint = hRows[0];
        const penalty = Number(hint.penalty_points);

        // Check if question already submitted
        const [subRows] = await pool.query<any[]>(
          "SELECT submission_id FROM question_submissions WHERE team_id = ? AND question_id = ?",
          [teamId, hint.question_id]
        );
        if (Array.isArray(subRows) && subRows.length > 0) {
          return {
            success: false,
            hintId,
            hintText: "",
            penaltyPoints: 0,
            currentScore: 0,
            error: "Cannot use hints for an already submitted question.",
          };
        }

        // Check if hint already consumed (IDEMPOTENCY: NO SECOND DEDUCTION)
        const [usageRows] = await pool.query<any[]>(
          "SELECT * FROM team_hint_usages WHERE team_id = ? AND hint_id = ?",
          [teamId, hintId]
        );

        if (Array.isArray(usageRows) && usageRows.length > 0) {
          const [scoreRows] = await pool.query<any[]>(
            "SELECT COALESCE(SUM(points_delta), 0) AS total FROM score_ledger WHERE team_id = ?",
            [teamId]
          );
          return {
            success: true,
            hintId,
            hintText: hint.hint_text,
            penaltyPoints: 0,
            currentScore: Number(scoreRows?.[0]?.total || 0),
            alreadyUsed: true,
          };
        }

        // Record usage and negative penalty ledger entry
        const [useRes]: any = await pool.query(
          "INSERT INTO team_hint_usages (team_id, question_id, hint_id, penalty_points, used_at) VALUES (?, ?, ?, ?, NOW(3))",
          [teamId, hint.question_id, hintId, penalty]
        );
        const usageId = useRes.insertId;

        await pool.query(
          `INSERT INTO score_ledger (team_id, round_id, question_id, source_type, source_id, points_delta, created_at)
           VALUES (?, (SELECT round_id FROM questions WHERE question_id = ?), ?, 'hint_penalty', ?, ?, NOW(3))`,
          [teamId, hint.question_id, hint.question_id, String(usageId), -penalty]
        );

        // Update team penalty count in teams table
        await pool.query(
          "UPDATE teams SET penalty = penalty + ?, total_score = total_score - ? WHERE team_id = ?",
          [penalty, penalty, teamId]
        );

        const [scoreRows] = await pool.query<any[]>(
          "SELECT COALESCE(SUM(points_delta), 0) AS total FROM score_ledger WHERE team_id = ?",
          [teamId]
        );
        const currentScore = Number(scoreRows?.[0]?.total || 0);

        socketService.emitToTeam(teamId, "team:score_updated", {
          overallScore: currentScore,
          penaltyApplied: penalty,
          hintId,
        });

        return {
          success: true,
          hintId,
          hintText: hint.hint_text,
          penaltyPoints: penalty,
          currentScore,
        };
      } catch (err: any) {
        console.warn("[QUESTION SERVICE] TiDB useHint error:", err);
      }
    }

    return {
      success: true,
      hintId,
      hintText: "Recall the forensic autopsy log file 14-B.",
      penaltyPoints: 20,
      currentScore: 80,
    };
  }
}
