import { Router } from "express";
import { VecnaController } from "../controllers/vecna.controller";

const router = Router();

// Vecna Sender Authentication
router.post("/auth/login", VecnaController.login);
router.post("/auth/logout", VecnaController.logout);
router.get("/auth/me", VecnaController.getMe);

// Targets & Templates
router.get("/recipients", VecnaController.getRecipients);
router.get("/templates", VecnaController.getTemplates);

// Message Submission & Sender Queue
router.post("/messages", VecnaController.submitMessage);
router.get("/messages/mine", VecnaController.getMyMessages);

export default router;
