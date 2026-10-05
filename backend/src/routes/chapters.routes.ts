import { Router } from "express";
import {
  getChapters,
  getChapterById,
  validateChapterAnswer,
} from "../controllers/chapters.controller";
import { rateLimiter } from "../middleware/rateLimiter";

const router = Router();

// GET /api/chapters - Returns all sanitized chapters (no answers)
router.get("/", getChapters);

// GET /api/chapters/:id - Returns a single sanitized chapter
router.get("/:id", getChapterById);

// POST /api/chapters/validate - Evaluates candidate answers securely on the server
router.post("/validate", rateLimiter(300, 30000), validateChapterAnswer);

export default router;
