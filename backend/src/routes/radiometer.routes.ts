import { Router } from "express";
import { RadiometerController } from "../controllers/radiometer.controller";
import { validationRateLimiter } from "../middleware/rateLimiter.middleware";

const router = Router();

router.post("/validate-pin", validationRateLimiter, RadiometerController.validatePin);
router.post("/validate-keypad", validationRateLimiter, RadiometerController.validateKeypad);

export default router;
