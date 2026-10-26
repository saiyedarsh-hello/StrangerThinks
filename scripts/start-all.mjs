import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const backendDir = path.resolve(rootDir, "backend");

console.log("\x1b[31m%s\x1b[0m", "======================================================");
console.log("\x1b[31m%s\x1b[0m", "★ LAUNCHING HAWKINS PROTOCOL FULLSTACK SYSTEM ★");
console.log("\x1b[36m%s\x1b[0m", "  Backend Port  : 5000 (Express + TiDB + Socket.IO)");
console.log("\x1b[32m%s\x1b[0m", "  Frontend Port : 3000 (Next.js Retro CRT Client)");
console.log("\x1b[31m%s\x1b[0m", "======================================================\n");

const isWin = process.platform === "win32";
const npmCmd = isWin ? "npm.cmd" : "npm";

// 1. Spawn Backend
const backendProcess = spawn(
  npmCmd,
  ["run", "dev"],
  {
    cwd: backendDir,
    stdio: "inherit",
    shell: isWin,
    env: { ...process.env },
  }
);

backendProcess.on("error", (err) => {
  console.error("\x1b[31m[BACKEND ERROR]\x1b[0m", err);
});

backendProcess.on("exit", (code, signal) => {
  if (code !== null && code !== 0) {
    console.error(`\x1b[31m[BACKEND PROCESS EXITED]\x1b[0m (code: ${code}, signal: ${signal})`);
  }
});

// 2. Spawn Frontend
const frontendProcess = spawn(
  npmCmd,
  ["run", "dev:frontend"],
  {
    cwd: rootDir,
    stdio: "inherit",
    shell: isWin,
    env: { ...process.env },
  }
);

frontendProcess.on("error", (err) => {
  console.error("\x1b[31m[FRONTEND ERROR]\x1b[0m", err);
});

frontendProcess.on("exit", (code, signal) => {
  if (code !== null && code !== 0) {
    console.error(`\x1b[31m[FRONTEND PROCESS EXITED]\x1b[0m (code: ${code}, signal: ${signal})`);
  }
});

// Handle graceful shutdown
const shutdown = () => {
  console.log("\n\x1b[33m[HAWKINS PROTOCOL] Shutting down services...\x1b[0m");
  try {
    backendProcess.kill();
  } catch {}
  try {
    frontendProcess.kill();
  } catch {}
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
