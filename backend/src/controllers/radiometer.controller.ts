import { Request, Response } from "express";
import { RADIOMETER_PIN_SECRETS, MASTER_KEYPAD_CODE } from "../data/vault";

/**
 * Validates a single pin task answer on the server.
 */
export const validatePinAnswer = (req: Request, res: Response) => {
  const { pinIndex, answer } = req.body;

  if (typeof pinIndex !== "number" || pinIndex < 0 || pinIndex > 4) {
    return res.status(400).json({
      success: false,
      error: "INVALID_PIN_INDEX",
      message: "pinIndex must be an integer between 0 and 4.",
    });
  }

  const pinSecret = RADIOMETER_PIN_SECRETS[pinIndex];
  if (!pinSecret) {
    return res.status(404).json({
      success: false,
      error: "PIN_NOT_FOUND",
      message: `Pin ${pinIndex} not found in vault.`,
    });
  }

  let isCorrect = false;

  switch (pinSecret.validation.type) {
    case "radio":
    case "series":
    case "debug": {
      const regex = new RegExp(pinSecret.validation.answerRegex || "", "i");
      isCorrect = regex.test(String(answer).trim());
      break;
    }

    case "rearrange": {
      if (Array.isArray(answer)) {
        const joined = answer.join(",");
        const expected = (pinSecret.validation.correctOrder || []).join(",");
        isCorrect = joined === expected;
      }
      break;
    }

    case "connection": {
      if (Array.isArray(answer)) {
        const expectedPairs = pinSecret.validation.pairs || [];
        if (answer.length === expectedPairs.length) {
          isCorrect = expectedPairs.every((expected) =>
            answer.some((actual: any) => actual.from === expected.from && actual.to === expected.to)
          );
        }
      }
      break;
    }
  }

  if (isCorrect) {
    return res.json({
      success: true,
      pinIndex,
      digit: pinSecret.digit,
      label: pinSecret.label,
      pointsAwarded: pinSecret.points,
      message: `PIN ${pinIndex + 1} HARMONIC CALIBRATION SUCCESSFUL`,
    });
  }

  return res.json({
    success: false,
    pinIndex,
    error: "HARMONIC_DISTORTION",
    message: "Pin calibration failed · Frequency misalignment detected.",
  });
};

/**
 * Validates the 5-digit master keypad access code.
 */
export const validateMasterKeypad = (req: Request, res: Response) => {
  const { code } = req.body;
  const normalized = String(code || "").trim().replace(/[-\s]/g, "");

  if (normalized === MASTER_KEYPAD_CODE) {
    return res.json({
      success: true,
      message: "MASTER ACCESS CODE VERIFIED · LAB ACCESS AUTHORIZED",
      pointsAwarded: 100,
    });
  }

  return res.json({
    success: false,
    error: "INVALID_ACCESS_CODE",
    message: "KEYPAD CIPHER REJECTED · ACCESS DENIED",
  });
};
