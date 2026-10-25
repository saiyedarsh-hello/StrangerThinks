import { Request, Response } from "express";
import { ValidationService } from "../services/validation.service";
import { ScoreService } from "../services/score.service";
import { db } from "../services/db.service";
import { socketService } from "../services/socket.service";
import { tidb } from "../config/tidb";

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
  async unlockHint(req: Request, res: Response) {
    const { hintKey, cost, teamId } = req.body;

    if (!hintKey) {
      return res.status(400).json({ success: false, error: "MISSING_HINT_KEY" });
    }

    const targetTeamId = req.user?.teamId || teamId;
    const penaltyCost = Number(cost) > 0 ? Number(cost) : 5;

    if (targetTeamId) {
      const team = db.getTeamById(targetTeamId);
      if (team) {
        if (team.unlockedHints?.[hintKey]) {
          return res.json({
            success: true,
            hintKey,
            cost: 0,
            currentScore: team.totalScore ?? 0,
            message: "CLASSIFIED INTEL ALREADY DECRYPTED (NO ADDITIONAL PENALTY)",
          });
        }

        const currentScore = typeof team.totalScore === "number" ? team.totalScore : 0;
        if (currentScore < penaltyCost) {
          return res.status(400).json({
            success: false,
            error: "INSUFFICIENT_BALANCE",
            currentScore,
            message: `Insufficient score balance. You need at least ${penaltyCost} points to unlock an Intel Clue.`,
          });
        }

        const nextHints = { ...team.unlockedHints, [hintKey]: true };
        const newScore = Math.max(0, currentScore - penaltyCost);
        const updated = db.updateTeam(team.id, {
          unlockedHints: nextHints,
          penalty: (team.penalty || 0) + penaltyCost,
          totalScore: newScore,
        });

        // Persist to TiDB if pool is available
        const pool = tidb.pool;
        if (pool) {
          try {
            await pool.query(
              `INSERT INTO score_ledger (team_id, round_id, question_id, source_type, source_id, points_delta, created_at)
               VALUES (?, 1, NULL, 'hint_penalty', ?, ?, NOW(3))
               ON DUPLICATE KEY UPDATE points_delta = points_delta`,
              [team.id, String(hintKey), -penaltyCost]
            );
            await pool.query(
              "UPDATE teams SET penalty = penalty + ?, total_score = GREATEST(0, total_score - ?) WHERE team_id = ?",
              [penaltyCost, penaltyCost, team.id]
            );
          } catch (tidbErr) {
            console.warn("[TASKS] TiDB hint penalty write warning:", tidbErr);
          }
        }

        socketService.broadcastLeaderboard();

        if (updated) {
          const scorePayload = {
            type: "SCORE_UPDATE",
            teamId: team.id,
            teamName: team.teamName,
            newScore: updated.totalScore,
            score: updated.totalScore,
            delta: -penaltyCost,
            breakdown: updated.breakdown,
            source: "INTEL_CLUE",
            ts: Date.now(),
          };
          socketService.emitToTeam(team.id, "score:update", scorePayload);
          socketService.broadcastToAdmins("score:update", scorePayload);
          socketService.broadcast("score:update", scorePayload);
        }

        return res.json({
          success: true,
          hintKey,
          cost: penaltyCost,
          currentScore: newScore,
          message: `CLASSIFIED INTEL DECRYPTED (-${penaltyCost} PTS PENALTY)`,
        });
      }
    }

    return res.status(404).json({ success: false, error: "TEAM_NOT_FOUND" });
  },

  /**
   * POST /api/tasks/progress — Authoritatively persists all team progress, scores, and unlocked locations to the DB
   */
  saveProgress(req: Request, res: Response) {
    const { teamId, completedTasks, solvedChapters, taskScores, unlockedLocations, storyProgress, breakdown, totalScore, penalty } = req.body;
    const targetTeamId = req.user?.teamId || teamId;

    if (!targetTeamId) {
      return res.status(400).json({ success: false, error: "MISSING_TEAM_ID" });
    }

    const team = db.getTeamById(targetTeamId);
    if (!team) {
      return res.status(404).json({ success: false, error: "TEAM_NOT_FOUND" });
    }

    const updates: any = {};
    if (Array.isArray(completedTasks)) {
      updates.completedTasks = Array.from(new Set([...team.completedTasks, ...completedTasks]));
    }
    if (Array.isArray(solvedChapters)) {
      updates.solvedChapters = Array.from(new Set([...team.solvedChapters, ...solvedChapters]));
    }
    if (taskScores && typeof taskScores === "object") {
      updates.taskScores = { ...(team.taskScores || {}), ...taskScores };
    }
    if (unlockedLocations && typeof unlockedLocations === "object") {
      updates.unlockedLocations = { ...team.unlockedLocations, ...unlockedLocations };
    }
    if (typeof storyProgress === "number") {
      updates.storyProgress = Math.max(team.storyProgress, storyProgress);
    }
    if (breakdown && typeof breakdown === "object") {
      updates.breakdown = { ...team.breakdown, ...breakdown };
    }
    if (typeof penalty === "number") {
      updates.penalty = penalty;
    }
    // Authoritatively calculate totalScore: taskScores sum minus penalty is authoritative!
    const effectiveTaskScores = updates.taskScores || team.taskScores;
    const taskSum = effectiveTaskScores && Object.keys(effectiveTaskScores).length > 0
      ? Object.values(effectiveTaskScores).reduce((acc: number, val: any) => acc + (Number(val) || 0), 0)
      : 0;

    // Always subtract penalty so score = gross - penalty (never count penalty separately)
    const effectivePenalty = updates.penalty !== undefined ? updates.penalty : (team.penalty || 0);

    if (taskSum > 0) {
      updates.totalScore = Math.max(0, taskSum - effectivePenalty);
      updates.breakdown = { ...(updates.breakdown || team.breakdown || {}), puzzle: taskSum, tech: 0 };
    } else {
      const effectiveBreakdown = updates.breakdown || team.breakdown;
      const effectivePenalty = updates.penalty !== undefined ? updates.penalty : team.penalty;
      updates.totalScore = ScoreService.calculateTotalScore(effectiveBreakdown, effectivePenalty);
    }
    updates.lastSolvedAt = new Date().toISOString();

    const updated = db.updateTeam(team.id, updates);
    socketService.broadcastLeaderboard();

    return res.json({
      success: true,
      team: updated,
      message: "Progress safely synchronized with database.",
    });
  },
};
