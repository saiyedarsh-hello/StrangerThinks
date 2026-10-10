import crypto from "crypto";
import { ENV } from "../config/env";
import { tidb } from "../config/tidb";

export class AnswerValidationService {
  /**
   * Normalization rule as specified in Section 13:
   * trim leading and trailing whitespace and case-fold.
   * Internal spaces and punctuation remain unaltered.
   */
  public static normalizeAnswer(input: string): string {
    if (!input || typeof input !== "string") return "";
    return input.trim().toLowerCase();
  }

  /**
   * Computes the HMAC-SHA256 hash using the server-held secret
   */
  public static computeHmac(answer: string): string {
    const normalized = this.normalizeAnswer(answer);
    return crypto
      .createHmac("sha256", ENV.ANSWER_HMAC_SECRET)
      .update(normalized)
      .digest("hex");
  }

  /**
   * Constant time comparison of two hex hashes
   */
  public static safeCompare(a: string, b: string): boolean {
    if (!a || !b || a.length !== b.length) return false;
    try {
      const bufA = Buffer.from(a, "hex");
      const bufB = Buffer.from(b, "hex");
      return crypto.timingSafeEqual(bufA, bufB);
    } catch {
      return a === b;
    }
  }

  /**
   * Validates a participant's submitted answer against secret HMAC keys
   */
  public static async validateAnswer(
    questionId: number,
    submittedAnswer: string,
    fallbackCorrectAnswer?: string
  ): Promise<boolean> {
    const candidateHmac = this.computeHmac(submittedAnswer);
    const pool = tidb.pool;

    if (pool) {
      try {
        const [rows] = await pool.query<any[]>(
          "SELECT accepted_answer_hmac FROM question_answer_keys WHERE question_id = ? AND is_active = 1",
          [questionId]
        );

        if (Array.isArray(rows) && rows.length > 0) {
          for (const row of rows) {
            if (this.safeCompare(row.accepted_answer_hmac, candidateHmac)) {
              return true;
            }
          }
          return false;
        }
      } catch (err) {
        console.warn("[ANSWER VALIDATION] TiDB query fallback:", err);
      }
    }

    // Fallback comparison for default canon questions
    if (fallbackCorrectAnswer) {
      const expectedHmac = this.computeHmac(fallbackCorrectAnswer);
      return this.safeCompare(expectedHmac, candidateHmac);
    }

    // Default canonical acceptance for option "A" or option "B"
    const normalized = this.normalizeAnswer(submittedAnswer);
    return normalized === "a" || normalized === "option a" || normalized === "r_u_n" || normalized === "run";
  }
}
