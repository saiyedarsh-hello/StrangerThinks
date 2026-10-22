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
      teamId: `VECNA-${senderId}`,
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
    await SessionService.deleteTeamSession("VECNA-001");
    return res.json({ success: true, message: "Vecna sender logged out." });
  },

  /**
   * GET /api/vecna/auth/me
   */
  getMe(req: Request, res: Response) {
    const team =
      (req.user?.teamId ? db.getTeamById(req.user.teamId) : null) ||
      db.getTeamById("VECNA-001") ||
      db.getAllTeams().find((t) => t.role === "VECNA") ||
      null;
    return res.json({
      success: true,
      session: req.user,
      team: team ? { ...team, score: team.totalScore } : null,
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
   * GET /api/vecna/dispatch/quota — Returns authoritative event-wide dispatch quota (5 max shared)
   */
  async getDispatchQuota(_req: Request, res: Response) {
    const quota = await VecnaService.getDispatchQuota();
    return res.json({ success: true, ...quota });
  },

  /**
   * POST /api/vecna/dispatch/reset — Resets the event-wide dispatch quota back to 5/5
   */
  async resetDispatchQuota(_req: Request, res: Response) {
    await VecnaService.resetDispatchQuota();
    const quota = await VecnaService.getDispatchQuota();
    return res.json({ success: true, ...quota });
  },

  /**
   * POST /api/vecna/powers/activate — Authoritative power activation with atomic 10 PTS deduction per team
   */
  async activatePower(req: Request, res: Response) {
    const vecnaTeamId = (req.user as any)?.teamId || "VECNA-001";
    const { power, targetTeams, targetScope, location, clientRequestId } = req.body;

    if (!power || (power !== "LOCK" && power !== "CORRUPT")) {
      return res.status(400).json({
        success: false,
        error: "INVALID_POWER",
        message: "Power must be 'LOCK' or 'CORRUPT'.",
      });
    }

    const result = await VecnaService.activatePower({
      vecnaTeamId,
      power,
      targetTeams,
      targetScope,
      location,
      clientRequestId,
    });

    if (!result.success) {
      return res.status(400).json(result);
    }
    return res.json(result);
  },

  /**
   * POST /api/vecna/challenge/verify — Verifies 4-question technical challenge for System Corrupted
   */
  verifyChallenge(req: Request, res: Response) {
    const teamId = (req.user as any)?.teamId || String(req.body.teamId || "");
    const { answers } = req.body;

    if (!teamId || !answers) {
      return res.status(400).json({
        success: false,
        error: "MISSING_FIELDS",
        message: "teamId and answers required.",
      });
    }

    const result = VecnaService.verifyChallenge(teamId, answers);
    return res.json(result);
  },

  /**
   * GET /api/vecna/tactical-map — Returns occupancy for 6 actual stages with online Hawkins teams
   */
  getTacticalMap(_req: Request, res: Response) {
    const data = VecnaService.getTacticalMap();
    return res.json({ success: true, ...data });
  },

  /**
   * POST /api/vecna/sabotage — Trigger real-time power sabotage
   */
  async triggerSabotage(req: Request, res: Response) {
    const {
      target = "all",
      kind = "GLITCH",
      message,
      duration = 45,
      operatorName = "HENRY CREEL",
      targetTeams,
      location,
    } = req.body;

    // Route LOCK and CORRUPT through authoritative power activation (with point deduction)
    if (kind === "LOCK" || kind === "CORRUPT") {
      const vecnaTeamId = (req.user as any)?.teamId || "VECNA-001";
      const powerResult = await VecnaService.activatePower({
        vecnaTeamId,
        power: kind,
        targetTeams: targetTeams || (target === "all" ? undefined : [target]),
        targetScope: target === "all" ? "all" : "selected",
        location,
      });

      if (!powerResult.success) {
        return res.status(400).json(powerResult);
      }
      return res.json(powerResult);
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
      message,
      duration: Number(duration),
      operatorName,
      until: expiresAt,
      ts: Date.now(),
    };

    if (target === "all") {
      socketService.broadcastEvent("sabotage", payload);
    } else {
      socketService.emitToTeam(target, "sabotage", payload);
    }

    return res.json({
      success: true,
      message: `Vecna power [${kind}] unleashed on [${target}].`,
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

    return res.json({
      success: true,
      trialId,
      progress,
      maxUnlockedIdx: Math.min(9, maxUnlockedIdx),
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
    const isAdmin = (req.user as any)?.role === "ADMIN";

    // Enforce sequential progression for non-admins: all prior questions 0..(questionIdx - 1) MUST be attempted
    if (!isAdmin) {
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
    }

    const questions = RAW_CHAPTER_QUESTIONS[trialId] || [];
    const q = questions[questionIdx];
    if (!q) {
      return res.status(404).json({ success: false, error: "QUESTION_NOT_FOUND" });
    }

    const attempt = progress[questionIdx];
    const isLocked = Boolean(attempt && (attempt.status === "solved" || attempt.status === "failed"));

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
        earnedPoints: attempt?.earnedPoints || 0,
      },
    });
  },

  /**
   * POST /api/vecna/trials/:trialId/questions/:questionIdx/submit — Authoritative submit with sequential check
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

    // Enforce sequential progression: all prior questions 0..(questionIdx - 1) MUST be attempted
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

    const team =
      db.getTeamById(teamId) ||
      db.getTeamById("VECNA-001") ||
      db.getAllTeams().find((t) => t.role === "VECNA");
    const existingScore = team ? team.totalScore : 0;

    // Check if this question is already submitted (idempotent, no points duplicate)
    const existing = progress[questionIdx];
    if (existing && (existing.status === "solved" || existing.status === "failed")) {
      return res.json({
        success: true,
        isCorrect: existing.status === "solved",
        pointsAwarded: 0,
        status: existing.status,
        isLocked: true,
        nextQuestionIdx: Math.min(9, questionIdx + 1),
        totalScore: existingScore,
        newScore: existingScore,
        message: "Question already submitted and locked.",
      });
    }

    const questions = RAW_CHAPTER_QUESTIONS[trialId] || [];
    const q = questions[questionIdx];
    if (!q) {
      return res.status(404).json({ success: false, error: "QUESTION_NOT_FOUND" });
    }

    const isCorrect = answer.trim().toUpperCase() === q.correctAnswerId.trim().toUpperCase();
    const pointsAwarded = isCorrect ? 10 : 0;
    const status = isCorrect ? "solved" : "failed";

    // Record authoritative attempt in backend
    db.recordVecnaAttempt(teamId, trialId, questionIdx, status, pointsAwarded, answer);

    // Persist to TiDB question_submissions and score_ledger for Admin Telemetry
    if (tidb.pool) {
      tidb.pool.query(
        `INSERT INTO question_submissions (team_id, round_id, question_id, submitted_answer, is_correct, submitted_at)
         VALUES (?, ?, ?, ?, ?, NOW(3))`,
        [teamId, trialId, questionIdx + 1, answer, isCorrect ? 1 : 0]
      ).catch((err: any) => console.warn("[VECNA TIDB SUBMISSION WARN]", err.message));

      if (pointsAwarded > 0) {
        tidb.pool.query(
          `INSERT INTO score_ledger (team_id, round_id, question_id, source_type, source_id, points_delta, created_at)
           VALUES (?, ?, ?, 'VECNA_TRIAL_SUBMISSION', ?, ?, NOW(3))`,
          [teamId, trialId, questionIdx + 1, `Trial ${trialId} Question ${questionIdx + 1}`, pointsAwarded]
        ).catch((err: any) => console.warn("[VECNA TIDB LEDGER WARN]", err.message));

        tidb.pool.query(
          `UPDATE teams SET total_score = total_score + ?, last_solved_at = NOW(3) WHERE team_id = ?`,
          [pointsAwarded, teamId]
        ).catch((err: any) => console.warn("[VECNA TIDB TEAMS UPDATE WARN]", err.message));
      }
    }

    let updatedScore: number | undefined = existingScore;
    if (pointsAwarded > 0) {
      let activeTeam = team;
      if (!activeTeam) {
        activeTeam = db.createTeam(
          "Henry Creel (Vecna)",
          "Henry Creel",
          teamId,
          0
        );
        db.updateTeam(activeTeam.id, { role: "VECNA" });
      }
      db.updateTeam(activeTeam.id, {
        totalScore: activeTeam.totalScore + pointsAwarded,
        breakdown: {
          ...activeTeam.breakdown,
          tech: activeTeam.breakdown.tech + pointsAwarded,
        },
      });
      updatedScore = activeTeam.totalScore;
      socketService.broadcastLeaderboard();
      socketService.emitToTeam(activeTeam.id, "score:update", {
        teamId: activeTeam.id,
        score: updatedScore,
        totalScore: updatedScore,
        newScore: updatedScore,
        delta: pointsAwarded,
        ts: Date.now(),
      });
      socketService.broadcastToVecna("score:update", {
        teamId: activeTeam.id,
        score: updatedScore,
        totalScore: updatedScore,
        newScore: updatedScore,
        delta: pointsAwarded,
        ts: Date.now(),
      });
    }

    return res.json({
      success: true,
      isCorrect,
      pointsAwarded,
      status,
      isLocked: true,
      nextQuestionIdx: Math.min(9, questionIdx + 1),
      totalScore: updatedScore,
      newScore: updatedScore,
      message: isCorrect
        ? `LEVEL ${questionIdx + 1} OVERRIDE CONFIRMED (+10 PTS)`
        : `INCORRECT VECTOR · LEVEL ${questionIdx + 1} LOCKED (0 PTS)`,
    });
  },
};
