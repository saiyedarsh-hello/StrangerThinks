import { Router } from "express";
import { SpecGameController } from "../controllers/specGame.controller";

const router = Router();

// Event status relevant to participants
router.get("/event/state", SpecGameController.getEventState);

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
