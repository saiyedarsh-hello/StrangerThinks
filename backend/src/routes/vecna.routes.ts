import { Router } from "express";
import { VecnaController } from "../controllers/vecna.controller";
import { requireAuth } from "../middleware/auth.middleware";
import { loginRateLimiter } from "../middleware/rateLimiter.middleware";

const router = Router();

// Vecna Sender Authentication
router.post("/auth/login", loginRateLimiter, VecnaController.login);
router.post("/auth/logout", requireAuth(["VECNA", "ADMIN"]), VecnaController.logout);
router.get("/auth/me", requireAuth(["VECNA", "ADMIN"]), VecnaController.getMe);

// Targets & Templates (Public / Authenticated)
router.get("/recipients", VecnaController.getRecipients);
router.get("/templates", VecnaController.getTemplates);

// Dispatch Quota (5 max event-wide)
router.get("/dispatch/quota", VecnaController.getDispatchQuota);
router.post("/dispatch/reset", requireAuth(["ADMIN"]), VecnaController.resetDispatchQuota);

// Message Submission & Sender Queue (Requires VECNA or ADMIN role)
router.post("/messages", requireAuth(["VECNA", "ADMIN"]), VecnaController.submitMessage);
router.get("/messages/mine", requireAuth(["VECNA", "ADMIN"]), VecnaController.getMyMessages);

// Realtime Powers & Status
router.post("/powers/activate", requireAuth(["VECNA", "ADMIN"]), VecnaController.activatePower);
router.post("/challenge/verify", VecnaController.verifyChallenge);
router.get("/tactical-map", VecnaController.getTacticalMap);
router.post("/sabotage", VecnaController.triggerSabotage);
router.get("/status", VecnaController.getStatus);

// Question Progression & Sequential Access (Issue 3)
router.get("/trials/:trialId/progress", requireAuth(["VECNA", "ADMIN"]), VecnaController.getTrialProgress);
router.get("/trials/:trialId/questions/:questionIdx", requireAuth(["VECNA", "ADMIN"]), VecnaController.getTrialQuestion);
router.post("/trials/:trialId/questions/:questionIdx/submit", requireAuth(["VECNA", "ADMIN"]), VecnaController.submitTrialQuestion);

export default router;
