import { Router } from "express";
import { VecnaController } from "../controllers/vecna.controller";
import { requireAuth, extractAuth } from "../middleware/auth.middleware";
import { loginRateLimiter } from "../middleware/rateLimiter.middleware";

const router = Router();

// Vecna Sender Authentication
router.post("/auth/login", loginRateLimiter, VecnaController.login);
router.post("/auth/logout", requireAuth(["VECNA", "ADMIN"]), VecnaController.logout);
router.get("/auth/me", requireAuth(["VECNA", "ADMIN"]), VecnaController.getMe);

// Targets & Templates (Public / Authenticated)
router.get("/recipients", VecnaController.getRecipients);
router.get("/templates", VecnaController.getTemplates);

// Message Submission & Sender Queue (Requires VECNA or ADMIN role)
router.post("/messages", requireAuth(["VECNA", "ADMIN", "PLAYER"]), VecnaController.submitMessage);
router.get("/messages/mine", requireAuth(["VECNA", "ADMIN", "PLAYER"]), VecnaController.getMyMessages);

// Realtime Powers & Status
router.post("/sabotage", VecnaController.triggerSabotage);
router.get("/status", VecnaController.getStatus);

// Question Progression, Intel Clues & Submissions (Universal access for VECNA, ADMIN, PLAYER)
router.get("/trials/:trialId/progress", extractAuth(), VecnaController.getTrialProgress);
router.get("/trials/:trialId/questions/:questionIdx", extractAuth(), VecnaController.getTrialQuestion);
router.post("/trials/:trialId/questions/:questionIdx/submit", extractAuth(), VecnaController.submitTrialQuestion);
router.post("/trials/:trialId/questions/:questionIdx/clue", extractAuth(), VecnaController.unlockClue);
router.post("/trials/:trialId/submit", extractAuth(), VecnaController.submitTrialChapter);

export default router;
