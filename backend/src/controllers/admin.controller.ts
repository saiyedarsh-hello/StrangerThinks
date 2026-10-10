import { Request, Response } from "express";
import { db } from "../services/db.service";
import { socketService } from "../services/socket.service";
import { SessionService } from "../services/session.service";
import { EventControlService } from "../services/eventControl.service";
import { VecnaService } from "../services/vecna.service";

export const AdminController = {
  /**
   * GET /api/admin/chapters — Returns all chapters with raw secret answers (for Admin Vault)
   */
  getChapters(_req: Request, res: Response) {
    const rawChapters = db.getRawChapters();

    // Map to AdminChapterData format expected by frontend
    const chapters = rawChapters.map((c) => {
      const firstQ = c.questions[0];
      return {
        id: c.id,
        label: c.label,
        tag: c.tag,
        archiveSector: c.archiveSector,
        archiveTitle: c.archiveTitle,
        archiveSubtitle: c.archiveSubtitle,
        archiveLines: c.archiveLines,
        bgSrc: c.bgSrc,
        taskId: c.taskId,
        points: c.points,
        questionPrompt: firstQ ? firstQ.question : c.archiveSubtitle,
        options: firstQ ? firstQ.options : [],
        type: "CHOICE",
        correctAnswer: firstQ ? firstQ.correctAnswerId : "A",
        completionLoreTitle: c.completionLoreTitle,
        completionLoreText: c.completionLoreText,
        completionLines: c.completionLines,
      };
    });

    return res.json({
      success: true,
      chapters,
    });
  },

  /**
   * PUT /api/admin/chapters/:id — Updates a chapter in the vault
   */
  updateChapter(req: Request, res: Response) {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: "INVALID_ID" });
    }

    const {
      questionPrompt,
      correctAnswer,
      points,
      options,
      completionLoreText,
      completionLoreTitle,
      archiveTitle,
      archiveSubtitle,
      archiveSector,
      tag,
    } = req.body;

    const raw = db.getRawChapterById(id);
    if (!raw) {
      return res.status(404).json({ success: false, error: "CHAPTER_NOT_FOUND" });
    }

    const updatedQuestions = [...raw.questions];
    if (updatedQuestions[0]) {
      updatedQuestions[0] = {
        ...updatedQuestions[0],
        question: questionPrompt !== undefined ? questionPrompt : updatedQuestions[0].question,
        correctAnswerId: correctAnswer !== undefined ? correctAnswer : updatedQuestions[0].correctAnswerId,
        options: options !== undefined ? options : updatedQuestions[0].options,
      };
    }

    const updated = db.updateChapter(id, {
      archiveTitle: archiveTitle || raw.archiveTitle,
      archiveSubtitle: archiveSubtitle || raw.archiveSubtitle,
      archiveSector: archiveSector || raw.archiveSector,
      tag: tag || raw.tag,
      points: points !== undefined ? Number(points) : raw.points,
      completionLoreTitle: completionLoreTitle || raw.completionLoreTitle,
      completionLoreText: completionLoreText || raw.completionLoreText,
      questions: updatedQuestions,
    });

    return res.json({
      success: true,
      chapter: updated,
      message: `CHAPTER ${id} UPDATED SUCCESSFULLY`,
    });
  },

  /**
   * DELETE /api/admin/chapters/:id
   */
  deleteChapter(req: Request, res: Response) {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: "INVALID_ID" });
    }

    const ok = db.deleteChapter(id);
    if (!ok) {
      return res.status(404).json({ success: false, error: "CHAPTER_NOT_FOUND" });
    }

    return res.json({
      success: true,
      message: `CHAPTER ${id} DELETED FROM VAULT`,
    });
  },

  /**
   * POST /api/admin/chapters/reset — Resets the vault to the 70 default questions
   */
  resetChapters(_req: Request, res: Response) {
    const resetList = db.resetChaptersToDefault();
    return res.json({
      success: true,
      chapters: resetList,
      message: "SECURITY VAULT RESTORED TO DEFAULT SPECIFICATIONS",
    });
  },

  /**
   * GET /api/admin/leaderboard — Dumps the live tournament leaderboard
   */
  getLeaderboard(_req: Request, res: Response) {
    const leaderboard = db.getLeaderboard();
    return res.json({
      success: true,
      leaderboard,
    });
  },

  /**
   * POST /api/admin/teams — Dynamically registers a new participant squad
   */
  createTeam(req: Request, res: Response) {
    const { teamName, leaderName, teamId, initialScore } = req.body;

    if (!teamName || !leaderName) {
      return res.status(400).json({
        success: false,
        error: "MISSING_FIELDS",
        message: "teamName and leaderName are required.",
      });
    }

    const team = db.createTeam(teamName, leaderName, teamId, Number(initialScore) || 0);
    socketService.broadcastLeaderboard();

    return res.json({
      success: true,
      team,
      message: `TEAM [${teamName}] REGISTERED FOR THE HAWKINS PROTOCOL`,
    });
  },

  /**
   * PUT /api/admin/teams/:id/score — Manually updates a team's score or status
   */
  updateTeamScore(req: Request, res: Response) {
    const teamId = req.params.id;
    const { points, status, reason } = req.body;

    const team = db.getTeamById(teamId);
    if (!team) {
      return res.status(404).json({ success: false, error: "TEAM_NOT_FOUND" });
    }

    const newBreakdown = { ...team.breakdown };
    if (points !== undefined) {
      newBreakdown.teamwork = (newBreakdown.teamwork || 0) + Number(points);
    }

    const updated = db.updateTeam(teamId, {
      breakdown: newBreakdown,
      status: status || team.status,
    });

    socketService.broadcastLeaderboard();

    return res.json({
      success: true,
      team: updated,
      message: `TEAM [${team.teamName}] SCORE ADJUSTED (${points >= 0 ? "+" : ""}${points} PTS) - ${reason || "ORGANIZER AWARD"}`,
    });
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // SPEC ADMIN ENDPOINTS (Section 11)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * POST /api/admin/teams/:teamId/force-logout
   * Invalidates active team session and disconnects sockets
   */
  async forceLogoutTeam(req: Request, res: Response) {
    const { teamId } = req.params;
    const adminId = (req.user as any)?.adminId || 1;

    const success = await SessionService.forceLogoutTeam(teamId, adminId);
    return res.json({
      success,
      message: `Team ${teamId} has been forcibly logged out.`,
    });
  },

  /**
   * GET /api/admin/teams — Search/filter/sort teams with active session status
   */
  async getTeams(req: Request, res: Response) {
    const teams = db.getAllTeams().filter((t) => t.role === "PLAYER");
    return res.json({
      success: true,
      teams,
      count: teams.length,
    });
  },

  /**
   * Event Lifecycle Controls
   */
  async startEvent(_req: Request, res: Response) {
    const event = await EventControlService.startEvent();
    return res.json({ success: true, event });
  },

  async pauseEvent(_req: Request, res: Response) {
    const event = await EventControlService.pauseEvent();
    return res.json({ success: true, event });
  },

  async resumeEvent(_req: Request, res: Response) {
    const event = await EventControlService.resumeEvent();
    return res.json({ success: true, event });
  },

  async closeLogin(_req: Request, res: Response) {
    const event = await EventControlService.closeLogin();
    return res.json({ success: true, event });
  },

  async stopSubmissions(_req: Request, res: Response) {
    const event = await EventControlService.stopSubmissions();
    return res.json({ success: true, event });
  },

  async endEvent(_req: Request, res: Response) {
    const event = await EventControlService.endEvent();
    return res.json({ success: true, event });
  },

  /**
   * Results and Standings
   */
  async getOverallResults(_req: Request, res: Response) {
    const overall = await EventControlService.getOverallResults();
    return res.json({ success: true, results: overall });
  },

  async getRoundResults(_req: Request, res: Response) {
    const rounds = await EventControlService.getRoundResults();
    return res.json({ success: true, results: rounds });
  },

  async exportCsv(_req: Request, res: Response) {
    const overall = await EventControlService.getOverallResults();
    let csv = "Rank,Team ID,Team Name,Squad Leader,Overall Score,Questions Submitted,Hints Used\n";
    overall.forEach((row, idx) => {
      csv += `${idx + 1},"${row.team_id}","${row.team_name}","${row.squad_leader}",${row.overall_score},${row.questions_submitted},${row.hints_used}\n`;
    });
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", 'attachment; filename="hawkins_tournament_results.csv"');
    return res.send(csv);
  },

  /**
   * Vecna Message Review Queue (Admin)
   */
  async getPendingVecnaMessages(_req: Request, res: Response) {
    const messages = await VecnaService.getPendingMessages();
    return res.json({ success: true, messages, count: messages.length });
  },

  async approveVecnaMessage(req: Request, res: Response) {
    const messageId = parseInt(req.params.messageId, 10);
    const adminId = (req.user as any)?.adminId || 1;

    const result = await VecnaService.approveMessage(messageId, adminId);
    if (!result.success) {
      return res.status(400).json(result);
    }
    return res.json(result);
  },

  async rejectVecnaMessage(req: Request, res: Response) {
    const messageId = parseInt(req.params.messageId, 10);
    const { reason } = req.body;
    const adminId = (req.user as any)?.adminId || 1;

    const result = await VecnaService.rejectMessage(messageId, adminId, reason);
    if (!result.success) {
      return res.status(400).json(result);
    }
    return res.json(result);
  },

  async createVecnaTemplate(req: Request, res: Response) {
    const { templateCode, templateName, bodyText } = req.body;
    const adminId = (req.user as any)?.adminId || 1;

    const result = await VecnaService.createTemplate(adminId, { templateCode, templateName, bodyText });
    if (!result.success) {
      return res.status(400).json(result);
    }
    return res.json(result);
  },
};

/**
 * POST /api/admin/leaderboard/score - Override team score directly
 */
export const updateAdminTeamScore = (req: Request, res: Response) => {
  const { teamId, score } = req.body;
  if (!teamId || score === undefined) {
    return res.status(400).json({ success: false, error: "TEAM_ID_AND_SCORE_REQUIRED" });
  }

  const existing = db.getTeamById(String(teamId));
  if (!existing) {
    return res.status(404).json({ success: false, error: "TEAM_NOT_FOUND" });
  }

  const nextScore = Number(score);
  const updated = db.updateTeam(String(teamId), {
    totalScore: nextScore,
    breakdown: {
      ...existing.breakdown,
      teamwork: (existing.breakdown?.teamwork || 0) + (nextScore - existing.totalScore),
    },
  });

  socketService.broadcastLeaderboard();

  res.json({
    success: true,
    message: `Team ${teamId} score updated to ${nextScore} PTS.`,
    team: updated,
    leaderboard: db.getLeaderboard(),
  });
};
