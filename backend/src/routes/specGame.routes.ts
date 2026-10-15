import { Router } from "express";
import { SpecGameController } from "../controllers/specGame.controller";
import { requireAuth } from "../middleware/auth.middleware";

const router = Router();

// Event status relevant to participants (public)
router.get("/event/state", SpecGameController.getEventState);

// All participant gameplay endpoints require PLAYER, ADMIN, or VECNA role
router.use(requireAuth(["PLAYER", "ADMIN", "VECNA"]));

// Participant Progress, Rounds & Question Navigation
router.get("/me/progress", SpecGameController.getMyProgress);
router.get("/me/rounds", SpecGameController.getMyRounds);
router.get("/rounds/:roundId/questions/:questionCode", SpecGameController.getQuestion);

// Authoritative Submissions & Hints
router.post("/questions/:questionCode/submit", SpecGameController.submitAnswer);
router.post("/questions/:questionCode/hints/:hintId/use", SpecGameController.useHint);
router.get("/me/submissions", SpecGameController.getMySubmissions);

// Team Inbox for Approved Vecna Deliveries
router.get("/me/vecna-messages", SpecGameController.getMyVecnaMessages);
router.post("/me/vecna-messages/:deliveryId/read", SpecGameController.markVecnaMessageRead);

export default router;
