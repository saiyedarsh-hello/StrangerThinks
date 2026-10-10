import { Request, Response } from "express";
import { db } from "../services/db.service";
import { ValidationService } from "../services/validation.service";
import { socketService } from "../services/socket.service";

export const ChaptersController = {
  /**
   * GET /api/chapters — Returns all 7 sanitized chapters (zero secret answers)
   */
  getSanitizedChapters(_req: Request, res: Response) {
    const chapters = db.getSanitizedChapters();
    return res.json({
      success: true,
      chapters,
    });
  },

  /**
   * GET /api/chapters/:id — Returns single sanitized chapter
   */
  getSanitizedChapterById(req: Request, res: Response) {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: "INVALID_ID" });
    }

    const chapter = db.getSanitizedChapterById(id);
    if (!chapter) {
      return res.status(404).json({ success: false, error: "CHAPTER_NOT_FOUND" });
    }

    return res.json({
      success: true,
      chapter,
    });
  },

  /**
   * POST /api/chapters/validate — Validates candidate chapter answer array/string
   */
  validateChapter(req: Request, res: Response) {
    const { chapterId, taskId, answer, teamId } = req.body;

    if (!chapterId || !taskId || answer === undefined) {
      return res.status(400).json({
        success: false,
        error: "MISSING_FIELDS",
        message: "chapterId, taskId, and answer are required.",
      });
    }

    // Determine target teamId from body or authenticated session
    const targetTeamId = teamId || req.user?.teamId;

    const result = ValidationService.validateChapter(
      Number(chapterId),
      String(taskId),
      answer,
      targetTeamId
    );

    if (result.success) {
      // Broadcast live leaderboard to all connected sockets
      socketService.broadcastLeaderboard();
      return res.json(result);
    } else {
      return res.status(400).json(result);
    }
  },
};
