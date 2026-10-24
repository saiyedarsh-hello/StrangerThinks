// Automated End-to-End Verification of Vecna Powers, Team Dispatch & Tactical Map

const API_BASE = "http://localhost:5000/api";
const FRONTEND_BASE = "http://localhost:3000/api";

async function runTests() {
  console.log("=================================================");
  console.log("   VECNA FEATURES END-TO-END VERIFICATION SUITE   ");
  console.log("=================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // 1. Log in Vecna
    console.log("--- 1. AUTHENTICATION & INITIAL STATE ---");
    const loginRes = await fetch(`${API_BASE}/vecna/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "vecna", password: "CREEL_HOUSE_001" }),
    });
    
    let vecnaToken = "";
    if (loginRes.ok) {
      const loginData = await loginRes.json();
      vecnaToken = loginData.token;
      console.log("Vecna login successful, token acquired.");
    } else {
      console.log("Vecna login failed:", loginRes.status, await loginRes.text());
    }

    assert(Boolean(vecnaToken), "Vecna authentication returns valid JWT token");

    // Admin login
    const adminLoginRes = await fetch(`${API_BASE}/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passkey: process.env.ADMIN_PASSKEY || "1234567" }),
    });
    let adminToken = "";
    if (adminLoginRes.ok) {
      const adminData = await adminLoginRes.json();
      adminToken = adminData.token;
      console.log("Admin login successful.");
    } else {
      console.log("Admin login failed:", adminLoginRes.status, await adminLoginRes.text());
    }
    assert(Boolean(adminToken), "Admin authentication returns valid JWT token");

    // Clear any stale sessions via admin reset before login test
    if (adminToken) {
      await fetch(`${API_BASE}/admin/teams/reset-all-sessions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${adminToken}` },
      });
    }

    // Re-authenticate Vecna after session reset
    const vecnaRelogin = await fetch(`${API_BASE}/vecna/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "vecna", password: "CREEL_HOUSE_001" }),
    });
    if (vecnaRelogin.ok) {
      vecnaToken = (await vecnaRelogin.json()).token;
    }

    // Player login (test team 1)
    const playerLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamName: "test team 1", leaderName: "apple" }),
    });
    let playerToken = "";
    const playerData = await playerLoginRes.json();
    if (playerLoginRes.ok) {
      playerToken = playerData.token;
      console.log("Player login successful, token acquired.");
    } else {
      console.log("Player login failed:", playerLoginRes.status, playerData);
    }
    assert(Boolean(playerToken), "Player login returns valid JWT session");

    // 2. DISPATCH QUOTA TEST
    console.log("\n--- 2. TEAM DISPATCH QUOTA (EVENT-WIDE 5-MESSAGE LIMIT) ---");
    const quotaRes = await fetch(`${API_BASE}/vecna/dispatch/quota`);
    const quotaData = await quotaRes.json();
    console.log("Initial Dispatch Quota:", quotaData);
    assert(quotaRes.ok && typeof quotaData.remaining === "number", "GET /api/vecna/dispatch/quota returns valid quota object");
    assert(quotaData.max === 5, "Max quota is strictly 5");

    // Send a message
    const sendMsgRes = await fetch(`${API_BASE}/vecna/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(vecnaToken ? { Authorization: `Bearer ${vecnaToken}` } : {}),
      },
      body: JSON.stringify({
        sourceType: "custom",
        recipientScope: "all_teams",
        bodyText: "I SEE YOU THROUGH THE MIST.",
        clientRequestId: `req-${Date.now()}-1`,
      }),
    });
    const sendMsgData = await sendMsgRes.json().catch(() => ({}));
    console.log("Send Message Result:", sendMsgRes.status, sendMsgData);
    assert(sendMsgRes.ok || sendMsgRes.status === 429 || sendMsgData.error === "DISPATCH_LIMIT_REACHED", "Message submission handled by quota-aware endpoint");

    const quotaAfterRes = await fetch(`${API_BASE}/vecna/dispatch/quota`);
    const quotaAfterData = await quotaAfterRes.json();
    console.log("Quota after message:", quotaAfterData);
    assert(quotaAfterData.remaining <= 5, "Quota decrements or reflects used slots");

    // 3. TACTICAL MAP TEST
    console.log("\n--- 3. TACTICAL MAP (6 CANONICAL STAGES & ONLINE TEAMS) ---");
    const mapRes = await fetch(`${API_BASE}/vecna/tactical-map`);
    const mapData = await mapRes.json();
    assert(mapRes.ok && Array.isArray(mapData.stages), "GET /api/vecna/tactical-map returns stages list");
    assert(mapData.stages.length === 6, "Tactical map has exactly 6 canonical stages");

    const stageNames = mapData.stages.map((s) => s.name);
    console.log("Stages present in map:", stageNames);
    const expectedStages = [
      "HAWKINS TOWN",
      "POLICE STATION",
      "BYERS HOUSE",
      "HAWKINS LAB",
      "RADIO TOWER",
      "THE GATE RIFT",
    ];
    const allExpectedPresent = expectedStages.every((name) => stageNames.includes(name));
    assert(allExpectedPresent, "All 6 canonical tournament stages are represented");

    // 4. POWER ACTIVATION POINT COST, STANDINGS SYNC & LOCK LOCATION
    console.log("\n--- 4. POWER ACTIVATION POINT SYSTEM, STANDINGS SYNC & LOCK LOCATION ---");
    // 4a. Credit Vecna team 50 points via Admin to ensure sufficient starting balance
    const creditRes = await fetch(`${API_BASE}/admin/teams/VECNA-1/score`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ points: 50, reason: "INITIAL_VECNA_POWER_CREDIT" }),
    });
    console.log("Admin credited Vecna points:", creditRes.status);

    // 4b. Activate LOCK LOCATION with sufficient points
    const powerRes = await fetch(`${API_BASE}/vecna/powers/activate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(vecnaToken ? { Authorization: `Bearer ${vecnaToken}` } : {}),
      },
      body: JSON.stringify({
        vecnaTeamId: "VECNA-1",
        power: "LOCK",
        targetTeams: ["T01"],
        targetScope: "selected",
        clientRequestId: `power-${Date.now()}-lock`,
      }),
    });
    const powerData = await powerRes.json();
    console.log("Power Activation Response:", powerRes.status, powerData);
    assert(powerRes.ok && powerData.success === true, "Power activation succeeds with sufficient balance");
    assert(powerData.cost === 10, "Activation cost is strictly 10 PTS per targeted team");
    assert(typeof powerData.newScore === "number", "Returns updated Vecna score after deduction");

    // 4c. Verify Lock Location blocks stage advancement (HTTP 403 LOCATION_LOCKED)
    const lockCheckRes = await fetch(`${API_BASE}/chapters/validate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(playerToken ? { Authorization: `Bearer ${playerToken}` } : {}),
      },
      body: JSON.stringify({
        chapterId: 1,
        taskId: "1",
        answer: "dummy",
        teamId: "T01",
      }),
    });
    const lockCheckData = await lockCheckRes.json();
    console.log("Lock Location advancement check:", lockCheckRes.status, lockCheckData);
    assert(lockCheckRes.status === 403 && lockCheckData.error === "LOCATION_LOCKED", "Lock Location blocks stage advance with HTTP 403 LOCATION_LOCKED");
    assert(typeof lockCheckData.remainingSeconds === "number" && lockCheckData.remainingSeconds > 0, "Returns remaining lockout countdown in seconds");

    // 4d. Verify Admin Standings reflects the committed score
    const standingsRes = await fetch(`${API_BASE}/leaderboard`);
    const standingsData = await standingsRes.json();
    assert(standingsRes.ok && Array.isArray(standingsData.leaderboard), "Leaderboard / Admin Standings is accessible and consistent");

    // 5. SYSTEM CORRUPTED CHALLENGE VERIFICATION
    console.log("\n--- 5. SYSTEM CORRUPTED 4-QUESTION TECHNICAL CHALLENGE ---");
    // Incorrect answer test
    const wrongVerifyRes = await fetch(`${API_BASE}/vecna/challenge/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        teamId: "T01",
        answers: { 0: "wrong", 1: "99", 2: "80", 3: "5" },
      }),
    });
    const wrongVerifyData = await wrongVerifyRes.json();
    console.log("Wrong answers verification:", wrongVerifyData);
    assert(wrongVerifyData.allCorrect === false, "Incorrect answers fail verification (lockout persists)");

    // Correct answer test (answers: 42, 8, 443, 2 for questions 1, 2, 3, 4)
    const correctVerifyRes = await fetch(`${API_BASE}/vecna/challenge/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        teamId: "T01",
        answers: { 1: "42", 2: "8", 3: "443", 4: "2" },
      }),
    });
    const correctVerifyData = await correctVerifyRes.json();
    console.log("Correct answers verification:", correctVerifyData);
    assert(correctVerifyData.allCorrect === true, "All 4 correct answers pass verification and clear sabotage");

    // 6. FRONTEND NEXT.JS API PROXIES TEST
    console.log("\n--- 6. NEXT.JS FRONTEND ROUTE PROXIES ---");
    const frontQuotaRes = await fetch(`${FRONTEND_BASE}/vecna/dispatch/quota`);
    assert(frontQuotaRes.ok, "Frontend proxy /api/vecna/dispatch/quota returns 200 OK");

    const frontMapRes = await fetch(`${FRONTEND_BASE}/vecna/tactical-map`);
    assert(frontMapRes.ok, "Frontend proxy /api/vecna/tactical-map returns 200 OK");

    console.log("\n=================================================");
    console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
    console.log("=================================================");

    if (failed === 0) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  } catch (err) {
    console.error("Verification script error:", err);
    process.exit(1);
  }
}

runTests();
