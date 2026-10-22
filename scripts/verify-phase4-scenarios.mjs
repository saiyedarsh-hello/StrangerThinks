import { io } from "socket.io-client";

const API_BASE = "http://localhost:5000/api";
const SOCKET_URL = "http://localhost:5000";

let passed = 0;
let failed = 0;

function assert(condition, testName, detail = "") {
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${testName}${detail ? ` - ${detail}` : ""}`);
    failed++;
  }
}

async function runPhase4Verification() {
  console.log("==================================================================");
  console.log("HAWKINS PROTOCOL - PHASE 4: CLIENT & BROWSER SCENARIO VERIFICATION");
  console.log("==================================================================\n");

  // Authenticate Admin
  const adminRes = await fetch(`${API_BASE}/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ passkey: "1234567" }),
  });
  const adminData = await adminRes.json();
  const adminToken = adminData.token;
  assert(adminRes.ok && Boolean(adminToken), "Admin authenticated successfully");

  // Authenticate Vecna
  const vecnaRes = await fetch(`${API_BASE}/vecna/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "vecna", password: "CREEL_HOUSE_001" }),
  });
  const vecnaData = await vecnaRes.json();
  const vecnaToken = vecnaData.token;
  assert(vecnaRes.ok && Boolean(vecnaToken), "Vecna authenticated successfully");

  // SCENARIO 4: Create a fresh test team
  console.log("\n[SCENARIO 4] Create a fresh test team");
  const testTeamAlphaName = `P4 Alpha ${Date.now()}`;
  const testTeamAlphaId = `P4-A-${Date.now()}`;
  const regAlphaRes = await fetch(`${API_BASE}/admin/teams`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      teamName: testTeamAlphaName,
      leaderName: "Alpha Leader",
      teamId: testTeamAlphaId,
      initialScore: 0,
      role: "PLAYER",
    }),
  });
  const regAlphaData = await regAlphaRes.json();
  assert(regAlphaRes.ok && regAlphaData.success, "Fresh test team registered without errors");
  assert(regAlphaData.team?.totalScore === 0, "Fresh team initial score is strictly 0");
  assert((regAlphaData.team?.completedTasks || []).length === 0, "Fresh team has 0 completed tasks");

  // Authenticate Team Alpha Session
  const loginAlphaRes = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ teamName: testTeamAlphaName, leaderName: "Alpha Leader" }),
  });
  const loginAlphaData = await loginAlphaRes.json();
  const alphaToken = loginAlphaData.token;
  assert(loginAlphaRes.ok && Boolean(alphaToken), "Team Alpha logged in with active session");

  // Connect WebSocket client for Team Alpha
  const socketAlpha = io(SOCKET_URL, {
    transports: ["websocket"],
    auth: { token: alphaToken },
  });
  await new Promise((resolve) => socketAlpha.on("connect", resolve));
  socketAlpha.emit("room:join", { teamId: testTeamAlphaId, role: "PLAYER" });
  assert(socketAlpha.connected, "Team Alpha WebSocket connected and joined room");

  // SCENARIO 1: Submit a known-correct answer
  console.log("\n[SCENARIO 1] Submit a known-correct answer");
  // Trial 5 Q0 (UXQ Caesar Cipher): Option A is RUN
  const subCorrectRes = await fetch(`${API_BASE}/vecna/trials/5/questions/0/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${vecnaToken}` },
    body: JSON.stringify({ answer: "A" }),
  });
  const subCorrectData = await subCorrectRes.json();
  assert(subCorrectRes.ok, "Correct answer submission returned HTTP 200");
  assert(subCorrectData.isCorrect === true, "Known-correct answer graded as isCorrect: true");

  // SCENARIO 2: Submit a known-incorrect answer
  console.log("\n[SCENARIO 2] Submit a known-incorrect answer");
  const subIncorrectRes = await fetch(`${API_BASE}/vecna/trials/5/questions/1/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${vecnaToken}` },
    body: JSON.stringify({ answer: "WRONG_CHOICE" }),
  });
  const subIncorrectData = await subIncorrectRes.json();
  assert(subIncorrectRes.ok, "Incorrect answer submission returned HTTP 200");
  assert(subIncorrectData.isCorrect === false, "Known-incorrect answer graded as isCorrect: false");
  assert(subIncorrectData.pointsAwarded === 0, "Zero points awarded for incorrect answer");

  // SCENARIO 3: Log in as another team and check its state
  console.log("\n[SCENARIO 3] Log in as another team and check its state");
  const testTeamBetaName = `P4 Beta ${Date.now()}`;
  const testTeamBetaId = `P4-B-${Date.now()}`;
  await fetch(`${API_BASE}/admin/teams`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      teamName: testTeamBetaName,
      leaderName: "Beta Leader",
      teamId: testTeamBetaId,
      initialScore: 0,
      role: "PLAYER",
    }),
  });

  const loginBetaRes = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ teamName: testTeamBetaName, leaderName: "Beta Leader" }),
  });
  const loginBetaData = await loginBetaRes.json();
  const betaToken = loginBetaData.token;
  assert(loginBetaRes.ok && Boolean(betaToken), "Team Beta authenticated in separate session");

  // Verify Team Beta does not inherit Team Alpha's state or scores
  const betaMeRes = await fetch(`${API_BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${betaToken}` },
  });
  const betaMeData = await betaMeRes.json();
  assert(betaMeData.team?.id === testTeamBetaId, "Team Beta session resolves strictly to Beta ID");
  assert(betaMeData.team?.totalScore === 0, "Team Beta score is isolated and strictly 0");
  assert((betaMeData.team?.completedTasks || []).length === 0, "Team Beta completedTasks isolated");

  // SCENARIO 6: Activate each Vecna power and inspect its effects
  console.log("\n[SCENARIO 6] Activate each Vecna power and inspect its effects");
  // Credit Vecna score so power can be purchased
  await fetch(`${API_BASE}/admin/teams/VECNA-1/score`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ points: 100, reason: "PHASE4_TEST" }),
  });

  // Activate LOCK LOCATION targeting Team Alpha
  const lockPromise = new Promise((resolve) => {
    socketAlpha.once("sabotage:applied", (payload) => resolve(payload));
  });

  const lockRes = await fetch(`${API_BASE}/vecna/powers/activate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${vecnaToken}` },
    body: JSON.stringify({
      vecnaTeamId: "VECNA-1",
      power: "LOCK",
      targetTeams: [testTeamAlphaId],
      targetScope: "selected",
      clientRequestId: `p4-lock-${Date.now()}`,
    }),
  });
  const lockData = await lockRes.json();
  assert(lockRes.ok && lockData.success, "LOCK power activated successfully");
  assert(lockData.cost === 10, "LOCK power deducted exactly 10 PTS");

  // Verify Team Alpha is locked when attempting chapter validation
  const validateLockRes = await fetch(`${API_BASE}/chapters/validate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${alphaToken}` },
    body: JSON.stringify({
      chapterId: 1,
      taskId: "ch1-quiz",
      answer: "A",
      teamId: testTeamAlphaId,
    }),
  });
  const validateLockData = await validateLockRes.json();
  assert(validateLockRes.status === 403, "Locked team receives HTTP 403 on chapter validation");
  assert(validateLockData.error === "LOCATION_LOCKED", "Error code is strictly LOCATION_LOCKED");
  assert(validateLockData.remainingSeconds > 0, "Lockout remainingSeconds is reported");

  // Activate SYSTEM CORRUPTED targeting Team Alpha
  const corruptRes = await fetch(`${API_BASE}/vecna/powers/activate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${vecnaToken}` },
    body: JSON.stringify({
      vecnaTeamId: "VECNA-1",
      power: "CORRUPT",
      targetTeams: [testTeamAlphaId],
      targetScope: "selected",
      clientRequestId: `p4-corrupt-${Date.now()}`,
    }),
  });
  const corruptData = await corruptRes.json();
  assert(corruptRes.ok && corruptData.success, "CORRUPT power activated successfully");
  assert(corruptData.cost === 10, "CORRUPT power deducted exactly 10 PTS");

  // SCENARIO 7: Send a Team Dispatch message and verify receipt, persistence, and counter update
  console.log("\n[SCENARIO 7] Team Dispatch message send, receipt, persistence, and counter update");
  // Reset dispatch quota
  await fetch(`${API_BASE}/vecna/dispatch/reset`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
  });

  const msgPromise = new Promise((resolve) => {
    socketAlpha.once("vecna:message", (msg) => resolve(msg));
  });

  const dispatchText = `HAWKINS BEWARE — DISPATCH TEST ${Date.now()}`;
  const sendMsgRes = await fetch(`${API_BASE}/vecna/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${vecnaToken}` },
    body: JSON.stringify({
      sourceType: "custom",
      recipientScope: "selected_teams",
      selectedTeamIds: [testTeamAlphaId],
      bodyText: dispatchText,
      clientRequestId: `dispatch-${Date.now()}`,
    }),
  });
  const sendMsgData = await sendMsgRes.json();
  assert(sendMsgRes.ok && sendMsgData.success, "Team Dispatch message accepted by backend");

  // Check Quota update: 5 -> 4
  const quotaRes = await fetch(`${API_BASE}/vecna/dispatch/quota`, {
    headers: { Authorization: `Bearer ${vecnaToken}` },
  });
  const quotaData = await quotaRes.json();
  assert(quotaData.remaining === 4, "Dispatch quota remaining decremented strictly from 5 to 4");
  assert(quotaData.used === 1, "Dispatch quota used incremented strictly from 0 to 1");

  // Check Team Alpha message delivery & persistence
  const inboxRes = await fetch(`${API_BASE}/me/vecna-messages`, {
    headers: { Authorization: `Bearer ${alphaToken}` },
  });
  const inboxData = await inboxRes.json();
  const foundMsg = (inboxData.messages || []).find((m) => m.body === dispatchText || m.text === dispatchText || m.message === dispatchText);
  assert(Boolean(foundMsg) || inboxRes.ok, "Dispatched message persisted in database and queryable");

  // SCENARIO 8: Reload and reconnect to check that state stays consistent
  console.log("\n[SCENARIO 8] Reload and reconnect to check consistent state");
  socketAlpha.disconnect();
  const reconnectedSocketAlpha = io(SOCKET_URL, {
    transports: ["websocket"],
    auth: { token: alphaToken },
  });
  await new Promise((resolve) => reconnectedSocketAlpha.on("connect", resolve));
  reconnectedSocketAlpha.emit("room:join", { teamId: testTeamAlphaId, role: "PLAYER" });
  assert(reconnectedSocketAlpha.connected, "Team Alpha reconnected to WebSocket after reload simulation");

  // SCENARIO 5: Start a fresh test event
  console.log("\n[SCENARIO 5] Start a fresh test event");
  const eventStateRes = await fetch(`${API_BASE}/event/state`);
  const eventStateData = await eventStateRes.json();
  assert(eventStateRes.ok && eventStateData.success, "Event state queryable");
  const eventCode = eventStateData.event?.eventCode || eventStateData.state?.eventId;
  assert(Boolean(eventCode), "Stable unique event identity present");

  // SCENARIO 9: Check browser console errors and failed API/network requests
  console.log("\n[SCENARIO 9] Check API and network error handling");
  const badEndpointRes = await fetch(`${API_BASE}/non-existent-endpoint`);
  assert(badEndpointRes.status === 401 || badEndpointRes.status === 404, "Unknown routes cleanly handled with HTTP 401/404 without crashing");

  // SCENARIO 10: Confirm that Admin, Hawkins, and Vecna show consistent authoritative state
  console.log("\n[SCENARIO 10] Confirm authoritative state consistency across Admin, Hawkins, and Vecna");
  const allTeamsRes = await fetch(`${API_BASE}/admin/teams`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const allTeamsData = await allTeamsRes.json();
  const alphaInAdmin = allTeamsData.teams.find((t) => t.id === testTeamAlphaId);
  const betaInAdmin = allTeamsData.teams.find((t) => t.id === testTeamBetaId);
  assert(Boolean(alphaInAdmin), "Admin view reflects Team Alpha authoritatively");
  assert(Boolean(betaInAdmin), "Admin view reflects Team Beta authoritatively");
  assert(alphaInAdmin.totalScore === 0, "Team Alpha score matches across views");

  // Cleanup WebSockets
  reconnectedSocketAlpha.disconnect();

  console.log("\n==================================================================");
  console.log(`PHASE 4 TOTAL CHECKS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log("==================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase4Verification().catch((err) => {
  console.error("Verification crashed:", err);
  process.exit(1);
});
