import assert from "assert";

const API_BASE = "http://localhost:5000/api";
const FRONTEND_BASE = "http://localhost:3000/api";

let passed = 0;
let failed = 0;

function check(desc, condition) {
  if (condition) {
    console.log(`  [PASS] ${desc}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${desc}`);
    failed++;
  }
}

async function runTests() {
  console.log("==================================================================");
  console.log("HAWKINS PROTOCOL SYSTEM REPAIR VERIFICATION");
  console.log("==================================================================");

  try {
    // -------------------------------------------------------------
    // SETUP: Log in as ADMIN, VECNA, and PLAYER
    // -------------------------------------------------------------
    console.log("\n[SETUP] Authenticating Roles...");
    const adminLoginRes = await fetch(`${API_BASE}/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passkey: "1234567" }),
    });
    const adminData = await adminLoginRes.json();
    const adminToken = adminData?.token;
    check("Admin authentication returns valid JWT token", adminLoginRes.ok && Boolean(adminToken));

    // Clear stale sessions to ensure fresh logins
    if (adminToken) {
      await fetch(`${API_BASE}/admin/teams/reset-all-sessions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${adminToken}` },
      });
    }

    const vecnaLoginRes = await fetch(`${API_BASE}/vecna/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "vecna", password: "CREEL_HOUSE_001" }),
    });
    const vecnaData = await vecnaLoginRes.json();
    const vecnaToken = vecnaData?.token;
    check("Vecna authentication returns valid JWT token", vecnaLoginRes.ok && Boolean(vecnaToken));

    const playerLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamName: "test team 1", leaderName: "apple" }),
    });
    const playerData = await playerLoginRes.json();
    const playerToken = playerData?.token;
    check("Player login (test team 1) returns valid JWT session", playerLoginRes.ok && Boolean(playerToken));

    // -------------------------------------------------------------
    // TEST 1: FAILURE 1 - VECNA CANONICAL 6 STAGES & QUESTION GRADING
    // -------------------------------------------------------------
    console.log("\n[TEST 1] Failure 1: Vecna 6 Canonical Stages & Answer Grading");
    
    // Check Trial 5 (Radio Transmission / Signal) question 0
    const trial5Q0Res = await fetch(`${API_BASE}/vecna/trials/5/questions/0`, {
      headers: { Authorization: `Bearer ${vecnaToken}` },
    });
    const trial5Q0Data = await trial5Q0Res.json();
    check("Trial 5 question 0 is accessible", trial5Q0Res.ok && trial5Q0Data.success);
    check(
      "Trial 5 question 0 is Caesar Cipher radio signal ('UXQ')",
      trial5Q0Data.question?.question.includes("UXQ") && trial5Q0Data.question?.id === "ch5-q1"
    );

    // Submit correct answer "A" ("RUN") to Trial 5 question 0
    const trial5SubmitRes = await fetch(`${API_BASE}/vecna/trials/5/questions/0/submit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${vecnaToken}`,
      },
      body: JSON.stringify({ answer: "A" }),
    });
    const trial5SubmitData = await trial5SubmitRes.json();
    check("Trial 5 question 0 submission returned 200 OK", trial5SubmitRes.ok);
    check(
      "Trial 5 question 0 graded as CORRECT (Option A is 'RUN')",
      trial5SubmitData.isCorrect === true
    );

    // Check Trial 6 (Lab Tasks / Upside Down) question 0
    const trial6Q0Res = await fetch(`${API_BASE}/vecna/trials/6/questions/0`, {
      headers: { Authorization: `Bearer ${vecnaToken}` },
    });
    const trial6Q0Data = await trial6Q0Res.json();
    check("Trial 6 question 0 is accessible", trial6Q0Res.ok && trial6Q0Data.success);
    check(
      "Trial 6 question 0 is Lab Task logical sequence ('2, 6, 12, 20, 30')",
      trial6Q0Data.question?.question.includes("2, 6, 12, 20, 30") && trial6Q0Data.question?.id === "ch6-q1"
    );

    // Submit correct answer "A" ("42") to Trial 6 question 0
    const trial6SubmitRes = await fetch(`${API_BASE}/vecna/trials/6/questions/0/submit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${vecnaToken}`,
      },
      body: JSON.stringify({ answer: "A" }),
    });
    const trial6SubmitData = await trial6SubmitRes.json();
    check("Trial 6 question 0 submission returned 200 OK", trial6SubmitRes.ok);
    check(
      "Trial 6 question 0 graded as CORRECT (Option A is 42)",
      trial6SubmitData.isCorrect === true
    );

    // Check Chapter 1 Question 3 (Salt calculation):
    console.log("\n[TEST 1B] Chapter 1 Question 3 (Salt Calculation):");
    const ch1q3Res = await fetch(`${API_BASE}/vecna/trials/1/questions/2`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const ch1q3Data = await ch1q3Res.json();
    check("Chapter 1 Question 3 is salt calculation question", ch1q3Data.question?.id === "ch1-q3");
    
    // Check options: Option A is 1,500 lb
    const optA = ch1q3Data.question?.options.find((o) => o.id === "A");
    check("Option A is '1,500 lb'", optA?.text === "1,500 lb");

    // Submit sequential questions 0 and 1, then submit question 2 as Option A
    await fetch(`${API_BASE}/vecna/trials/1/questions/0/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${vecnaToken}` },
      body: JSON.stringify({ answer: "B" }),
    });
    await fetch(`${API_BASE}/vecna/trials/1/questions/1/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${vecnaToken}` },
      body: JSON.stringify({ answer: "A" }),
    });
    const ch1q3SubmitRes = await fetch(`${API_BASE}/vecna/trials/1/questions/2/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${vecnaToken}` },
      body: JSON.stringify({ answer: "A" }),
    });
    const ch1q3SubmitData = await ch1q3SubmitRes.json();
    check("Chapter 1 Question 3 submission returned 200 OK", ch1q3SubmitRes.ok);
    check(
      "Chapter 1 Question 3 graded as CORRECT for '1,500 lb' (Option A)",
      ch1q3SubmitData.isCorrect === true
    );

    // -------------------------------------------------------------
    // TEST 2: FAILURE 2 - SEPARATE IDENTITY & STALE ANSWER PERSISTENCE
    // -------------------------------------------------------------
    console.log("\n[TEST 2] Failure 2: Team Identity & Event Scoping");
    
    // Register synthetic Test Team Synthetic-Alpha
    const synthAlphaName = `Synth Alpha ${Date.now()}`;
    const synthAlphaId = `SYNTH-${Date.now()}-A`;
    const regAlphaRes = await fetch(`${API_BASE}/admin/teams`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        teamName: synthAlphaName,
        leaderName: "Leader Alpha",
        teamId: synthAlphaId,
        initialScore: 0,
        role: "PLAYER",
      }),
    });
    const regAlphaData = await regAlphaRes.json();
    check("Admin registered Synth Alpha team", regAlphaRes.ok && regAlphaData.success);

    // Authenticate Synth Alpha to establish valid active session
    const alphaLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamName: synthAlphaName, leaderName: "Leader Alpha" }),
    });
    const alphaLoginData = await alphaLoginRes.json();
    const alphaToken = alphaLoginData?.token;
    check("Synth Alpha player session established", alphaLoginRes.ok && Boolean(alphaToken));

    // Verify Synth Alpha initial score is strictly 0 and has no completed tasks
    const alphaTeam = regAlphaData.team;
    check("Synth Alpha initial score is 0", alphaTeam?.totalScore === 0);
    check("Synth Alpha has no completed tasks initially", (alphaTeam?.completedTasks || []).length === 0);
    check("Synth Alpha has no solved chapters initially", (alphaTeam?.solvedChapters || []).length === 0);

    // -------------------------------------------------------------
    // TEST 3: FAILURE 3 - VECNA POWERS & DISPATCH QUOTA
    // -------------------------------------------------------------
    console.log("\n[TEST 3] Failure 3: Team Dispatch Quota & Vecna Powers");

    // 3A: Quota reset
    const resetQuotaRes = await fetch(`${API_BASE}/vecna/dispatch/reset`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
    });
    const resetQuotaData = await resetQuotaRes.json();
    check("Admin can reset dispatch quota", resetQuotaRes.ok && resetQuotaData.success);
    check("Reset quota remaining is strictly 5", resetQuotaData.remaining === 5);
    check("Reset quota used is strictly 0", resetQuotaData.used === 0);

    // 3B: Dispatch message
    const sendMsgRes = await fetch(`${API_BASE}/vecna/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${vecnaToken}`,
      },
      body: JSON.stringify({
        sourceType: "custom",
        recipientScope: "selected_teams",
        selectedTeamIds: [synthAlphaId],
        bodyText: "I CAN SMELL YOUR FEAR.",
        clientRequestId: `req-${Date.now()}-test`,
      }),
    });
    const sendMsgData = await sendMsgRes.json();
    check("Vecna sent message targeting Synth Alpha", sendMsgRes.ok && sendMsgData.success);

    // Verify quota decremented by exactly 1
    const quotaAfterRes = await fetch(`${API_BASE}/vecna/dispatch/quota`, {
      headers: { Authorization: `Bearer ${vecnaToken}` },
    });
    const quotaAfterData = await quotaAfterRes.json();
    check("Dispatch quota remaining decremented to 4", quotaAfterData.remaining === 4);
    check("Dispatch quota used incremented to 1", quotaAfterData.used === 1);

    // 3C: Credit Vecna squad points to test power activation
    const creditRes = await fetch(`${API_BASE}/admin/teams/VECNA-1/score`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ points: 100, reason: "TEST_CREDIT" }),
    });
    const creditData = await creditRes.json();
    const vecnaScoreBefore = creditData.team?.totalScore || 100;
    console.log(`  Current Vecna Score: ${vecnaScoreBefore} PTS`);

    // Activate LOCK LOCATION on Synth Alpha
    const lockPowerRes = await fetch(`${API_BASE}/vecna/powers/activate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${vecnaToken}`,
      },
      body: JSON.stringify({
        vecnaTeamId: "VECNA-1",
        power: "LOCK",
        targetTeams: [synthAlphaId],
        targetScope: "selected",
        clientRequestId: `power-${Date.now()}-lock`,
      }),
    });
    const lockPowerData = await lockPowerRes.json();
    check("LOCK power activation returned 200 OK", lockPowerRes.ok && lockPowerData.success);
    check("LOCK power cost is strictly 10 PTS for 1 team", lockPowerData.cost === 10);
    check(
      "Vecna score accurately deducted by 10 PTS",
      lockPowerData.newScore === vecnaScoreBefore - 10
    );

    // Verify Lock Location blocks stage advancement with HTTP 403 LOCATION_LOCKED
    const validateLockRes = await fetch(`${API_BASE}/chapters/validate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${alphaToken}`,
      },
      body: JSON.stringify({
        chapterId: 1,
        taskId: "ch1-quiz",
        answer: "A",
        teamId: synthAlphaId,
      }),
    });
    const validateLockData = await validateLockRes.json();
    check("Lock Location blocks stage advancement with HTTP 403", validateLockRes.status === 403);
    check("Error code is LOCATION_LOCKED", validateLockData.error === "LOCATION_LOCKED");
    check("Lockout remainingSeconds is reported", typeof validateLockData.remainingSeconds === "number" && validateLockData.remainingSeconds > 0);

    // 3D: Activate SYSTEM CORRUPTED and verify challenge resolution
    const corruptPowerRes = await fetch(`${API_BASE}/vecna/powers/activate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${vecnaToken}`,
      },
      body: JSON.stringify({
        vecnaTeamId: "VECNA-1",
        power: "CORRUPT",
        targetTeams: [synthAlphaId],
        targetScope: "selected",
        clientRequestId: `power-${Date.now()}-corrupt`,
      }),
    });
    const corruptPowerData = await corruptPowerRes.json();
    check("CORRUPT power activation succeeded", corruptPowerRes.ok && corruptPowerData.success);
    check("CORRUPT power cost is strictly 10 PTS for 1 team", corruptPowerData.cost === 10);

    // Solve all 4 technical challenge questions for Synth Alpha: 42, 8, 443, 2
    const verifyChallengeRes = await fetch(`${API_BASE}/vecna/challenge/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        teamId: synthAlphaId,
        answers: { 1: "42", 2: "8", 3: "443", 4: "2" },
      }),
    });
    const verifyChallengeData = await verifyChallengeRes.json();
    check("System Corrupted 4-question challenge verified", verifyChallengeRes.ok && verifyChallengeData.allCorrect === true);
    check("Challenge reports correctCount === 4", verifyChallengeData.correctCount === 4);

    // -------------------------------------------------------------
    // FINAL TALLY
    // -------------------------------------------------------------
    console.log("\n==================================================================");
    console.log(`TOTAL CHECKS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
    console.log("==================================================================");

    if (failed === 0) {
      console.log("\nALL REPAIRS VERIFIED AUTHORITATIVELY!");
      process.exit(0);
    } else {
      console.error(`\nFAILED ${failed} CHECKS.`);
      process.exit(1);
    }
  } catch (err) {
    console.error("Test execution failed:", err);
    process.exit(1);
  }
}

runTests();
