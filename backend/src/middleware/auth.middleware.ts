import { Request, Response, NextFunction } from "express";
import { AuthService } from "../services/auth.service";
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
  return (req: Request, res: Response, next: NextFunction) => {
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

    req.user = session;
    next();
  };
}
