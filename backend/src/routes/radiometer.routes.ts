import { Router } from "express";
import {
  validatePinAnswer,
  validateMasterKeypad,
} from "../controllers/radiometer.controller";
import { rateLimiter } from "../middleware/rateLimiter";

const router = Router();

// POST /api/radiometer/validate-pin - Validates pin calibration on the server
router.post("/validate-pin", rateLimiter(300, 30000), validatePinAnswer);

// POST /api/radiometer/validate-keypad - Validates 5-digit master code on the server
router.post("/validate-keypad", rateLimiter(300, 30000), validateMasterKeypad);

export default router;
