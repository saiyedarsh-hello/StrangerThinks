import { Request, Response } from "express";
import { AuthService } from "../services/auth.service";
import { SessionService } from "../services/session.service";
import { db } from "../services/db.service";

export const AuthController = {
  async login(req: Request, res: Response) {
    const { teamName, leaderName, password } = req.body;

    if (!teamName || !leaderName) {
      return res.status(400).json({
        success: false,
        error: "MISSING_FIELDS",
        message: "teamName and leaderName are required.",
      });
    }

    const result = await AuthService.login(teamName, leaderName, password);

    if (result.requiresPassword) {
      // 200 OK with challenge flag so client prompts for clearance key
      return res.status(200).json(result);
    }

    if (!result.success) {
      const statusCode =
        result.error === "ALREADY_LOGGED_IN"
          ? 409
          : result.error === "LOGIN_CLOSED" || result.error === "EVENT_ENDED"
          ? 403
          : 401;
      return res.status(statusCode).json(result);
    }

    // Set auth cookie
    res.cookie("hawkins_session_token", result.token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000,
    });

    if (result.session?.role === "ADMIN") {
      res.cookie("hawkins_admin_token", result.token, {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 24 * 60 * 60 * 1000,
      });
    }

    return res.json(result);
  },

  async logout(req: Request, res: Response) {
    const teamId = req.user?.teamId || req.body?.teamId;
    if (teamId) {
      await AuthService.logout(teamId);
    }
    if (req.user?.role === "VECNA" || (teamId && teamId.startsWith("VECNA"))) {
      await SessionService.deleteVecnaSession(1);
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

    if (req.user.role === "PLAYER" && !SessionService.hasActiveSessionSync(req.user.teamId)) {
      return res.status(401).json({
        success: false,
        error: "SESSION_REVOKED",
        message: "Session has been terminated by administrator.",
      });
    }

    const currentTeamId = req.user?.teamId;
    let team = currentTeamId ? db.getTeamById(currentTeamId) : null;
    if (!team && req.user?.role === "VECNA") {
      team = db.getTeamById("VECNA-001") || db.getAllTeams().find((t) => t.role === "VECNA") || null;
    }
    const now = Date.now();
    const activeSabotages = currentTeamId
      ? db
          .getActiveSabotages()
          .filter(
            (s) =>
              (s.target === currentTeamId ||
                (s as any).targetTeamId === currentTeamId ||
                s.target === "all") &&
              s.expiresAt > now
          )
          .map((s) => ({
            id: s.id,
            kind: s.kind,
            pinIndex: s.pinIndex,
            message: s.message,
            operatorName: s.operatorName,
            duration: Math.max(1, Math.ceil((s.expiresAt - now) / 1000)),
            durationSec: Math.max(1, Math.ceil((s.expiresAt - now) / 1000)),
            until: s.expiresAt,
            target: s.target,
          }))
      : [];

    return res.json({
      success: true,
      session: req.user,
      team: team ? { ...team, score: team.totalScore } : null,
      activeSabotages,
    });
  },
};
