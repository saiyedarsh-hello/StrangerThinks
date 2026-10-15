import { spawn } from "child_process";
import path from "path";
import http from "http";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const backendDir = path.resolve(rootDir, "backend");

console.log("\x1b[31m%s\x1b[0m", "======================================================");
console.log("\x1b[31m%s\x1b[0m", "★ LAUNCHING HAWKINS PROTOCOL FULLSTACK SYSTEM ★");
console.log("\x1b[36m%s\x1b[0m", "  Backend Port  : 5055 (Express + TiDB + Socket.IO)");
console.log("\x1b[32m%s\x1b[0m", "  Frontend Port : 3000 / Dynamic (Next.js Retro CRT Client)");
console.log("\x1b[31m%s\x1b[0m", "======================================================\n");

function isBackendRunning(port = 5055) {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}/health`, { timeout: 1500 }, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function main() {
  const backendAlreadyOnline = await isBackendRunning(5055);
  let backendProcess = null;

  if (backendAlreadyOnline) {
    console.log("\x1b[32m%s\x1b[0m", "✔ Hawkins Backend is already active on http://localhost:5055");
  } else {
    const serverDist = path.resolve(backendDir, "dist/server.js");
    if (!fs.existsSync(serverDist)) {
      console.log("\x1b[33m%s\x1b[0m", "Building backend server...");
      const { execSync } = await import("child_process");
      execSync("npm run build", { cwd: backendDir, stdio: "inherit" });
    }

    backendProcess = spawn(
      process.execPath,
      ["dist/server.js"],
      {
        cwd: backendDir,
        stdio: "inherit",
        shell: false,
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
  }

  // 2. Spawn Frontend
  const nextBin = path.resolve(rootDir, "node_modules/next/dist/bin/next");
  const frontendProcess = spawn(
    process.execPath,
    [nextBin, "dev"],
    {
      cwd: rootDir,
      stdio: "inherit",
      shell: false,
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
    if (backendProcess) {
      try {
        backendProcess.kill();
      } catch {}
    }
    if (frontendProcess) {
      try {
        frontendProcess.kill();
      } catch {}
    }
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("Fatal startup error:", err);
  process.exit(1);
});
