import dotenv from "dotenv";

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

export const INITIAL_REGISTERED_TEAMS = [
  { id: "T01", teamName: "Null Pointers", leaderName: "Aarav Sharma" },
  { id: "T02", teamName: "Stack Smashers", leaderName: "Maya Lin" },
  { id: "T03", teamName: "Rift Runners", leaderName: "Lucas Sinclair" },
  { id: "T04", teamName: "Byte Byters", leaderName: "Dustin Henderson" },
  { id: "T05", teamName: "Shadow Walkers", leaderName: "Mike Wheeler" },
  { id: "T06", teamName: "Hellfire Club", leaderName: "Eddie Munson" },
  { id: "T07", teamName: "Hawkins AV Club", leaderName: "Will Byers" },
  { id: "T08", teamName: "Mind Flayers", leaderName: "Max Mayfield" },
];

export const VECNA_CREDENTIAL = {
  teamName: "Vecna",
  leaderName: "Henry Creel",
  role: "VECNA" as const,
};
