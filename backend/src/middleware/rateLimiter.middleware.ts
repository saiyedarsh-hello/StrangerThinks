import rateLimit from "express-rate-limit";

/**
 * Anti-Brute-Force Rate Limiter for Answer Verification
 * Allows up to 45 validation attempts per minute per IP.
 */
export const validationRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 45, // max 45 attempts per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "RATE_LIMIT_EXCEEDED",
    message: "TOO MANY TRANSMISSION ATTEMPTS · SYSTEM COOLDOWN ACTIVE",
  },
});
