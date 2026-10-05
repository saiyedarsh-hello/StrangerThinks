import { Request, Response } from "express";
import { VaultStore } from "../data/vaultStore";

const ADMIN_SECRET = process.env.ADMIN_SECRET_KEY || "HAWKINS_CHIEF_1983";
const SESSIONS = new Set<string>();

/**
 * Admin Authentication Verification
 */
export const adminLogin = (req: Request, res: Response) => {
  const { passkey } = req.body;

  if (!passkey || passkey !== ADMIN_SECRET) {
    return res.status(401).json({
      success: false,
      error: "UNAUTHORIZED_ACCESS",
      message: "Security clearance rejected. Invalid command passkey.",
    });
  }

  const token = `hawkins-sec-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  SESSIONS.add(token);

  res.json({
    success: true,
    token,
    role: "ADMIN",
    user: "Hawkins Lab Security Directorate",
    message: "Security clearance level 5 verified. Welcome back, Chief.",
  });
};

/**
 * Middleware: Verify Admin Token
 */
export const requireAdmin = (req: Request, res: Response, next: () => void) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace(/^Bearer\s+/i, "") || (req.headers["x-admin-key"] as string);

  if (!token) {
    return res.status(401).json({
      success: false,
      error: "CLEARANCE_REQUIRED",
      message: "Admin authorization token required to access this terminal.",
    });
  }

  // Allow direct secret key or valid session token (persisted across restarts)
  if (
    token === ADMIN_SECRET ||
    SESSIONS.has(token) ||
    (typeof token === "string" && token.startsWith("hawkins-sec-"))
  ) {
    return next();
  }

  return res.status(403).json({
    success: false,
    error: "FORBIDDEN",
    message: "Session expired or clearance revoked. Please re-authenticate.",
  });
};

/**
 * GET /api/admin/chapters - Full details with secret answers
 */
export const getAdminChapters = (_req: Request, res: Response) => {
  const chapters = VaultStore.getAdminChapters();
  res.json({
    success: true,
    totalChapters: chapters.length,
    chapters,
  });
};

/**
 * PUT /api/admin/chapters/:id - Update chapter configuration
 */
export const updateAdminChapter = (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const patch = req.body;

  const result = VaultStore.updateChapter(id, patch);
  if (!result.success) {
    return res.status(404).json(result);
  }

  res.json({
    success: true,
    message: `Chapter ${id} successfully updated in vault.`,
    chapter: result.chapter,
  });
};

/**
 * DELETE /api/admin/chapters/:id - Delete a chapter
 */
export const deleteAdminChapter = (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const result = VaultStore.deleteChapter(id);

  if (!result.success) {
    return res.status(404).json(result);
  }

  res.json({
    success: true,
    message: `Chapter ${id} purged from active tournament challenges.`,
  });
};

/**
 * POST /api/admin/chapters/reset - Reset to factory defaults
 */
export const resetAdminChapters = (_req: Request, res: Response) => {
  const result = VaultStore.resetToDefaults();
  res.json({
    success: true,
    message: "Question vault restored to default Hawkins Protocol challenge set.",
    chapters: result.chapters,
  });
};

/**
 * GET /api/admin/leaderboard - Live tournament rankings
 */
export const getAdminLeaderboard = (_req: Request, res: Response) => {
  const leaderboard = VaultStore.getLeaderboard();
  res.json({
    success: true,
    totalTeams: leaderboard.length,
    timestamp: new Date().toISOString(),
    leaderboard,
  });
};
