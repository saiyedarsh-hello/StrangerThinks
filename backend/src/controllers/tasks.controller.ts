import { Request, Response } from "express";
import { ValidationService } from "../services/validation.service";
import { db } from "../services/db.service";
import { socketService } from "../services/socket.service";

export const TasksController = {
  /**
   * POST /api/tasks/validate — Validates interactive mini-game tasks
   */
  validateTask(req: Request, res: Response) {
    const { taskId, answer, teamId } = req.body;

    if (!taskId || answer === undefined) {
      return res.status(400).json({
        success: false,
        error: "MISSING_FIELDS",
        message: "taskId and answer are required.",
      });
    }

    const targetTeamId = teamId || req.user?.teamId;
    const result = ValidationService.validateTask(String(taskId), String(answer), targetTeamId);

    if (result.success) {
      socketService.broadcastLeaderboard();
      return res.json(result);
    } else {
      return res.status(400).json(result);
    }
  },

  /**
   * POST /api/tasks/hint/unlock — Deducts penalty and unlocks classified intel
   */
  unlockHint(req: Request, res: Response) {
    const { hintKey, cost, teamId } = req.body;

    if (!hintKey) {
      return res.status(400).json({ success: false, error: "MISSING_HINT_KEY" });
    }

    const targetTeamId = teamId || req.user?.teamId;
    const penaltyCost = cost !== undefined ? Number(cost) : 10;

    if (targetTeamId) {
      const team = db.getTeamById(targetTeamId);
      if (team) {
        const nextHints = { ...team.unlockedHints, [hintKey]: true };
        db.updateTeam(team.id, {
          unlockedHints: nextHints,
          penalty: team.penalty + penaltyCost,
        });
        socketService.broadcastLeaderboard();
      }
    }

    return res.json({
      success: true,
      hintKey,
      cost: penaltyCost,
      message: `CLASSIFIED INTEL DECRYPTED (-${penaltyCost} PTS PENALTY)`,
    });
  },
};
