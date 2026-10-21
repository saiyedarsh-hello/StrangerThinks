import { Request, Response } from "express";
import { db } from "../services/db.service";
import { socketService } from "../services/socket.service";
import { SessionService } from "../services/session.service";
import { EventControlService } from "../services/eventControl.service";
import { VecnaService } from "../services/vecna.service";
import { tidb } from "../config/tidb";

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
  async getLeaderboard(_req: Request, res: Response) {
    const eventState = await EventControlService.getEventState();
    const isUnstarted = eventState.status === "not_started";
    const leaderboard = db.getLeaderboard();
    const enriched = leaderboard.map((t) => ({
      ...t,
      score: isUnstarted ? 0 : t.score,
      solvedCount: isUnstarted ? 0 : t.solvedCount,
      currentStage: isUnstarted ? 1 : ((t as any).currentStage || 1),
      isOnline: socketService.isTeamOnline(t.teamId),
    }));
    return res.json({
      success: true,
      leaderboard: enriched,
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
   * PUT /api/admin/teams/:id/role — Updates team role (HAWKINS vs VECNA)
   * Only permitted before event start. Roles are strictly locked once the event is active.
   */
  async updateTeamRole(req: Request, res: Response) {
    const teamId = req.params.id;
    const { role } = req.body;

    if (!role || (role !== "PLAYER" && role !== "VECNA")) {
      return res.status(400).json({
        success: false,
        error: "INVALID_ROLE",
        message: "Role must be 'PLAYER' (Hawkins) or 'VECNA'.",
      });
    }

    // Role locking check: If event is active, reject modification
    const eventState = await EventControlService.getEventState();
    if (eventState.status === "active") {
      return res.status(403).json({
        success: false,
        error: "ROLE_LOCKED",
        message: "Roles are permanently locked while the event is active.",
      });
    }

    let team = db.getTeamById(teamId);
    if (!team) {
      if (teamId.startsWith("VECNA") || teamId.startsWith("T") || teamId.startsWith("TEAM")) {
        team = db.createTeam(
          teamId.startsWith("VECNA") ? "Henry Creel (Vecna)" : `Team ${teamId}`,
          teamId.startsWith("VECNA") ? "Henry Creel" : "Player Leader",
          teamId,
          0
        );
        if (teamId.startsWith("VECNA")) {
          db.updateTeam(team.id, { role: "VECNA" });
        }
      } else {
        return res.status(404).json({ success: false, error: "TEAM_NOT_FOUND" });
      }
    }

    const updated = db.updateTeam(teamId, { role });
    const adminId = (req.user as any)?.adminId || 1;
    await EventControlService.logAudit(adminId, "update_team_role", "team", teamId, {
      previousRole: team.role,
      newRole: role,
    });

    socketService.broadcastLeaderboard();

    return res.json({
      success: true,
      team: updated,
      message: `Team [${team.teamName}] assigned role ${role === "VECNA" ? "VECNA" : "HAWKINS"}.`,
    });
  },

  /**
   * PUT /api/admin/teams/:id/score — Manually updates a team's score or status
   */
  async updateTeamScore(req: Request, res: Response) {
    const teamId = req.params.id;
    const { points, status, reason } = req.body;

    let team = db.getTeamById(teamId);
    if (!team) {
      if (teamId.startsWith("VECNA") || teamId.startsWith("T") || teamId.startsWith("TEAM")) {
        team = db.createTeam(
          teamId.startsWith("VECNA") ? "Henry Creel (Vecna)" : `Team ${teamId}`,
          teamId.startsWith("VECNA") ? "Henry Creel" : "Player Leader",
          teamId,
          0
        );
        if (teamId.startsWith("VECNA")) {
          db.updateTeam(team.id, { role: "VECNA" });
        }
      } else {
        return res.status(404).json({ success: false, error: "TEAM_NOT_FOUND" });
      }
    }

    const ptsDelta = points !== undefined ? Number(points) : 0;
    const newBreakdown = { ...team.breakdown };
    newBreakdown.teamwork = (newBreakdown.teamwork || 0) + ptsDelta;

    const newTotalScore = Math.max(0, (team.totalScore || 0) + ptsDelta);
    const updated = db.updateTeam(teamId, {
      totalScore: newTotalScore,
      breakdown: newBreakdown,
      status: status || team.status,
    });

    const pool = tidb.pool;
    if (pool && ptsDelta !== 0) {
      try {
        const adjustId = `ADJUST_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        await pool.query(
          `INSERT INTO score_ledger (team_id, round_id, question_id, source_type, source_id, points_delta, created_at)
           VALUES (?, 1, NULL, 'ADMIN_ADJUSTMENT', ?, ?, NOW(3))`,
          [teamId, adjustId, ptsDelta]
        );
        await pool.query(
          "UPDATE teams SET total_score = GREATEST(0, total_score + ?) WHERE team_id = ?",
          [ptsDelta, teamId]
        );
      } catch (tidbErr) {
        console.warn("[ADMIN] TiDB updateTeamScore warning:", tidbErr);
      }
    }

    socketService.broadcastLeaderboard();
    if (updated) {
      const scorePayload = {
        type: "SCORE_UPDATE",
        teamId,
        teamName: team.teamName,
        newScore: updated.totalScore,
        score: updated.totalScore,
        delta: ptsDelta,
        breakdown: updated.breakdown,
        reason: reason || "ORGANIZER AWARD",
        source: "ADMIN_ADJUSTMENT",
        ts: Date.now(),
      };
      socketService.emitToTeam(teamId, "score:update", scorePayload);
      socketService.broadcastToAdmins("score:update", scorePayload);
      socketService.broadcast("score:update", scorePayload);
    }

    return res.json({
      success: true,
      team: updated,
      message: `TEAM [${team.teamName}] SCORE ADJUSTED (${ptsDelta >= 0 ? "+" : ""}${ptsDelta} PTS) - ${reason || "ORGANIZER AWARD"}`,
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
    socketService.setTeamOffline(teamId);
    return res.json({
      success,
      message: `Team ${teamId} has been forcibly logged out.`,
    });
  },

  /**
   * POST /api/admin/teams/reset-all-sessions — Force resets all participant sessions
   */
  async resetAllSessions(req: Request, res: Response) {
    const adminId = (req.user as any)?.adminId || 1;
    await SessionService.resetAllSessions(adminId);
    socketService.clearAllOnlineTeams();
    return res.json({
      success: true,
      message: "All active team sessions have been terminated. All squads are unlocked.",
    });
  },

  /**
   * POST /api/admin/teams/import — Bulk imports teams from CSV or JSON list into TiDB
   */
  async importTeams(req: Request, res: Response) {
    const { teams, csv } = req.body;
    let teamsList: Array<{ username: string; password?: string; teamName?: string; leaderName?: string; teamId?: string }> = [];

    if (Array.isArray(teams)) {
      teamsList = teams;
    } else if (typeof csv === "string") {
      const lines = csv.split(/\r?\n/).filter((l: string) => l.trim().length > 0);
      for (const line of lines) {
        if (/^(username|team|squad|rank)/i.test(line.trim())) continue;
        let parts: string[] = [];
        if (line.includes("\t")) parts = line.split("\t").map((p: string) => p.trim());
        else if (line.includes(",")) parts = line.split(",").map((p: string) => p.trim());
        else if (line.includes(":")) parts = line.split(":").map((p: string) => p.trim());
        else if (line.includes(";")) parts = line.split(";").map((p: string) => p.trim());

        if (parts.length >= 2) {
          teamsList.push({
            username: parts[0],
            password: parts[1],
            teamName: parts[2] || parts[0],
            leaderName: parts[3] || "Squad Leader",
          });
        }
      }
    }

    if (teamsList.length === 0) {
      return res.status(400).json({
        success: false,
        error: "EMPTY_IMPORT",
        message: "No teams found in import payload. Supported formats: CSV (comma), TSV (tab), or Colon (TEAM01 : password).",
      });
    }

    const pool = tidb.pool;
    let insertedCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < teamsList.length; i++) {
      const item = teamsList[i];
      const rawUser = String(item.username || "").trim();
      if (!rawUser) continue;
      const username = rawUser.toUpperCase();
      const password = (item.password || `hawkins83_${i + 1}`).trim();
      const teamName = (item.teamName || rawUser).trim();
      const leaderName = (item.leaderName || "Squad Leader").trim();
      const teamId = item.teamId || `T${String(i + 1).padStart(2, "0")}`;

      if (pool) {
        try {
          await pool.query(
            `INSERT INTO teams (team_id, team_name, leader_name, username, password_hash, role)
             VALUES (?, ?, ?, ?, ?, 'PLAYER')
             ON DUPLICATE KEY UPDATE team_name = VALUES(team_name), leader_name = VALUES(leader_name)`,
            [teamId, teamName, leaderName, username, password]
          );
        } catch (err: any) {
          errors.push(`${username}: ${err.message}`);
          continue;
        }
      }

      db.createTeam(teamName, leaderName, teamId, 0);
      insertedCount++;
    }

    socketService.broadcastLeaderboard();
    return res.json({
      success: true,
      message: `Successfully processed ${insertedCount} squads into TiDB mainframe.`,
      importedCount: insertedCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  },

  /**
   * GET /api/admin/teams — Search/filter/sort teams with active session status
   */
  async getTeams(req: Request, res: Response) {
    const rawTeams = db.getAllTeams().filter((t) => t.role === "PLAYER" || t.role === "VECNA");

    // Sort descending by totalScore, then ascending by earliest lastSolvedAt (tie-breaker)
    rawTeams.sort((a, b) => {
      // Keep Vecna at the bottom or top depending on score, but normal sort
      const scoreDiff = (b.totalScore ?? 0) - (a.totalScore ?? 0);
      if (scoreDiff !== 0) return scoreDiff;
      if (a.lastSolvedAt && b.lastSolvedAt) {
        return new Date(a.lastSolvedAt).getTime() - new Date(b.lastSolvedAt).getTime();
      }
      if (a.lastSolvedAt) return -1;
      if (b.lastSolvedAt) return 1;
      return a.teamName.localeCompare(b.teamName);
    });

    // 2. Fetch active sessions from TiDB
    const activeSessionTeamIds = new Set<string>();
    if (tidb.pool) {
      try {
        const [activeRows] = await tidb.pool.query<any[]>("SELECT team_id FROM team_active_sessions");
        if (Array.isArray(activeRows)) {
          activeRows.forEach((r) => activeSessionTeamIds.add(r.team_id));
        }
      } catch {}
    }

    const eventState = await EventControlService.getEventState();
    const isUnstarted = eventState.status === "not_started";

    const teams = rawTeams.map((t, idx) => {
      const numPart = t.id.replace(/\D/g, "") || String(idx + 1);
      const defaultUsername = t.id === "VECNA-001" ? "VECNA-001" : `TEAM${numPart.padStart(2, "0")}`;
      const defaultPassword = t.id === "VECNA-001" ? "HAWKINS1986" : `hawkins83_${numPart.padStart(2, "0")}`;
      // Sockets alone determine online presence via verified JWT authentication
      const isOnline = socketService.isTeamOnline(t.id);
      const hasActiveSession = activeSessionTeamIds.has(t.id) || SessionService.hasActiveSessionSync(t.id);

      const distinctStages = new Set<number>();
      (t.solvedChapters || []).forEach((c) => {
        const num = Number(c);
        if (!isNaN(num) && num >= 1 && num <= 7) distinctStages.add(num);
      });
      (t.completedTasks || []).forEach((task) => {
        const m = String(task).match(/^(?:ch|chapter)[\-_]?(\d+)/i);
        if (m) {
          const num = Number(m[1]);
          if (!isNaN(num) && num >= 1 && num <= 7) distinctStages.add(num);
        }
      });

      const isVecna = t.role === "VECNA";
      const username = t.id === "VECNA-001" ? "VECNA-001" : ((t as any).username || defaultUsername);
      const password = t.id === "VECNA-001" ? "HAWKINS1986" : ((t as any).password || defaultPassword);

      return {
        ...t,
        rank: idx + 1,
        teamId: t.id,
        score: isUnstarted ? 0 : (typeof t.totalScore === "number" ? t.totalScore : 0),
        totalScore: isUnstarted ? 0 : (typeof t.totalScore === "number" ? t.totalScore : 0),
        username,
        password,
        isOnline,
        hasSession: hasActiveSession,
        solvedCount: isUnstarted ? 0 : (isVecna ? 0 : distinctStages.size),
        currentStage: isUnstarted ? 1 : (isVecna ? 1 : Math.min(6, distinctStages.size + 1)),
      };
    });

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
    try {
      const event = await EventControlService.resumeEvent();
      return res.json({ success: true, event });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err.message });
    }
  },

  async openLogin(_req: Request, res: Response) {
    try {
      const event = await EventControlService.openLogin();
      return res.json({ success: true, event });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err.message });
    }
  },

  async closeLogin(_req: Request, res: Response) {
    const event = await EventControlService.closeLogin();
    return res.json({ success: true, event });
  },

  async openSubmissions(_req: Request, res: Response) {
    try {
      const event = await EventControlService.openSubmissions();
      return res.json({ success: true, event });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err.message });
    }
  },

  async stopSubmissions(_req: Request, res: Response) {
    const event = await EventControlService.stopSubmissions();
    return res.json({ success: true, event });
  },

  async closeSubmissions(req: Request, res: Response) {
    return this.stopSubmissions(req, res);
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

  async resetAllScores(_req: Request, res: Response) {
    await db.resetAllTeamScores();
    socketService.broadcastLeaderboard();
    return res.json({ success: true, message: "All team scores and submissions reset to 0 PTS." });
  },
};

/**
 * POST /api/admin/leaderboard/score - Override team score directly
 */
export const updateAdminTeamScore = async (req: Request, res: Response) => {
  const { teamId, score } = req.body;
  if (!teamId || score === undefined) {
    return res.status(400).json({ success: false, error: "TEAM_ID_AND_SCORE_REQUIRED" });
  }

  const existing = db.getTeamById(String(teamId));
  if (!existing) {
    return res.status(404).json({ success: false, error: "TEAM_NOT_FOUND" });
  }

  const nextScore = Number(score);
  const delta = nextScore - (existing.totalScore || 0);

  const updated = db.updateTeam(String(teamId), {
    totalScore: nextScore,
    breakdown: {
      ...existing.breakdown,
      teamwork: (existing.breakdown?.teamwork || 0) + delta,
    },
  });

  const pool = tidb.pool;
  if (pool) {
    try {
      const overrideId = `OVERRIDE_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      await pool.query(
        `INSERT INTO score_ledger (team_id, round_id, question_id, source_type, source_id, points_delta, created_at)
         VALUES (?, 1, NULL, 'ADMIN_OVERRIDE', ?, ?, NOW(3))`,
        [String(teamId), overrideId, delta]
      );
      await pool.query(
        "UPDATE teams SET total_score = ? WHERE team_id = ?",
        [nextScore, String(teamId)]
      );
    } catch (tidbErr) {
      console.warn("[ADMIN] TiDB updateAdminTeamScore warning:", tidbErr);
    }
  }

  socketService.broadcastLeaderboard();
  if (updated) {
    const scorePayload = {
      type: "SCORE_UPDATE",
      teamId: String(teamId),
      teamName: existing.teamName,
      newScore: nextScore,
      score: nextScore,
      delta: delta,
      reason: "ADMIN_OVERRIDE",
      source: "ADMIN_OVERRIDE",
      ts: Date.now(),
    };
    socketService.emitToTeam(String(teamId), "score:update", scorePayload);
    socketService.broadcastToAdmins("score:update", scorePayload);
    socketService.broadcast("score:update", scorePayload);
  }

  res.json({
    success: true,
    message: `Team ${teamId} score updated to ${nextScore} PTS.`,
    team: updated,
    leaderboard: db.getLeaderboard(),
  });
};
