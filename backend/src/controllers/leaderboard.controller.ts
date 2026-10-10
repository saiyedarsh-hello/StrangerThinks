import { Request, Response } from "express";
import { db } from "../services/db.service";

export const LeaderboardController = {
  /**
   * GET /api/leaderboard — Returns current live tournament standings
   */
  getLeaderboard(_req: Request, res: Response) {
    const leaderboard = db.getLeaderboard();
    return res.json({
      success: true,
      leaderboard,
    });
  },
};
