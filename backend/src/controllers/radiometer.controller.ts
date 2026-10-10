import { Request, Response } from "express";
import { ValidationService } from "../services/validation.service";
import { socketService } from "../services/socket.service";

export const RadiometerController = {
  /**
   * POST /api/radiometer/validate-pin — Validates a single pin calibration (0-4)
   */
  validatePin(req: Request, res: Response) {
    const { pinIndex, answer, teamId } = req.body;

    if (pinIndex === undefined || answer === undefined) {
      return res.status(400).json({
        success: false,
        error: "MISSING_FIELDS",
        message: "pinIndex and answer are required.",
      });
    }

    const targetTeamId = teamId || req.user?.teamId;
    const result = ValidationService.validateRadiometerPin(
      Number(pinIndex),
      answer,
      targetTeamId
    );

    if (result.success) {
      socketService.broadcastLeaderboard();
      return res.json(result);
    } else {
      return res.status(400).json(result);
    }
  },

  /**
   * POST /api/radiometer/validate-keypad — Validates the 5-digit master cipher (83479)
   */
  validateKeypad(req: Request, res: Response) {
    const { code, teamId } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: "MISSING_CODE",
        message: "A 5-digit master code is required.",
      });
    }

    const targetTeamId = teamId || req.user?.teamId;
    const result = ValidationService.validateMasterKeypad(String(code), targetTeamId);

    if (result.success) {
      socketService.broadcastLeaderboard();
      return res.json(result);
    } else {
      return res.status(400).json(result);
    }
  },
};
