import { tidb } from "../config/tidb";
import { AnswerValidationService } from "./answerValidation.service";
import { socketService } from "./socket.service";
import { EventControlService } from "./eventControl.service";
import { db } from "./db.service";
import { RAW_CHAPTER_QUESTIONS } from "../config/vault";

export interface SubmitAnswerResult {
  success: boolean;
  isCorrect: boolean;
  pointsAwarded: number;
  currentScore: number;
  isLocked: boolean;
  message: string;
  attemptsRemaining?: number;
  availablePoints?: number;
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
    submittedAnswer: string,
    attemptNumber: number = 1
  ): Promise<SubmitAnswerResult> {
    // 1. Check event state
    const eventState = await EventControlService.getEventState();
    if (eventState.status === "ended") {
      return {
        success: false,
        isCorrect: false,
        pointsAwarded: 0,
        currentScore: 0,
        isLocked: false,
        message: "Tournament has ended. Submissions are closed.",
        error: "EVENT_ENDED",
      };
    }
    if (eventState.isPaused) {
      return {
        success: false,
        isCorrect: false,
        pointsAwarded: 0,
        currentScore: 0,
        isLocked: false,
        message: "Tournament is currently paused.",
        error: "EVENT_PAUSED",
      };
    }
    if (!eventState.submissionsOpen) {
      return {
        success: false,
        isCorrect: false,
        pointsAwarded: 0,
        currentScore: 0,
        isLocked: false,
        message: "Submissions are currently closed.",
        error: "EVENT_PAUSED",
      };
    }

    // Stage Locking Enforcement (Condition A: prior stage cleared, Condition B: admin authorization)
    const stageMatch = questionCode.match(/^(?:ch|stage)[\-_]?(\d+)/i);
    if (stageMatch) {
      const stageNumber = parseInt(stageMatch[1], 10);
      if (!EventControlService.isStageUnlocked(stageNumber, "hawkins")) {
        return {
          success: false,
          isCorrect: false,
          pointsAwarded: 0,
          currentScore: 0,
          isLocked: false,
          message: `Stage ${stageNumber} is locked pending command authorization.`,
          error: "STAGE_LOCKED",
        };
      }
      if (stageNumber > 1 && !db.isTeamStageCleared(teamId, stageNumber - 1)) {
        return {
          success: false,
          isCorrect: false,
          pointsAwarded: 0,
          currentScore: 0,
          isLocked: false,
          message: `Stage ${stageNumber} is locked. You must clear Stage ${stageNumber - 1} first.`,
          error: "STAGE_LOCKED",
        };
      }
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
        const questionPoints = Number(q.points) || 10;

        // Ensure team exists in TiDB teams table to guarantee foreign key integrity
        const [tRows] = await pool.query<any[]>("SELECT team_id FROM teams WHERE team_id = ?", [teamId]);
        if (!Array.isArray(tRows) || tRows.length === 0) {
          const mem = db.getTeamById(teamId);
          if (mem) {
            await db.persistTeamToTiDB(mem);
          }
        }

        // Check if already submitted (IDEMPOTENCY SAFEGUARD)
        const [existingSubs] = await pool.query<any[]>(
          "SELECT * FROM question_submissions WHERE team_id = ? AND question_id = ?",
          [teamId, questionId]
        );

        let isSecondAttempt = attemptNumber >= 2;
        let priorAttemptRow: any = null;

        if (Array.isArray(existingSubs) && existingSubs.length > 0) {
          priorAttemptRow = existingSubs[0];
          const isPriorCorrect = Boolean(priorAttemptRow.is_correct);
          const priorAttemptsCount = Number(priorAttemptRow.attempt_number || 1);

          if (isPriorCorrect || priorAttemptsCount >= 2) {
            const [scoreRows] = await pool.query<any[]>(
              "SELECT COALESCE(SUM(points_delta), 0) AS total FROM score_ledger WHERE team_id = ?",
              [teamId]
            );
            const currentScore = Number(scoreRows?.[0]?.total || 0);

            return {
              success: true,
              isCorrect: isPriorCorrect,
              pointsAwarded: Number(priorAttemptRow.points_awarded || 0),
              currentScore,
              isLocked: true,
              idempotentRecovery: true,
              message: isPriorCorrect
                ? "Question already solved and locked."
                : "Terminal locked: 2/2 attempts exhausted (0 PTS).",
            };
          }

          // Prior attempt was attempt 1 and failed -> this submission is Attempt 2!
          isSecondAttempt = true;
        }

        // Find fallback answer from vault if needed
        let expectedFallbackAnswer = "";
        for (const chList of Object.values(RAW_CHAPTER_QUESTIONS)) {
          const found = chList.find(
            (item) => item.id === questionCode || String(item.itemNumber) === String(questionCode)
          );
          if (found) {
            expectedFallbackAnswer = found.correctAnswerId;
            break;
          }
        }

        // Validate answer using HMAC
        const isCorrect = await AnswerValidationService.validateAnswer(
          questionId,
          submittedAnswer,
          expectedFallbackAnswer
        );
        const pointsAwarded = isCorrect ? (isSecondAttempt ? 10 : 20) : 0;
        const isLocked = isCorrect || isSecondAttempt;

        if (!isLocked) {
          // Attempt 1 failed: record Attempt 1 in TiDB and memory, allow Attempt 2 for 10 PTS
          await pool.query(
            `INSERT INTO question_submissions (team_id, round_id, question_id, submitted_answer, is_correct, points_awarded, attempt_number, submitted_at)
             VALUES (?, ?, ?, ?, 0, 0, 1, NOW(3))
             ON DUPLICATE KEY UPDATE submitted_answer = VALUES(submitted_answer), is_correct = 0, points_awarded = 0, attempt_number = 1, submitted_at = NOW(3)`,
            [teamId, roundId, questionId, submittedAnswer]
          ).catch((e: any) => console.warn("[SUBMISSION ATT 1 WARN]", e.message));

          db.recordPlayerAttempt(teamId, roundId, questionCode, "attempted", 0, submittedAnswer, 1);

          const [scoreRows] = await pool.query<any[]>(
            "SELECT COALESCE(SUM(points_delta), 0) AS total FROM score_ledger WHERE team_id = ?",
            [teamId]
          );
          const currentScore = Number(scoreRows?.[0]?.total || 0);
          return {
            success: true,
            isCorrect: false,
            pointsAwarded: 0,
            currentScore,
            isLocked: false,
            message: "EVIDENCE DISCREPANCY DETECTED · VALUE REDUCED TO 10 PTS (1 ATTEMPT REMAINING)",
          };
        }

        // Use atomic transaction for submission and ledger
        const conn = await pool.getConnection();
        let submissionId: any = priorAttemptRow?.submission_id || null;
        try {
          await conn.beginTransaction();

          if (isSecondAttempt) {
            await conn.query(
              `UPDATE question_submissions 
               SET submitted_answer = ?, is_correct = ?, points_awarded = ?, attempt_number = 2, submitted_at = NOW(3)
               WHERE team_id = ? AND question_id = ?`,
              [submittedAnswer, isCorrect ? 1 : 0, pointsAwarded, teamId, questionId]
            );
          } else {
            const [subRes]: any = await conn.query(
              `INSERT INTO question_submissions (team_id, round_id, question_id, submitted_answer, is_correct, points_awarded, attempt_number, submitted_at)
               VALUES (?, ?, ?, ?, ?, ?, 1, NOW(3))
               ON DUPLICATE KEY UPDATE submitted_answer = VALUES(submitted_answer), is_correct = VALUES(is_correct), points_awarded = VALUES(points_awarded), attempt_number = 1, submitted_at = NOW(3)`,
              [teamId, roundId, questionId, submittedAnswer, isCorrect ? 1 : 0, pointsAwarded]
            );
            submissionId = subRes.insertId;
          }
          db.recordPlayerAttempt(teamId, roundId, questionCode, isCorrect ? "solved" : "failed", pointsAwarded, submittedAnswer, isSecondAttempt ? 2 : 1);

          // 2. If correct, insert immutable score ledger entry and update teams table
          if (isCorrect) {
            await conn.query(
              `INSERT INTO score_ledger (team_id, round_id, question_id, source_type, source_id, points_delta, created_at)
               VALUES (?, ?, ?, 'QUESTION_SUBMISSION', ?, ?, NOW(3))`,
              [teamId, roundId, questionId, String(submissionId), pointsAwarded]
            );

            // Update team cached total_score in teams table
            await conn.query(
              "UPDATE teams SET total_score = total_score + ?, last_solved_at = NOW(3) WHERE team_id = ?",
              [pointsAwarded, teamId]
            );
          }

          // 3. Check if all round questions submitted -> mark round completed and unlock next round
          const [qCountRows] = await conn.query<any[]>(
            "SELECT COUNT(*) AS total FROM questions WHERE round_id = ? AND is_active = 1",
            [roundId]
          );
          const [subCountRows] = await conn.query<any[]>(
            "SELECT COUNT(*) AS total FROM question_submissions WHERE team_id = ? AND round_id = ?",
            [teamId, roundId]
          );

          if (subCountRows?.[0]?.total >= qCountRows?.[0]?.total) {
            await conn.query(
              "UPDATE team_round_progress SET status = 'completed', completed_at = NOW(3) WHERE team_id = ? AND round_id = ?",
              [teamId, roundId]
            );
            await conn.query(
              `INSERT INTO team_round_progress (team_id, round_id, status, unlocked_at)
               VALUES (?, ? + 1, 'unlocked', NOW(3))
               ON DUPLICATE KEY UPDATE status = 'unlocked'`,
              [teamId, roundId]
            ).catch(() => {});
          }

          await conn.commit();
        } catch (txErr) {
          await conn.rollback();
          throw txErr;
        } finally {
          conn.release();
        }

        // Calculate fresh overall score from score_ledger
        const [scoreRows] = await pool.query<any[]>(
          "SELECT COALESCE(SUM(points_delta), 0) AS total FROM score_ledger WHERE team_id = ?",
          [teamId]
        );
        const currentScore = Number(scoreRows?.[0]?.total || 0);

        // Re-query the round question/submission counts after the transaction so
        // we can determine whether the round is fully completed outside the tx scope.
        let qTotal = 10; // safe default
        let subTotal = 0;
        try {
          const [qCnt] = await pool.query<any[]>(
            "SELECT COUNT(*) AS total FROM questions WHERE round_id = ? AND is_active = 1",
            [roundId]
          );
          const [sCnt] = await pool.query<any[]>(
            "SELECT COUNT(*) AS total FROM question_submissions WHERE team_id = ? AND round_id = ?",
            [teamId, roundId]
          );
          qTotal = Number(qCnt?.[0]?.total || 10);
          subTotal = Number(sCnt?.[0]?.total || 0);
        } catch { /* keep defaults */ }

        // Synchronize in-memory db.teams so db.getLeaderboard() matches TiDB
        const memTeam = db.getTeamById(teamId);
        if (memTeam) {
          const completedTasks = Array.from(new Set([...(memTeam.completedTasks || []), questionCode]));

          // IMPORTANT: Only mark a chapter/stage as "solved" in memory once ALL
          // questions for that round have been submitted.  Prematurely adding
          // roundId here was causing admin "View Performance" to show Stage N as
          // Completed and Stage N+1 as "In Progress" after answering just 1 question.
          let solvedChapters = [...(memTeam.solvedChapters || [])];
          const roundFullyCompleted = qTotal > 0 && subTotal >= qTotal;
          if (roundFullyCompleted) {
            solvedChapters = Array.from(new Set([...solvedChapters, roundId]));
          }

          db.updateTeam(teamId, {
            totalScore: currentScore,
            completedTasks,
            solvedChapters,
            // Advance currentStage pointer only when the round is fully done
            currentStage: roundFullyCompleted
              ? Math.min(6, roundId + 1)
              : (memTeam as any).currentStage || roundId,
            lastSolvedAt: new Date().toISOString(),
          });
        }

        // Real-time broadcasts: score:update across team room, admins room, and public broadcast
        const scorePayload = {
          type: "SCORE_UPDATE",
          teamId,
          newScore: currentScore,
          score: currentScore,
          delta: pointsAwarded,
          reason: "SUBMISSION",
          source: "QUESTION_SUBMISSION",
          questionCode,
          ts: Date.now(),
        };

        socketService.emitToTeam(teamId, "score:update", scorePayload);
        socketService.broadcastToAdmins("score:update", scorePayload);
        socketService.broadcast("score:update", scorePayload);
        socketService.broadcastToVecna("score:update", scorePayload);
        socketService.broadcastToVecna("vecna:tactical_update", {
          teamId,
          stageId: Math.min(6, roundId + 1),
          ts: Date.now(),
        });

        // Also emit team:score_updated and admin:submission_created for backwards compatibility
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

        // Broadcast updated leaderboard to all clients and admin dashboard
        socketService.broadcastLeaderboard();

        return {
          success: true,
          isCorrect,
          pointsAwarded,
          currentScore,
          isLocked: true,
          message: isCorrect
            ? (attemptNumber <= 1 ? "CORRECT! Solution verified by central cipher [+10 PTS]." : "CORRECT ON SECOND ATTEMPT [+5 PTS].")
            : "TERMINAL LOCKED · 2/2 ATTEMPTS EXHAUSTED [0 PTS].",
        };
      } catch (err: any) {
        console.warn("[QUESTION SERVICE] TiDB submitAnswer error:", err);
      }
    }

    // Local fallback for in-process testing using the secret vault
    const team = db.getTeamById(teamId);
    if (!team) {
      return {
        success: false,
        isCorrect: false,
        pointsAwarded: 0,
        currentScore: 0,
        isLocked: false,
        message: "Team not found.",
        error: "TEAM_NOT_FOUND",
      };
    }

    const completed = team.completedTasks || [];
    const pastSubs = db.getPlayerSubmissions(teamId);
    const existingSub = pastSubs.find((s) => s.questionCode.toLowerCase() === questionCode.toLowerCase());

    if (existingSub && existingSub.isLocked) {
      return {
        success: true,
        isCorrect: existingSub.isCorrect,
        pointsAwarded: existingSub.pointsAwarded,
        currentScore: team.totalScore || 0,
        isLocked: true,
        idempotentRecovery: true,
        message: existingSub.isCorrect ? "Question already solved and locked." : "Terminal locked: 2/2 attempts exhausted (0 PTS).",
      };
    }

    const isSecondAttempt = Boolean(existingSub && existingSub.attempts >= 1) || attemptNumber >= 2;

    let expectedAnswer = "";
    for (const chList of Object.values(RAW_CHAPTER_QUESTIONS)) {
      const found = chList.find(
        (q) => q.id === questionCode || String(q.itemNumber) === String(questionCode)
      );
      if (found) {
        expectedAnswer = found.correctAnswerId;
        break;
      }
    }

    const isCorrect = expectedAnswer
      ? submittedAnswer.trim().toUpperCase() === expectedAnswer.trim().toUpperCase()
      : submittedAnswer.trim().toUpperCase() === "A";

    const isLocked = isCorrect || isSecondAttempt;
    const roundId = Number(questionCode.match(/ch(\d+)/i)?.[1] || 1);

    if (!isLocked) {
      db.recordPlayerAttempt(teamId, roundId, questionCode, "attempted", 0, submittedAnswer, 1);
      return {
        success: true,
        isCorrect: false,
        pointsAwarded: 0,
        currentScore: team.totalScore || 0,
        isLocked: false,
        attemptsRemaining: 1,
        availablePoints: 10,
        message: "EVIDENCE DISCREPANCY DETECTED · VALUE REDUCED TO 10 PTS (1 ATTEMPT REMAINING)",
      };
    }

    const pointsAwarded = isCorrect ? (isSecondAttempt ? 10 : 20) : 0;
    const nextCompleted = Array.from(new Set([...completed, questionCode]));
    const nextTaskScores = { ...(team.taskScores || {}), [questionCode]: pointsAwarded };
    // Gross score = sum of all task scores; net score subtracts accumulated penalty
    const grossScore = Object.values(nextTaskScores).reduce((acc: number, val: any) => acc + (Number(val) || 0), 0);
    const currentPenalty = team.penalty || 0;
    const newScore = Math.max(0, grossScore - currentPenalty);

    db.updateTeam(teamId, {
      totalScore: newScore,
      completedTasks: nextCompleted,
      taskScores: nextTaskScores,
      breakdown: {
        ...(team.breakdown || {}),
        puzzle: grossScore,
        tech: 0,
      },
      lastSolvedAt: new Date().toISOString(),
    });
    db.recordPlayerAttempt(teamId, roundId, questionCode, isCorrect ? "solved" : "failed", pointsAwarded, submittedAnswer, isSecondAttempt ? 2 : 1);

    const scorePayload = {
      type: "SCORE_UPDATE",
      teamId,
      newScore,
      score: newScore,
      delta: pointsAwarded,
      reason: "SUBMISSION",
      source: "QUESTION_SUBMISSION",
      questionCode,
      ts: Date.now(),
    };
    socketService.emitToTeam(teamId, "score:update", scorePayload);
    socketService.broadcastToAdmins("score:update", scorePayload);
    socketService.broadcast("score:update", scorePayload);
    socketService.broadcastLeaderboard();

    return {
      success: true,
      isCorrect,
      pointsAwarded,
      currentScore: newScore,
      isLocked: true,
      message: isCorrect
        ? (attemptNumber <= 1 ? "CORRECT! Solution verified by central cipher [+10 PTS]." : "CORRECT ON SECOND ATTEMPT [+5 PTS].")
        : "TERMINAL LOCKED · 2/2 ATTEMPTS EXHAUSTED [0 PTS].",
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

        // Must have >= penalty balance before consuming Intel Clue
        const [scoreCheckRows] = await pool.query<any[]>(
          "SELECT COALESCE(SUM(points_delta), 0) AS total FROM score_ledger WHERE team_id = ?",
          [teamId]
        );
        const availableBalance = Number(scoreCheckRows?.[0]?.total || 0);
        if (availableBalance < penalty) {
          return {
            success: false,
            hintId,
            hintText: "",
            penaltyPoints: 0,
            currentScore: availableBalance,
            error: "INSUFFICIENT_BALANCE",
          };
        }

        // Record usage and negative penalty ledger entry atomically
        const conn = await pool.getConnection();
        try {
          await conn.beginTransaction();

          const [useRes]: any = await conn.query(
            "INSERT INTO team_hint_usages (team_id, question_id, hint_id, penalty_points, used_at) VALUES (?, ?, ?, ?, NOW(3))",
            [teamId, hint.question_id, hintId, penalty]
          );
          const usageId = useRes.insertId;

          await conn.query(
            `INSERT INTO score_ledger (team_id, round_id, question_id, source_type, source_id, points_delta, created_at)
             VALUES (?, (SELECT round_id FROM questions WHERE question_id = ?), ?, 'hint_penalty', ?, ?, NOW(3))`,
            [teamId, hint.question_id, hint.question_id, String(usageId), -penalty]
          );

          // Update team penalty count in teams table
          await conn.query(
            "UPDATE teams SET penalty = penalty + ?, total_score = total_score - ? WHERE team_id = ?",
            [penalty, penalty, teamId]
          );

          await conn.commit();
        } catch (txErr) {
          await conn.rollback();
          throw txErr;
        } finally {
          conn.release();
        }

        const [scoreRows] = await pool.query<any[]>(
          "SELECT COALESCE(SUM(points_delta), 0) AS total FROM score_ledger WHERE team_id = ?",
          [teamId]
        );
        const currentScore = Number(scoreRows?.[0]?.total || 0);

        // Synchronize in-memory db.teams so db.getLeaderboard() matches TiDB
        const memTeam = db.getTeamById(teamId);
        if (memTeam) {
          db.updateTeam(teamId, {
            totalScore: currentScore,
            penalty: (memTeam.penalty || 0) + penalty,
          });
        }

        // Broadcast score:update and updated leaderboard
        const scorePayload = {
          type: "SCORE_UPDATE",
          teamId,
          newScore: currentScore,
          score: currentScore,
          delta: -penalty,
          reason: "HINT_PENALTY",
          source: "INTEL_CLUE",
          hintId,
          ts: Date.now(),
        };

        socketService.emitToTeam(teamId, "score:update", scorePayload);
        socketService.broadcastToAdmins("score:update", scorePayload);
        socketService.broadcast("score:update", scorePayload);
        socketService.broadcastLeaderboard();

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

    const team = db.getTeamById(teamId);
    const curScore = team?.totalScore || 0;
    if (curScore < 5) {
      return {
        success: false,
        hintId,
        hintText: "",
        penaltyPoints: 0,
        currentScore: curScore,
        error: "INSUFFICIENT_BALANCE",
      };
    }

    const updatedScore = curScore - 5;
    if (team) {
      db.updateTeam(teamId, {
        totalScore: updatedScore,
        penalty: (team.penalty || 0) + 5,
      });
    }

    const scorePayload = {
      type: "SCORE_UPDATE",
      teamId,
      newScore: updatedScore,
      score: updatedScore,
      delta: -5,
      reason: "HINT_PENALTY",
      source: "INTEL_CLUE",
      hintId,
      ts: Date.now(),
    };
    socketService.emitToTeam(teamId, "score:update", scorePayload);
    socketService.broadcastToAdmins("score:update", scorePayload);
    socketService.broadcast("score:update", scorePayload);
    socketService.broadcastLeaderboard();

    return {
      success: true,
      hintId,
      hintText: "Recall the forensic autopsy log file 14-B.",
      penaltyPoints: 5,
      currentScore: updatedScore,
    };
  }
}
