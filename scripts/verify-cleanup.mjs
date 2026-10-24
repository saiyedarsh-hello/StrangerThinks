#!/usr/bin/env node
/**
 * End-to-end verification for the Hawkins Protocol cleanup.
 * Requires the backend on :5000 and the Next.js server on :3000.
 */

const FRONT = "http://localhost:3000";
const BACK = "http://localhost:5000";
const CLEARANCE = process.env.TEST_CLEARANCE_PASSWORD || "";
const results = [];

function record(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

async function call(url, options = {}) {
  const res = await fetch(url, options);
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}
  return { status: res.status, json, text, headers: res.headers };
}

function auth(token, extra = {}) {
  return { Authorization: `Bearer ${token}`, ...extra };
}

async function main() {
  if (!CLEARANCE) {
    throw new Error("TEST_CLEARANCE_PASSWORD is required to run this verification script.");
  }

  // ── Public route removal ───────────────────────────────────────────────────
  for (const route of ["/admin", "/vecna"]) {
    const res = await call(`${FRONT}${route}`);
    record(`GET ${route} logged out -> 404`, res.status === 404, `status=${res.status}`);
  }

  // ── Admin clearance login ──────────────────────────────────────────────────
  const challenge = await call(`${FRONT}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ teamName: "admin bolte", leaderName: "Bunty Bhai" }),
  });
  record(
    "Admin identity requests clearance password",
    challenge.status === 200 && challenge.json?.requiresPassword === true,
    `status=${challenge.status}`
  );

  const wrongPass = await call(`${FRONT}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ teamName: "admin bolte", leaderName: "Bunty Bhai", password: "wrong-password" }),
  });
  record(
    "Admin wrong password rejected",
    wrongPass.status === 401 && wrongPass.json?.success !== true,
    `status=${wrongPass.status}`
  );

  const adminLogin = await call(`${FRONT}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ teamName: "admin bolte", leaderName: "Bunty Bhai", password: CLEARANCE }),
  });
  const adminToken = adminLogin.json?.token;
  record(
    "Admin temporary clearance accepted server-side",
    adminLogin.status === 200 && adminLogin.json?.success === true && adminLogin.json?.session?.role === "ADMIN" && !!adminToken,
    `role=${adminLogin.json?.session?.role || "none"}`
  );
  record(
    "Admin login response does not expose the clearance password",
    !adminLogin.text.includes(CLEARANCE)
  );

  // ── Vecna login and deleted participant login ──────────────────────────────
  const vecnaLogin = await call(`${FRONT}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ teamName: "Vecna", leaderName: "Henry Creel" }),
  });
  const vecnaToken = vecnaLogin.json?.token;
  record(
    "Vecna organizer login works",
    vecnaLogin.status === 200 && vecnaLogin.json?.session?.role === "VECNA" && !!vecnaToken,
    `role=${vecnaLogin.json?.session?.role || "none"}`
  );

  const deletedTeam = await call(`${FRONT}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ teamName: "Null Pointers", leaderName: "Aarav Sharma" }),
  });
  record(
    "Deleted demo team can no longer log in",
    deletedTeam.status >= 400 && deletedTeam.json?.success !== true,
    `status=${deletedTeam.status}`
  );

  // ── Routes remain 404 for authenticated roles ──────────────────────────────
  for (const route of ["/admin", "/vecna"]) {
    const asAdmin = await call(`${FRONT}${route}`, { headers: auth(adminToken) });
    record(`GET ${route} as Admin -> 404`, asAdmin.status === 404, `status=${asAdmin.status}`);
    const asVecna = await call(`${FRONT}${route}`, { headers: auth(vecnaToken) });
    record(`GET ${route} as Vecna -> 404`, asVecna.status === 404, `status=${asVecna.status}`);
  }

  // ── Demo UI removal ────────────────────────────────────────────────────────
  const landing = await call(`${FRONT}/`);
  record(
    "Landing page no longer renders Demo Team Operations",
    !landing.text.includes("DEMO TEAMS / OPERATORS") && !landing.text.includes("Demo Team Operations")
  );

  // ── Empty state after reset ────────────────────────────────────────────────
  const board = await call(`${FRONT}/api/leaderboard`);
  record(
    "Leaderboard empty after reset",
    board.status === 200 && Array.isArray(board.json?.leaderboard) && board.json.leaderboard.length === 0,
    `entries=${board.json?.leaderboard?.length ?? "n/a"}`
  );

  const adminTeamsEmpty = await call(`${FRONT}/api/admin/teams`, { headers: auth(adminToken) });
  record(
    "Admin team list empty after reset",
    adminTeamsEmpty.status === 200 && Array.isArray(adminTeamsEmpty.json?.teams) && adminTeamsEmpty.json.teams.length === 0,
    `teams=${adminTeamsEmpty.json?.teams?.length ?? "n/a"}`
  );

  const map = await call(`${FRONT}/api/vecna/tactical-map`);
  const stageCount = Array.isArray(map.json?.stages) ? map.json.stages.length : 0;
  const mapTeamCount = Array.isArray(map.json?.stages)
    ? map.json.stages.reduce((sum, s) => sum + (Array.isArray(s.teams) ? s.teams.length : 0), 0)
    : -1;
  record(
    "Tactical map returns 6 stages with zero teams",
    map.status === 200 && stageCount === 6 && mapTeamCount === 0,
    `stages=${stageCount} teams=${mapTeamCount}`
  );

  // ── Authorization boundaries ──────────────────────────────────────────────
  const noAuth = await call(`${FRONT}/api/admin/teams`);
  record("Admin API rejects missing token", noAuth.status === 401, `status=${noAuth.status}`);

  const vecnaOnAdmin = await call(`${FRONT}/api/admin/teams`, { headers: auth(vecnaToken) });
  record("Admin API rejects Vecna token", vecnaOnAdmin.status === 403, `status=${vecnaOnAdmin.status}`);

  const adminAuthorized = await call(`${FRONT}/api/admin/teams`, { headers: auth(adminToken) });
  record("Admin API accepts Admin token", adminAuthorized.status === 200, `status=${adminAuthorized.status}`);

  // ── Manual registration ───────────────────────────────────────────────────
  const hawkins = await call(`${BACK}/api/admin/teams`, {
    method: "POST",
    headers: auth(adminToken, { "Content-Type": "application/json" }),
    body: JSON.stringify({ teamName: "Cleanup Test Hawkins", leaderName: "Test Hawkins Leader", role: "PLAYER" }),
  });
  record(
    "Admin registers a fresh Hawkins team",
    hawkins.status === 200 && hawkins.json?.success === true,
    `status=${hawkins.status}`
  );

  const hawkinsLogin = await call(`${FRONT}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ teamName: "Cleanup Test Hawkins", leaderName: "Test Hawkins Leader" }),
  });
  const playerToken = hawkinsLogin.json?.token;
  const playerTeamId = hawkinsLogin.json?.session?.teamId;
  record(
    "New Hawkins team can log in",
    hawkinsLogin.status === 200 && hawkinsLogin.json?.session?.role === "PLAYER" && !!playerToken,
    `role=${hawkinsLogin.json?.session?.role || "none"}`
  );

  const playerOnAdmin = await call(`${FRONT}/api/admin/teams`, { headers: auth(playerToken) });
  record("Admin API rejects Hawkins token", playerOnAdmin.status === 403, `status=${playerOnAdmin.status}`);

  for (const route of ["/admin", "/vecna"]) {
    const res = await call(`${FRONT}${route}`, { headers: auth(playerToken) });
    record(`GET ${route} as Hawkins -> 404`, res.status === 404, `status=${res.status}`);
  }

  const duplicate = await call(`${BACK}/api/admin/teams`, {
    method: "POST",
    headers: auth(adminToken, { "Content-Type": "application/json" }),
    body: JSON.stringify({ teamName: "Cleanup Test Hawkins", leaderName: "Test Hawkins Leader", role: "PLAYER" }),
  });
  record("Duplicate squad registration rejected", duplicate.status === 409, `status=${duplicate.status}`);

  const vecnaTeam = await call(`${BACK}/api/admin/teams`, {
    method: "POST",
    headers: auth(adminToken, { "Content-Type": "application/json" }),
    body: JSON.stringify({ teamName: "Cleanup Test Vecna", leaderName: "Test Vecna Operator", role: "VECNA" }),
  });
  record(
    "Admin registers a fresh Vecna team",
    vecnaTeam.status === 200 && vecnaTeam.json?.success === true && vecnaTeam.json?.team?.role === "VECNA",
    `status=${vecnaTeam.status}`
  );

  const newVecnaLogin = await call(`${FRONT}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ teamName: "Cleanup Test Vecna", leaderName: "Test Vecna Operator" }),
  });
  record(
    "New Vecna team can log in via the database",
    newVecnaLogin.status === 200 && newVecnaLogin.json?.session?.role === "VECNA",
    `role=${newVecnaLogin.json?.session?.role || "none"}`
  );

  const afterRegistration = await call(`${FRONT}/api/admin/teams`, { headers: auth(adminToken) });
  record(
    "Both manual teams persist in Admin list",
    afterRegistration.status === 200 &&
      Array.isArray(afterRegistration.json?.teams) &&
      afterRegistration.json.teams.length === 2,
    `teams=${afterRegistration.json?.teams?.length ?? "n/a"}`
  );

  // ── Socket presence ───────────────────────────────────────────────────────
  let socket;
  try {
    const { io } = await import("socket.io-client");
    socket = io(BACK, { auth: { token: playerToken }, transports: ["websocket"], reconnection: false });
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("socket timeout")), 5000);
      socket.on("connect", () => {
        clearTimeout(timer);
        resolve();
      });
      socket.on("connect_error", (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });
    await new Promise((r) => setTimeout(r, 400));
    const online = await call(`${FRONT}/api/admin/teams`, { headers: auth(adminToken) });
    const team = online.json?.teams?.find((t) => t.teamId === playerTeamId);
    record("Newly registered team shows online presence", Boolean(team?.isOnline), `team=${playerTeamId} online=${team?.isOnline}`);
  } catch (err) {
    record("Newly registered team shows online presence", false, err.message);
  } finally {
    try {
      socket?.disconnect();
    } catch {}
  }

  // ── Logout and refresh ────────────────────────────────────────────────────
  const logout = await call(`${FRONT}/api/auth/logout`, {
    method: "POST",
    headers: auth(playerToken, { "Content-Type": "application/json" }),
    body: JSON.stringify({ teamId: playerTeamId }),
  });
  const refreshed = await call(`${FRONT}/api/auth/session`, { headers: auth(playerToken) });
  record(
    "Logout invalidates the session on refresh",
    logout.status === 200 && (refreshed.status === 401 || refreshed.json?.authenticated === false),
    `logout=${logout.status} refresh=${refreshed.status}`
  );

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
  if (failed.length) {
    console.log("FAILURES:");
    failed.forEach((f) => console.log(` - ${f.name} ${f.detail}`));
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("VERIFY SCRIPT ERROR:", err);
  process.exit(1);
});
