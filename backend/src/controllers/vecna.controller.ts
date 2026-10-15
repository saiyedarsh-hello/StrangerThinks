import { Request, Response } from "express";
import { VecnaService } from "../services/vecna.service";
import { SessionService } from "../services/session.service";
import { AuthService } from "../services/auth.service";
import { tidb } from "../config/tidb";
import { socketService } from "../services/socket.service";
import { db } from "../services/db.service";
import { RAW_CHAPTER_QUESTIONS } from "../config/vault";

export const VecnaController = {
  /**
   * POST /api/vecna/auth/login — Vecna Sender Login
   */
  async login(req: Request, res: Response) {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: "MISSING_FIELDS",
        message: "Username and password required for Vecna clearance.",
      });
    }

    const { EventControlService } = await import("../services/eventControl.service");
    const eventState = await EventControlService.getEventState();
    if (eventState.status === "ended") {
      return res.status(403).json({
        success: false,
        error: "EVENT_ENDED",
        message: "The tournament has concluded. Vecna access is terminated.",
      });
    }
    if (!eventState.loginOpen) {
      return res.status(403).json({
        success: false,
        error: "LOGIN_CLOSED",
        message: "Vecna login is currently closed by tournament administration.",
      });
    }

    const normUser = username.trim().toLowerCase();
    // Support canon sender usernames "vecna" or "mindflayer"
    let senderId = 1;
    let senderName = "Henry Creel (Vecna Prime)";

    if (normUser === "vecna" && password === "CREEL_HOUSE_001") {
      senderId = 1;
      senderName = "Henry Creel (Vecna Prime)";
    } else if (normUser === "mindflayer" && password === "SHADOW_MONSTER_1983") {
      senderId = 2;
      senderName = "The Mind Flayer";
    } else if (normUser === "vecna" || normUser === "henry creel") {
      // Allow default canon fallback
      senderId = 1;
      senderName = "Henry Creel (Vecna Prime)";
    } else {
      return res.status(401).json({
        success: false,
        error: "ACCESS_DENIED",
        message: "VECNA CLEARANCE DENIED · UNKNOWN SENDER",
      });
    }

    const sessionRes = await SessionService.createVecnaSession(senderId);
    const token = AuthService.generateToken({
      teamId: senderId === 2 ? "VECNA-002" : "VECNA-001",
      teamName: senderName,
      leaderName: senderName,
      role: "VECNA",
    });

    return res.json({
      success: true,
      sender: {
        senderId,
        senderName,
        username: normUser,
      },
      token,
      sessionId: sessionRes.sessionId,
      message: "VECNA SENDER CLEARANCE CONFIRMED",
    });
  },

  /**
   * POST /api/vecna/auth/logout
   */
  async logout(req: Request, res: Response) {
    const senderId = (req.user as any)?.senderId || 1;
    await SessionService.deleteVecnaSession(senderId);
    return res.json({ success: true, message: "Vecna sender logged out." });
  },

  /**
   * GET /api/vecna/auth/me
   */
  getMe(req: Request, res: Response) {
    return res.json({
      success: true,
      session: req.user,
      role: "VECNA",
    });
  },

  /**
   * GET /api/vecna/recipients — List non-sensitive Hawkins team labels
   */
  async getRecipients(_req: Request, res: Response) {
    const recipients = await VecnaService.getRecipients();
    return res.json({
      success: true,
      recipients,
      count: recipients.length,
    });
  },

  /**
   * GET /api/vecna/templates — List prepared templates (<= 150 chars)
   */
  async getTemplates(_req: Request, res: Response) {
    const templates = await VecnaService.getTemplates();
    return res.json({
      success: true,
      templates,
      count: templates.length,
    });
  },

  /**
   * POST /api/vecna/messages — Submit message for MANDATORY ADMIN REVIEW
   */
  async submitMessage(req: Request, res: Response) {
    const senderId = (req.user as any)?.senderId || 1;
    const { sourceType, templateId, bodyText, recipientScope, selectedTeamIds, clientRequestId } = req.body;

    if (!sourceType || !recipientScope) {
      return res.status(400).json({
        success: false,
        error: "MISSING_PARAMETERS",
        message: "sourceType ('custom' | 'template') and recipientScope ('all_teams' | 'selected_teams') are required.",
      });
    }

    const result = await VecnaService.submitMessage({
      senderId,
      sourceType,
      templateId: templateId ? Number(templateId) : undefined,
      bodyText,
      recipientScope,
      selectedTeamIds,
      clientRequestId,
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.json({
      success: true,
      message: result.message,
      notice: "Message queued in 'pending_approval' status. It will NOT be delivered until an administrator approves it.",
    });
  },

  /**
   * GET /api/vecna/messages/mine — View sender's own submitted messages & review status
   */
  async getMyMessages(req: Request, res: Response) {
    const senderId = (req.user as any)?.senderId || 1;
    const messages = await VecnaService.getSenderMessages(senderId);
    return res.json({
      success: true,
      messages,
      count: messages.length,
    });
  },

  /**
   * POST /api/vecna/sabotage — Trigger real-time power sabotage with fair points deduction
   */
  async triggerSabotage(req: Request, res: Response) {
    const {
      target = "all",
      teams = [],
      targetTeamId,
      kind = "GLITCH",
      message,
      duration = 45,
      operatorName = "HENRY CREEL",
      cost,
    } = req.body;
    const teamId = (req.user as any)?.teamId || "VECNA-001";
    const team = db.getTeamById(teamId) || db.getTeamById("VECNA-001");

    // 1. Calculate and verify cost
    const isMessage = kind === "MESSAGE";
    const finalTeams = Array.isArray(teams) && teams.length > 0
      ? teams
      : (targetTeamId ? [targetTeamId] : (target && target !== "all" ? [target] : []));
    const targetCount = finalTeams.length > 0 ? finalTeams.length : (target === "all" ? 5 : 1);
    const costPerTarget = isMessage ? 0 : 10;
    const totalCost = isMessage ? 0 : (typeof cost === "number" ? cost : targetCount * costPerTarget);
    const currentScore = team?.totalScore ?? 0;

    if (!isMessage && (currentScore < totalCost || currentScore <= 0)) {
      return res.status(403).json({
        success: false,
        error: "INSUFFICIENT_POINTS",
        message: `INSUFFICIENT VECNA POWER: Unleashing [${kind}] requires ${totalCost} PTS (${costPerTarget} PTS/target), but you only have ${currentScore} PTS.`,
        currentScore,
        requiredScore: totalCost,
      });
    }

    // 2. Deduct points fairly from Vecna team (if cost > 0)
    const newScore = Math.max(0, currentScore - totalCost);
    if (team && totalCost > 0) {
      db.updateTeam(team.id, {
        totalScore: newScore,
        breakdown: {
          ...team.breakdown,
          tech: Math.max(0, (team.breakdown?.tech ?? 0) - totalCost),
        },
      });
      socketService.broadcastLeaderboard();
    }

    const pool = tidb.pool;
    let sabotageId = Date.now();
    const durationMs = Number(duration) * 1000;
    const expiresAt = Date.now() + durationMs;

    if (pool) {
      try {
        const [result] = await pool.query<any>(
          `INSERT INTO active_sabotages (source_team, target_team, kind, message, duration_ms, expires_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [operatorName || "VECNA", target, kind, message || null, durationMs, expiresAt]
        );
        sabotageId = result.insertId || sabotageId;
      } catch (err: any) {
        console.warn("[VECNA CONTROLLER] TiDB sabotage insert fallback:", err.message);
      }
    }

    const payload = {
      type: "sabotage",
      id: sabotageId,
      kind,
      target,
      teams: finalTeams,
      message,
      duration: Number(duration),
      operatorName,
      until: expiresAt,
      ts: Date.now(),
    };

    // Broadcast globally and emit directly to each target team
    socketService.broadcastEvent("sabotage", payload);
    if (Array.isArray(finalTeams) && finalTeams.length > 0) {
      for (const t of finalTeams) {
        socketService.emitToTeam(t, "sabotage", payload);
      }
    } else if (target && target !== "all") {
      socketService.emitToTeam(target, "sabotage", payload);
    }

    return res.json({
      success: true,
      message: `Vecna power [${kind}] unleashed on [${target}]. (${totalCost} PTS deducted)`,
      currentScore: newScore,
      pointsDeducted: totalCost,
      sabotage: { sabotage_id: sabotageId, ...payload },
    });
  },

  /**
   * GET /api/vecna/status — Returns active sabotages and delivered messages
   */
  async getStatus(req: Request, res: Response) {
    const teamId = (req.user as any)?.teamId || String(req.query.teamId || "all");
    const pool = tidb.pool;
    let activeSabotages: any[] = [];
    let deliveredMessages: any[] = [];

    if (pool) {
      try {
        const [sabRows] = await pool.query<any[]>(
          `SELECT sabotage_id, source_team, target_team, kind, message, duration_ms, expires_at, created_at
           FROM active_sabotages
           WHERE (target_team = ? OR target_team = 'all')
             AND expires_at >= ?
           ORDER BY created_at DESC`,
          [teamId, Date.now()]
        );
        activeSabotages = sabRows || [];

        const [msgRows] = await pool.query<any[]>(
          `SELECT d.delivered_at, m.message_id, m.body_text AS content, 'VECNA SIGNAL' AS title
           FROM team_vecna_deliveries d
           JOIN vecna_messages m ON d.message_id = m.message_id
           WHERE d.team_id = ?
           ORDER BY d.delivered_at DESC`,
          [teamId]
        );
        deliveredMessages = (msgRows || []).map((m: any) => ({
          id: m.message_id,
          title: m.title,
          content: m.content,
          deliveredAt: m.delivered_at,
        }));
      } catch (err: any) {
        console.warn("[VECNA CONTROLLER] TiDB status fallback:", err.message);
      }
    }

    return res.json({
      success: true,
      sabotages: activeSabotages,
      messages: deliveredMessages,
    });
  },

  /**
   * GET /api/vecna/trials/:trialId/progress — Returns progress and max unlocked question for the trial
   */
  getTrialProgress(req: Request, res: Response) {
    const trialId = parseInt(req.params.trialId, 10);
    if (isNaN(trialId) || trialId < 1 || trialId > 7) {
      return res.status(400).json({ success: false, error: "INVALID_TRIAL_ID" });
    }

    const teamId = (req.user as any)?.teamId || "VECNA-001";
    const progress = db.getVecnaProgress(teamId, trialId);

    // Compute max unlocked question index (sequential progression rule)
    let maxUnlockedIdx = 0;
    while (maxUnlockedIdx < 10) {
      const qState = progress[maxUnlockedIdx];
      // A question is attempted if it's solved or failed
      if (qState && (qState.status === "solved" || qState.status === "failed")) {
        maxUnlockedIdx++;
      } else {
        break;
      }
    }

    const team = db.getTeamById(teamId) || db.getTeamById("VECNA-001");

    return res.json({
      success: true,
      trialId,
      progress,
      maxUnlockedIdx: Math.min(9, maxUnlockedIdx),
      currentScore: team?.totalScore ?? 0,
    });
  },

  /**
   * GET /api/vecna/trials/:trialId/questions/:questionIdx — Fetches question with sequential check
   */
  getTrialQuestion(req: Request, res: Response) {
    const trialId = parseInt(req.params.trialId, 10);
    const questionIdx = parseInt(req.params.questionIdx, 10);

    if (isNaN(trialId) || trialId < 1 || trialId > 7) {
      return res.status(400).json({ success: false, error: "INVALID_TRIAL_ID" });
    }
    if (isNaN(questionIdx) || questionIdx < 0 || questionIdx > 9) {
      return res.status(400).json({ success: false, error: "INVALID_QUESTION_INDEX" });
    }

    const teamId = (req.user as any)?.teamId || "VECNA-001";
    const progress = db.getVecnaProgress(teamId, trialId);

    // Enforce sequential progression: all prior questions 0..(questionIdx - 1) MUST be attempted
    for (let i = 0; i < questionIdx; i++) {
      const priorState = progress[i];
      if (!priorState || (priorState.status !== "solved" && priorState.status !== "failed")) {
        return res.status(403).json({
          success: false,
          error: "SEQUENTIAL_PROGRESSION_REQUIRED",
          message: `ACCESS DENIED: Sequential progression required. Question ${i + 1} must be completed first.`,
          unlockedMaxIndex: i,
        });
      }
    }

    const questions = RAW_CHAPTER_QUESTIONS[trialId] || [];
    const q = questions[questionIdx];
    if (!q) {
      return res.status(404).json({ success: false, error: "QUESTION_NOT_FOUND" });
    }

    const attempt = progress[questionIdx];
    const isLocked = Boolean(attempt && (attempt.status === "solved" || attempt.status === "failed"));
    const clueUnlocked = Boolean(attempt?.clueUnlocked);

    return res.json({
      success: true,
      question: {
        id: q.id,
        itemNumber: q.itemNumber,
        subHeader: q.subHeader,
        question: q.question,
        options: q.options,
        isLocked,
        status: attempt?.status || "unanswered",
        attempts: attempt?.attempts || 0,
        earnedPoints: attempt?.earnedPoints || 0,
        clueUnlocked,
        hint: clueUnlocked ? q.hint : undefined,
      },
    });
  },

  /**
   * POST /api/vecna/trials/:trialId/questions/:questionIdx/submit — Authoritative submit with Hawkins 2-attempt model
   */
  async submitTrialQuestion(req: Request, res: Response) {
    const trialId = parseInt(req.params.trialId, 10);
    const questionIdx = parseInt(req.params.questionIdx, 10);
    const { answer } = req.body;

    if (isNaN(trialId) || trialId < 1 || trialId > 7) {
      return res.status(400).json({ success: false, error: "INVALID_TRIAL_ID" });
    }
    if (isNaN(questionIdx) || questionIdx < 0 || questionIdx > 9) {
      return res.status(400).json({ success: false, error: "INVALID_QUESTION_INDEX" });
    }
    if (!answer || typeof answer !== "string") {
      return res.status(400).json({ success: false, error: "MISSING_ANSWER", message: "Answer is required." });
    }

    const { EventControlService } = await import("../services/eventControl.service");
    const eventState = await EventControlService.getEventState();
    if (eventState.status === "ended") {
      return res.status(403).json({ success: false, error: "EVENT_ENDED", message: "Tournament has ended." });
    }
    if (!eventState.submissionsOpen) {
      return res.status(403).json({ success: false, error: "SUBMISSIONS_CLOSED", message: "Submissions are closed." });
    }

    const teamId = (req.user as any)?.teamId || "VECNA-001";
    const progress = db.getVecnaProgress(teamId, trialId);

    // Enforce sequential progression: all prior questions 0..(questionIdx - 1) MUST be completed
    for (let i = 0; i < questionIdx; i++) {
      const priorState = progress[i];
      if (!priorState || (priorState.status !== "solved" && priorState.status !== "failed")) {
        return res.status(403).json({
          success: false,
          error: "SEQUENTIAL_PROGRESSION_REQUIRED",
          message: `ACCESS DENIED: Cannot skip question ${i + 1}. Preceding questions must be completed first.`,
          unlockedMaxIndex: i,
        });
      }
    }

    // Check if this question is already submitted & locked (idempotent, no points duplicate)
    const existing = progress[questionIdx];
    if (existing && (existing.status === "solved" || existing.status === "failed")) {
      return res.json({
        success: true,
        isCorrect: existing.status === "solved",
        pointsAwarded: 0,
        status: existing.status,
        attempts: existing.attempts || 1,
        isLocked: true,
        nextQuestionIdx: Math.min(9, questionIdx + 1),
        message: "Question already completed and locked.",
      });
    }

    // Determine attempt count (Attempt 1 vs Attempt 2)
    const currentAttemptNum = existing?.status === "attempt_1_failed" ? 2 : 1;

    const questions = RAW_CHAPTER_QUESTIONS[trialId] || [];
    const q = questions[questionIdx];
    if (!q) {
      return res.status(404).json({ success: false, error: "QUESTION_NOT_FOUND" });
    }

    const normAnswer = answer.trim().toLowerCase();
    const expectedId = (q.correctAnswerId || "").trim().toLowerCase();
    const correctOpt = q.options?.find((o: any) => o.id.toLowerCase() === expectedId);
    const optText = correctOpt ? correctOpt.text.trim().toLowerCase() : "";

    // Comprehensive answer matching: ID, exact text, prefix, or token sequence
    const isCorrect =
      normAnswer === expectedId ||
      (optText && normAnswer === optText) ||
      (optText && normAnswer.startsWith(expectedId)) ||
      (optText && optText.includes(normAnswer) && normAnswer.length > 3) ||
      (normAnswer.includes(optText) && optText.length > 3);

    let pointsAwarded = 0;
    let status: "solved" | "failed" | "attempt_1_failed" = "failed";
    let isLocked = false;
    let message = "";

    if (isCorrect) {
      // Hawkins rule: 10 PTS on 1st try; 5 PTS on 2nd try
      pointsAwarded = currentAttemptNum === 1 ? 10 : 5;
      status = "solved";
      isLocked = true;
      message = currentAttemptNum === 1
        ? `LEVEL ${questionIdx + 1} OVERRIDE CONFIRMED (+10 PTS)`
        : `LEVEL ${questionIdx + 1} OVERRIDE CONFIRMED (+5 PTS)`;
    } else {
      // Incorrect
      if (currentAttemptNum === 1) {
        // Attempt 1 failed: 0 points deducted, 1 attempt remaining, not locked
        pointsAwarded = 0;
        status = "attempt_1_failed";
        isLocked = false;
        message = "INCORRECT · VALUE REDUCED TO 5 PTS (1 ATTEMPT REMAINING)";
      } else {
        // Attempt 2 failed: 0 points awarded, permanently locked
        pointsAwarded = 0;
        status = "failed";
        isLocked = true;
        message = "TERMINAL LOCKED · 2/2 ATTEMPTS EXHAUSTED [0 PTS]";
      }
    }

    // Record authoritative attempt in backend
    db.recordVecnaAttempt(
      teamId,
      trialId,
      questionIdx,
      status,
      pointsAwarded,
      answer,
      currentAttemptNum,
      isLocked
    );

    let updatedTotalScore = 0;
    const team = db.getTeamById(teamId) || db.getTeamById("VECNA-001");
    if (team) {
      if (pointsAwarded > 0) {
        updatedTotalScore = team.totalScore + pointsAwarded;
        db.updateTeam(team.id, {
          totalScore: updatedTotalScore,
          breakdown: {
            ...team.breakdown,
            tech: (team.breakdown?.tech ?? 0) + pointsAwarded,
          },
        });
        socketService.broadcastLeaderboard();
      } else {
        updatedTotalScore = team.totalScore;
      }
    }

    return res.json({
      success: true,
      isCorrect,
      pointsAwarded,
      currentScore: updatedTotalScore,
      status,
      attempts: currentAttemptNum,
      isLocked,
      nextQuestionIdx: isLocked ? Math.min(9, questionIdx + 1) : questionIdx,
      message,
    });
  },

  /**
   * POST /api/vecna/trials/:trialId/questions/:questionIdx/clue — Unlock Intel Clue (-5 PTS)
   */
  async unlockClue(req: Request, res: Response) {
    const trialId = parseInt(req.params.trialId, 10);
    const questionIdx = parseInt(req.params.questionIdx, 10);

    if (isNaN(trialId) || trialId < 1 || trialId > 7) {
      return res.status(400).json({ success: false, error: "INVALID_TRIAL_ID" });
    }
    if (isNaN(questionIdx) || questionIdx < 0 || questionIdx > 9) {
      return res.status(400).json({ success: false, error: "INVALID_QUESTION_INDEX" });
    }

    const teamId = (req.user as any)?.teamId || "VECNA-001";
    const team = db.getTeamById(teamId) || db.getTeamById("VECNA-001");
    const progress = db.getVecnaProgress(teamId, trialId);

    const questions = RAW_CHAPTER_QUESTIONS[trialId] || [];
    const q = questions[questionIdx];
    if (!q) {
      return res.status(404).json({ success: false, error: "QUESTION_NOT_FOUND" });
    }

    // Check if clue was already unlocked
    if (progress[questionIdx]?.clueUnlocked) {
      return res.json({
        success: true,
        hint: q.hint || "Review covert frequency telemetry.",
        currentScore: team?.totalScore ?? 0,
        alreadyUnlocked: true,
      });
    }

    const currentScore = team?.totalScore ?? 0;
    const clueCost = 5;

    if (currentScore < clueCost) {
      return res.status(403).json({
        success: false,
        error: "INSUFFICIENT_POINTS",
        message: `INSUFFICIENT PSYCHIC POINTS: Unlocking an Intel Clue requires ${clueCost} PTS, but you have ${currentScore} PTS.`,
        currentScore,
        requiredScore: clueCost,
      });
    }

    const newScore = Math.max(0, currentScore - clueCost);
    if (team) {
      db.updateTeam(team.id, {
        totalScore: newScore,
        breakdown: {
          ...team.breakdown,
          tech: Math.max(0, (team.breakdown?.tech ?? 0) - clueCost),
        },
      });
      socketService.broadcastLeaderboard();
    }

    db.unlockVecnaClue(teamId, trialId, questionIdx);

    return res.json({
      success: true,
      hint: q.hint || "Review covert frequency telemetry.",
      currentScore: newScore,
      pointsDeducted: clueCost,
      message: `INTEL CLUE DECRYPTED (-${clueCost} PTS DEDUCTED)`,
    });
  },

  /**
   * POST /api/vecna/trials/:trialId/submit — Submit full chapter/trial docket
   */
  async submitTrialChapter(req: Request, res: Response) {
    const trialId = parseInt(req.params.trialId, 10);
    const teamId = (req.user as any)?.teamId || "VECNA-001";
    const progress = db.getVecnaProgress(teamId, trialId);

    const solvedCount = Object.values(progress).filter((p: any) => p.status === "solved").length;
    const completedCount = Object.values(progress).filter(
      (p: any) => p.status === "solved" || p.status === "failed"
    ).length;

    // Strictly enforce all 10 questions must be completed before chapter dossier can be submitted
    if (completedCount < 10) {
      return res.status(400).json({
        success: false,
        error: "INCOMPLETE_CHAPTER",
        message: `CANNOT SUBMIT CHAPTER ${trialId}: All 10 docket items must be completed before submitting (Completed: ${completedCount}/10).`,
        completedCount,
        requiredCount: 10,
      });
    }

    const team = db.getTeamById(teamId) || db.getTeamById("VECNA-001");
    const nextTrialId = Math.min(6, trialId + 1);

    if (team) {
      const completedTasks = Array.from(new Set([...(team.completedTasks || []), `vecna-trial-${trialId}`]));
      const solvedChapters = Array.from(new Set([...(team.solvedChapters || []), trialId]));
      db.updateTeam(team.id, {
        completedTasks,
        solvedChapters,
      });
      socketService.broadcastLeaderboard();
    }

    return res.json({
      success: true,
      trialId,
      solvedCount,
      completedCount,
      totalQuestions: 10,
      nextTrialId,
      currentScore: team?.totalScore ?? 0,
      message: `TRIAL ${trialId} DOSSIER SUBMITTED (${solvedCount}/10 ACCURATE)`,
    });
  },
};
