import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), "backend/.env") });
dotenv.config();

export const ENV = {
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 5000,
  CORS_ORIGIN: process.env.CORS_ORIGIN || "*",
  JWT_SECRET: process.env.JWT_SECRET || "HAWKINS_NATIONAL_LAB_SECRET_KEY_1983",

  // TiDB Distributed SQL Configuration
  TIDB_DATABASE_URL: process.env.TIDB_DATABASE_URL || "",
  TIDB_HOST: process.env.TIDB_HOST || "127.0.0.1",
  TIDB_PORT: process.env.TIDB_PORT ? parseInt(process.env.TIDB_PORT, 10) : 4000,
  TIDB_USER: process.env.TIDB_USER || "root",
  TIDB_PASSWORD: process.env.TIDB_PASSWORD || "",
  TIDB_DATABASE: process.env.TIDB_DATABASE || "stranger_thinks",
  TIDB_SSL: process.env.TIDB_SSL === "true" || !!process.env.TIDB_DATABASE_URL?.includes("ssl="),

  TOTAL_GAME_TIME: process.env.TOTAL_GAME_TIME ? parseInt(process.env.TOTAL_GAME_TIME, 10) : 90 * 60, // 90 min (5400s)
  ADMIN_PASSKEY: process.env.ADMIN_PASSKEY || "HAWKINS_CHIEF_1983",
  // Temporary shared clearance password for local development/testing only.
  // Leave unset in production (render.env does not define it).
  TEST_CLEARANCE_PASSWORD: process.env.TEST_CLEARANCE_PASSWORD || "",
  ANSWER_HMAC_SECRET: process.env.ANSWER_HMAC_SECRET || "HAWKINS_SECRET_HMAC_KEY_1983",
  SESSION_TOKEN_PEPPER: process.env.SESSION_TOKEN_PEPPER || "HAWKINS_SESSION_PEPPER_1983",
  ADMIN_SESSION_SECRET: process.env.ADMIN_SESSION_SECRET || "HAWKINS_CHIEF_ADMIN_SECRET_1983",
  WEIGHTS: {
    tech: 0.30,
    puzzle: 0.20,
    speed: 0.15,
    clue: 0.15,
    story: 0.10,
    teamwork: 0.10,
  },
};

// Participant teams are created explicitly through the Admin registration/import
// flow. No demo teams are seeded on startup.

export const VECNA_CREDENTIAL = {
  teamName: "Vecna",
  leaderName: "Henry Creel",
  role: "VECNA" as const,
};
