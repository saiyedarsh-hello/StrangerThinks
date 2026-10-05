import { Request, Response, NextFunction } from "express";

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const attemptsMap = new Map<string, RateLimitRecord>();

// Periodic memory cleanup for expired rate limit windows
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of attemptsMap.entries()) {
    if (now > record.resetTime) {
      attemptsMap.delete(key);
    }
  }
}, 60000);

/**
 * High-concurrency rate limiter.
 * Configured to easily support 100+ concurrent requests at a single time.
 */
export function rateLimiter(
  maxAttempts = parseInt(process.env.RATE_LIMIT_MAX_ATTEMPTS || "300", 10),
  windowMs = 30000
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const teamId = (req.body?.teamId as string) || "";
    const key = teamId ? `team-${teamId}` : (req.ip || "client");
    const now = Date.now();
    const record = attemptsMap.get(key);

    if (!record || now > record.resetTime) {
      attemptsMap.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }

    if (record.count >= maxAttempts) {
      const waitSeconds = Math.ceil((record.resetTime - now) / 1000);
      return res.status(429).json({
        success: false,
        error: "RATE_LIMIT_EXCEEDED",
        message: `Too many verification attempts. Please wait ${waitSeconds} seconds before trying again.`,
      });
    }

    record.count += 1;
    attemptsMap.set(key, record);
    next();
  };
}
