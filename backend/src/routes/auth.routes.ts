import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";
import { requireAuth } from "../middleware/auth.middleware";

const router = Router();

router.post("/login", AuthController.login);
router.post("/logout", requireAuth(), AuthController.logout);
router.post("/admin-login", AuthController.adminLogin);
router.get("/me", requireAuth(), AuthController.getMe);

export default router;
