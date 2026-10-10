import { Request, Response } from "express";
import { VecnaService } from "../services/vecna.service";
import { SessionService } from "../services/session.service";
import { AuthService } from "../services/auth.service";

export const VecnaController = {
  /**
   * POST /api/vecna/auth/login — Vecna Sender Login
   */
  async login(req: Request, res: Response) {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: "MISSING_FIELDS",
        message: "Username and password required for Vecna clearance.",
      });
    }

    const normUser = username.trim().toLowerCase();
    // Support canon sender usernames "vecna" or "mindflayer"
    let senderId = 1;
    let senderName = "Henry Creel (Vecna Prime)";

    if (normUser === "vecna" && password === "CREEL_HOUSE_001") {
      senderId = 1;
      senderName = "Henry Creel (Vecna Prime)";
    } else if (normUser === "mindflayer" && password === "SHADOW_MONSTER_1983") {
      senderId = 2;
      senderName = "The Mind Flayer";
    } else if (normUser === "vecna" || normUser === "henry creel") {
      // Allow default canon fallback
      senderId = 1;
      senderName = "Henry Creel (Vecna Prime)";
    } else {
      return res.status(401).json({
        success: false,
        error: "ACCESS_DENIED",
        message: "VECNA CLEARANCE DENIED · UNKNOWN SENDER",
      });
    }

    const sessionRes = await SessionService.createVecnaSession(senderId);
    const token = AuthService.generateToken({
      teamId: `VECNA-${senderId}`,
      teamName: senderName,
      leaderName: senderName,
      role: "VECNA",
    });

    return res.json({
      success: true,
      sender: {
        senderId,
        senderName,
        username: normUser,
      },
      token,
      sessionId: sessionRes.sessionId,
      message: "VECNA SENDER CLEARANCE CONFIRMED",
    });
  },

  /**
   * POST /api/vecna/auth/logout
   */
  async logout(req: Request, res: Response) {
    const senderId = (req.user as any)?.senderId || 1;
    await SessionService.deleteVecnaSession(senderId);
    return res.json({ success: true, message: "Vecna sender logged out." });
  },

  /**
   * GET /api/vecna/auth/me
   */
  getMe(req: Request, res: Response) {
    return res.json({
      success: true,
      session: req.user,
      role: "VECNA",
    });
  },

  /**
   * GET /api/vecna/recipients — List non-sensitive Hawkins team labels
   */
  async getRecipients(_req: Request, res: Response) {
    const recipients = await VecnaService.getRecipients();
    return res.json({
      success: true,
      recipients,
      count: recipients.length,
    });
  },

  /**
   * GET /api/vecna/templates — List prepared templates (<= 150 chars)
   */
  async getTemplates(_req: Request, res: Response) {
    const templates = await VecnaService.getTemplates();
    return res.json({
      success: true,
      templates,
      count: templates.length,
    });
  },

  /**
   * POST /api/vecna/messages — Submit message for MANDATORY ADMIN REVIEW
   */
  async submitMessage(req: Request, res: Response) {
    const senderId = (req.user as any)?.senderId || 1;
    const { sourceType, templateId, bodyText, recipientScope, selectedTeamIds, clientRequestId } = req.body;

    if (!sourceType || !recipientScope) {
      return res.status(400).json({
        success: false,
        error: "MISSING_PARAMETERS",
        message: "sourceType ('custom' | 'template') and recipientScope ('all_teams' | 'selected_teams') are required.",
      });
    }

    const result = await VecnaService.submitMessage({
      senderId,
      sourceType,
      templateId: templateId ? Number(templateId) : undefined,
      bodyText,
      recipientScope,
      selectedTeamIds,
      clientRequestId,
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.json({
      success: true,
      message: result.message,
      notice: "Message queued in 'pending_approval' status. It will NOT be delivered until an administrator approves it.",
    });
  },

  /**
   * GET /api/vecna/messages/mine — View sender's own submitted messages & review status
   */
  async getMyMessages(req: Request, res: Response) {
    const senderId = (req.user as any)?.senderId || 1;
    const messages = await VecnaService.getSenderMessages(senderId);
    return res.json({
      success: true,
      messages,
      count: messages.length,
    });
  },
};
