import { Request, Response } from "express";
import { AuthService } from "../services/auth.service";
import { db } from "../services/db.service";

export const AuthController = {
  async login(req: Request, res: Response) {
    const { teamName, leaderName } = req.body;

    if (!teamName || !leaderName) {
      return res.status(400).json({
        success: false,
        error: "MISSING_FIELDS",
        message: "teamName and leaderName are required.",
      });
    }

    const result = await AuthService.login(teamName, leaderName);
    if (!result.success) {
      const statusCode = result.error === "ALREADY_LOGGED_IN" ? 409 : 401;
      return res.status(statusCode).json(result);
    }

    return res.json(result);
  },

  async logout(req: Request, res: Response) {
    if (req.user?.teamId) {
      await AuthService.logout(req.user.teamId);
    }
    return res.json({ success: true, message: "Logged out successfully." });
  },

  adminLogin(req: Request, res: Response) {
    const { passkey } = req.body;

    if (!passkey) {
      return res.status(400).json({
        success: false,
        error: "MISSING_PASSKEY",
        message: "Chief passkey is required.",
      });
    }

    const result = AuthService.adminLogin(passkey);
    if (!result.success) {
      return res.status(401).json(result);
    }

    return res.json(result);
  },

  getMe(req: Request, res: Response) {
    if (!req.user) {
      return res.status(401).json({ success: false, error: "UNAUTHORIZED" });
    }

    const team = db.getTeamById(req.user.teamId);
    return res.json({
      success: true,
      session: req.user,
      team,
    });
  },
};
