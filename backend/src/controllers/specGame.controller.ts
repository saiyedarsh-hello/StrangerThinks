import { Request, Response } from "express";
import { EventControlService } from "../services/eventControl.service";
import { QuestionService } from "../services/question.service";
import { VecnaService } from "../services/vecna.service";
import { db } from "../services/db.service";
import { tidb } from "../config/tidb";

export const SpecGameController = {
  /**
   * GET /api/event/state — Read event status relevant to participants
   */
  async getEventState(_req: Request, res: Response) {
    const event = await EventControlService.getEventState();
    return res.json({
      success: true,
      event: {
        eventCode: event.eventCode,
        eventName: event.eventName,
        status: event.status,
        loginOpen: event.loginOpen,
        submissionsOpen: event.submissionsOpen,
        isPaused: event.isPaused,
        startedAt: event.startedAt,
      },
    });
  },

  /**
   * GET /api/me/progress — Restore team progress after refresh or relogin
   */
  async getMyProgress(req: Request, res: Response) {
    const teamId = req.user?.teamId || (req.query.teamId as string) || "T01";
    const team = db.getTeamById(teamId);
    const pool = tidb.pool;

    let unlockedRounds: any[] = [{ roundId: 1, roundName: "Chapter 1", status: "unlocked" }];
    let score = team?.totalScore || 0;

    if (pool) {
      try {
        const [progRows] = await pool.query<any[]>(
          `SELECT r.round_id, r.round_number, r.round_code, r.round_name, p.status, p.unlocked_at, p.completed_at
           FROM team_round_progress p
           JOIN rounds r ON p.round_id = r.round_id
           WHERE p.team_id = ?
           ORDER BY r.round_number ASC`,
          [teamId]
        );
        if (Array.isArray(progRows) && progRows.length > 0) {
          unlockedRounds = progRows;
        }

        const [scoreRows] = await pool.query<any[]>(
          "SELECT COALESCE(SUM(points_delta), 0) AS total FROM score_ledger WHERE team_id = ?",
          [teamId]
        );
        score = Number(scoreRows?.[0]?.total || score);
      } catch {}
    }

    return res.json({
      success: true,
      teamId,
      teamName: team?.teamName || "Hawkins Squad",
      score,
      unlockedRounds,
      stage: team?.stage || "hawkins",
      location: team?.location || "town",
    });
  },

  /**
   * GET /api/me/rounds — List rounds accessible to this team
   */
  async getMyRounds(req: Request, res: Response) {
    const teamId = req.user?.teamId || (req.query.teamId as string) || "T01";
    const pool = tidb.pool;

    if (pool) {
      try {
        const [rows] = await pool.query<any[]>(
          `SELECT r.round_id, r.round_number, r.round_code, r.round_name, COALESCE(p.status, 'locked') AS status
           FROM rounds r
           LEFT JOIN team_round_progress p ON r.round_id = p.round_id AND p.team_id = ?
           WHERE r.is_active = 1
           ORDER BY r.round_number ASC`,
          [teamId]
        );
        return res.json({ success: true, rounds: rows });
      } catch {}
    }

    // Fallback using chapters
    const chapters = db.getSanitizedChapters();
    const rounds = chapters.map((c: any) => ({
      roundId: c.id,
      roundNumber: c.id,
      roundCode: `R${c.id}`,
      roundName: c.archiveTitle,
      status: c.id === 1 ? "unlocked" : "locked",
    }));

    return res.json({ success: true, rounds });
  },

  /**
   * GET /api/rounds/:roundId/questions/:questionCode — Fetch an accessible question
   */
  async getQuestion(req: Request, res: Response) {
    const roundId = parseInt(req.params.roundId, 10);
    const { questionCode } = req.params;
    const teamId = req.user?.teamId || (req.query.teamId as string) || "T01";

    const question = await QuestionService.getAccessibleQuestion(teamId, roundId, questionCode);
    if (question.error) {
      return res.status(403).json({ success: false, ...question });
    }

    return res.json({ success: true, question });
  },

  /**
   * POST /api/questions/:questionCode/submit — Authoritative HMAC submit
   */
  async submitAnswer(req: Request, res: Response) {
    const { questionCode } = req.params;
    const { answer } = req.body;
    const teamId = req.user?.teamId || req.body.teamId || "T01";

    if (!answer || typeof answer !== "string") {
      return res.status(400).json({
        success: false,
        error: "MISSING_ANSWER",
        message: "Answer text is required.",
      });
    }

    const result = await QuestionService.submitAnswer(teamId, questionCode, answer);
    return res.json(result);
  },

  /**
   * POST /api/questions/:questionCode/hints/:hintId/use — Consume hint
   */
  async useHint(req: Request, res: Response) {
    const { questionCode, hintId } = req.params;
    const teamId = req.user?.teamId || req.body.teamId || "T01";

    const result = await QuestionService.useHint(teamId, questionCode, parseInt(hintId, 10));
    if (!result.success) {
      return res.status(400).json(result);
    }
    return res.json(result);
  },

  /**
   * GET /api/me/submissions — Restore own submission status
   */
  async getMySubmissions(req: Request, res: Response) {
    const teamId = req.user?.teamId || (req.query.teamId as string) || "T01";
    const pool = tidb.pool;

    if (pool) {
      try {
        const [rows] = await pool.query<any[]>(
          `SELECT s.submission_id, s.round_id, s.question_id, q.question_code, s.is_correct, s.points_awarded, s.submitted_at
           FROM question_submissions s
           JOIN questions q ON s.question_id = q.question_id
           WHERE s.team_id = ?
           ORDER BY s.submitted_at ASC`,
          [teamId]
        );
        return res.json({ success: true, submissions: rows });
      } catch {}
    }

    return res.json({ success: true, submissions: [] });
  },

  /**
   * GET /api/me/vecna-messages — Fetch approved messages in team inbox
   */
  async getMyVecnaMessages(req: Request, res: Response) {
    const teamId = req.user?.teamId || (req.query.teamId as string) || "T01";
    const inbox = await VecnaService.getTeamInbox(teamId);
    return res.json({
      success: true,
      messages: inbox,
      count: inbox.length,
    });
  },

  /**
   * POST /api/me/vecna-messages/:deliveryId/read — Mark delivered message read
   */
  async markVecnaMessageRead(req: Request, res: Response) {
    const deliveryId = parseInt(req.params.deliveryId, 10);
    const teamId = req.user?.teamId || (req.query.teamId as string) || "T01";

    const ok = await VecnaService.markMessageRead(teamId, deliveryId);
    return res.json({ success: ok });
  },
};
