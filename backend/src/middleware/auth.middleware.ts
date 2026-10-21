import { Request, Response, NextFunction } from "express";
import { AuthService } from "../services/auth.service";
import { SessionService } from "../services/session.service";
import { Role } from "../types";

declare global {
  namespace Express {
    interface Request {
      user?: {
        teamId: string;
        teamName: string;
        leaderName: string;
        role: Role;
      };
    }
  }
}

export function requireAuth(allowedRoles?: Role[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        error: "UNAUTHORIZED",
        message: "Authentication token is required.",
      });
    }

    const token = authHeader.split(" ")[1];
    const session = AuthService.verifyToken(token);

    if (!session) {
      return res.status(401).json({
        success: false,
        error: "INVALID_TOKEN",
        message: "Session token is invalid or has expired.",
      });
    }

    if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(session.role)) {
      return res.status(403).json({
        success: false,
        error: "FORBIDDEN",
        message: `Role [${session.role}] does not have permission to access this resource.`,
      });
    }

    // Stateful check: verify player session is still active (not revoked by admin force-logout)
    if (session.role === "PLAYER") {
      const active = await SessionService.hasActiveSession(session.teamId);
      if (!active) {
        return res.status(401).json({
          success: false,
          error: "SESSION_REVOKED",
          message: "Session has been terminated or logged out by administrator.",
        });
      }
    }

    if (session.role === "VECNA" && !SessionService.hasActiveVecnaSessionSync(1)) {
      return res.status(401).json({
        success: false,
        error: "SESSION_REVOKED",
        message: "Vecna session has ended or been logged out.",
      });
    }

    req.user = session;
    next();
  };
}

export function extractAuth() {
  return (req: Request, _res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      const session = AuthService.verifyToken(token);
      if (session) {
        req.user = session;
      }
    }
    next();
  };
}
