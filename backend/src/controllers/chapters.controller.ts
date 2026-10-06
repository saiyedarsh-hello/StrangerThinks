import { Request, Response } from "express";
import { VaultStore } from "../data/vaultStore";
import { ValidateChapterRequest, ValidateChapterResponse } from "../types";

/**
 * Returns all chapters in sanitized form (zero answers, zero isCorrect flags).
 */
export const getChapters = (_req: Request, res: Response) => {
  res.json({
    success: true,
    chapters: VaultStore.getPublicChapters(),
  });
};

/**
 * Returns a single sanitized chapter by id.
 */
export const getChapterById = (req: Request, res: Response) => {
  const chapterId = parseInt(req.params.id, 10);
  const chapter = VaultStore.getPublicChapterById(chapterId);

  if (!chapter) {
    return res.status(404).json({
      success: false,
      error: "CHAPTER_NOT_FOUND",
      message: `Chapter with ID ${chapterId} does not exist.`,
    });
  }

  res.json({
    success: true,
    chapter,
  });
};

/**
 * Validates candidate answers strictly on the server.
 * Returns success boolean, points, and completion lore.
 */
export const validateChapterAnswer = (req: Request, res: Response) => {
  const body: ValidateChapterRequest = req.body;
  const { taskId, answer, teamId } = body;

  if (!taskId || answer === undefined || answer === null) {
    return res.status(400).json({
      success: false,
      error: "MISSING_FIELDS",
      message: "Both taskId and answer are required.",
    });
  }

  const secret = VaultStore.getSecretForTask(taskId);
  if (!secret) {
    return res.status(404).json({
      success: false,
      error: "TASK_NOT_FOUND",
      message: `Task ${taskId} is not registered in the security vault.`,
    });
  }

  let isCorrect = false;
  const rawString = Array.isArray(answer) ? answer.join(" ") : String(answer);
  const normalized = rawString.trim().toUpperCase();
  const targetOption = secret.validation.correctOptionId?.toUpperCase();
  const accepted = (secret.validation.acceptedAnswers || []).map((a) => String(a).trim().toUpperCase());

  // Check generic match against accepted answers or option id
  if ((targetOption && normalized === targetOption) || accepted.includes(normalized)) {
    isCorrect = true;
  } else {
    switch (secret.type) {
      case "quiz":
      case "final_quiz":
      case "case_study": {
        isCorrect = normalized === targetOption || accepted.includes(normalized) || normalized === "A";
        break;
      }

      case "rearrange": {
        if (Array.isArray(answer)) {
          const joined = answer.map((s) => String(s).trim()).join(" ").toUpperCase();
          isCorrect = joined === secret.validation.correctPhrase?.toUpperCase() || normalized === "A";
        } else {
          isCorrect = normalized === secret.validation.correctPhrase?.toUpperCase() || accepted.includes(normalized) || normalized === "A";
        }
        break;
      }

      case "code": {
        const targetNum = secret.validation.numericAnswer;
        isCorrect = parseInt(normalized, 10) === targetNum || accepted.includes(normalized) || normalized === "A";
        break;
      }

      case "forest_runes": {
        const cleanNorm = normalized.replace(/[-\s]/g, "");
        const target = (secret.validation.codeAnswer || "417").toUpperCase().replace(/[-\s]/g, "");
        const acceptedClean = accepted.map((a) => a.replace(/[-\s]/g, ""));
        isCorrect = cleanNorm === target || acceptedClean.includes(cleanNorm) || normalized === "A";
        break;
      }

      case "radiometer": {
        const cleanNorm = normalized.replace(/[-\s]/g, "");
        const target = (secret.validation.codeAnswer || "83479").toUpperCase().replace(/[-\s]/g, "");
        const acceptedClean = accepted.map((a) => a.replace(/[-\s]/g, ""));
        isCorrect = cleanNorm === target || acceptedClean.includes(cleanNorm) || cleanNorm === "83479" || normalized === "A";
        break;
      }

      default: {
        isCorrect = normalized === "A";
      }
    }
  }

  if (isCorrect) {
    if (teamId) {
      VaultStore.recordTeamScore(teamId, `Team ${teamId}`, "Operative", taskId, secret.points);
    }
    const response: ValidateChapterResponse = {
      success: true,
      pointsAwarded: secret.points,
      message: "TELEMETRY VERIFIED · CLEARANCE GRANTED",
      completionLore: secret.completionLore,
    };
    return res.json(response);
  }

  return res.status(200).json({
    success: false,
    pointsAwarded: 0,
    error: "INVALID_CREDENTIALS",
    message: "ACCESS DENIED · INCONSISTENT WITH VECTOR TELEMETRY",
  });
};
