import { Router } from "express";
import {
  adminLogin,
  requireAdmin,
  getAdminChapters,
  updateAdminChapter,
  deleteAdminChapter,
  resetAdminChapters,
  getAdminLeaderboard,
} from "../controllers/admin.controller";

const router = Router();

// POST /api/admin/login - Authenticate with command passkey
router.post("/login", adminLogin);

// Protected endpoints
router.use(requireAdmin);

// Live tournament leaderboard
router.get("/leaderboard", getAdminLeaderboard);

// Question Vault Configuration (CRUD)
router.get("/chapters", getAdminChapters);
router.put("/chapters/:id", updateAdminChapter);
router.delete("/chapters/:id", deleteAdminChapter);
router.post("/chapters/reset", resetAdminChapters);

export default router;
