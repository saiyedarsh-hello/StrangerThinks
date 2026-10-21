// scripts/verify-phase2.mjs
// Phase 2 Comprehensive End-to-End Verification Suite

const BASE_URL = "http://localhost:5000";

let passed = 0;
let failed = 0;

function assert(condition, testName, detail = "") {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName} — ${detail}`);
    failed++;
  }
}

async function runTests() {
  console.log("========================================================");
  console.log("HAWKINS PROTOCOL — PHASE 2 VERIFICATION TEST SUITE");
  console.log("========================================================\n");

  // ─────────────────────────────────────────────────────────────────────────
  // PART 1: AUTHENTICATION & MULTI-ADMIN ACCOUNTS
  // ─────────────────────────────────────────────────────────────────────────
  console.log("[SECTION 1] Authentication, Roles & Multi-Admin Accounts");

  // 1.1 Hawkins Team Login
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamName: "Null Pointers", leaderName: "Aarav Sharma" }),
    });
    const data = await res.json();
    assert(data.success === true && data.session?.role === "PLAYER", "Hawkins login assigns PLAYER role", JSON.stringify(data));
    assert(data.session?.teamName === "Null Pointers", "Hawkins session bound to exact team");
  } catch (e) {
    assert(false, "Hawkins login assigns PLAYER role", e.message);
  }

  // 1.2 Vecna Team Login
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamName: "Vecna", leaderName: "Henry Creel" }),
    });
    const data = await res.json();
    assert(data.success === true && data.session?.role === "VECNA", "Vecna login assigns VECNA role", JSON.stringify(data));
  } catch (e) {
    assert(false, "Vecna login assigns VECNA role", e.message);
  }

  // 1.3 Client cannot supply or forge role
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamName: "Null Pointers", leaderName: "Aarav Sharma", role: "ADMIN" }),
    });
    const data = await res.json();
    assert(data.session?.role === "PLAYER", "Server rejects client-supplied role tampering");
  } catch (e) {
    assert(false, "Server rejects client-supplied role tampering", e.message);
  }

  // 1.4 Admin Login without password -> requiresPassword challenge
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamName: "admin bolte", leaderName: "Bunty Bhai" }),
    });
    const data = await res.json();
    assert(data.requiresPassword === true, "Admin login without password prompts for password", JSON.stringify(data));
  } catch (e) {
    assert(false, "Admin login without password prompts for password", e.message);
  }

  // 1.5 Admin Login with wrong password -> rejected
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamName: "admin bolte", leaderName: "Bunty Bhai", password: "WrongPassword123!" }),
    });
    const data = await res.json();
    assert(data.success === false && (data.error === "ACCESS_DENIED" || data.error === "INVALID_CREDENTIALS"), "Admin login with wrong password rejected", JSON.stringify(data));
  } catch (e) {
    assert(false, "Admin login with wrong password rejected", e.message);
  }

  // 1.6 All 4 distinct Admin accounts
  const ADMIN_CREDS = [
    { leader: "Bunty Bhai", pass: "Bunty@Hawkins1983", expectedId: "ADMIN-BUNTY" },
    { leader: "Sharma Ji", pass: "Sharma@Hawkins1983", expectedId: "ADMIN-SHARMA" },
    { leader: "Santa Claus", pass: "Santa@Hawkins1983", expectedId: "ADMIN-SANTA" },
    { leader: "Bhindi Khalo", pass: "Bhindi@Hawkins1983", expectedId: "ADMIN-BHINDI" },
  ];

  let adminTokens = {};
  for (const adm of ADMIN_CREDS) {
    try {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamName: "admin bolte", leaderName: adm.leader, password: adm.pass }),
      });
      const data = await res.json();
      assert(
        data.success === true && data.session?.role === "ADMIN" && data.session?.adminId === adm.expectedId,
        `Admin account verified: ${adm.leader} (${adm.expectedId})`,
        JSON.stringify(data)
      );
      if (data.token) {
        adminTokens[adm.expectedId] = data.token;
      }
    } catch (e) {
      assert(false, `Admin account verified: ${adm.leader}`, e.message);
    }
  }

  // 1.7 Protected admin endpoints reject unauthenticated requests
  try {
    const res = await fetch(`${BASE_URL}/api/admin/teams`);
    assert(res.status === 401, "Protected admin route /api/admin/teams rejects unauthenticated requests with 401");
  } catch (e) {
    assert(false, "Protected admin route rejects unauthenticated requests", e.message);
  }

  // 1.8 Protected admin endpoints accept valid admin token
  const buntyToken = adminTokens["ADMIN-BUNTY"];
  try {
    const res = await fetch(`${BASE_URL}/api/admin/teams`, {
      headers: { Authorization: `Bearer ${buntyToken}` },
    });
    assert(res.status === 200, "Protected admin route accepts valid Bunty Bhai admin JWT token");
  } catch (e) {
    assert(false, "Protected admin route accepts valid token", e.message);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PART 2: OBSOLETE TEXT REMOVAL & ROUTE SECURITY
  // ─────────────────────────────────────────────────────────────────────────
  console.log("\n[SECTION 2] Obsolete Text Check & Route Verification");

  try {
    const fs = await import("fs");
    const adminPageContent = fs.readFileSync("app/admin/page.tsx", "utf8");
    const obsoleteFound = adminPageContent.includes("Global event directives broadcast live across all competitor terminals via TiDB");
    assert(!obsoleteFound, "Obsolete string removed from app/admin/page.tsx");
  } catch (e) {
    assert(false, "Obsolete string check", e.message);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PART 3: SQUAD MANAGEMENT & SPREADSHEET IMPORT
  // ─────────────────────────────────────────────────────────────────────────
  console.log("\n[SECTION 3] Squad Management & Spreadsheet Import (CSV / TSV / Excel)");

  // 3.1 Single Squad Registration via Admin Token
  const testSquadName = `Test Squad ${Date.now()}`;
  const testLeaderName = "Test Captain";
  try {
    const res = await fetch(`${BASE_URL}/api/admin/teams`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${buntyToken}`,
      },
      body: JSON.stringify({
        teamName: testSquadName,
        leaderName: testLeaderName,
        initialScore: 20,
      }),
    });
    const data = await res.json();
    assert(data.success === true && data.team?.teamName === testSquadName, "Register Squad via Admin API succeeds", JSON.stringify(data));

    // Verify newly registered squad can log in through the landing page
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamName: testSquadName, leaderName: testLeaderName }),
    });
    const loginData = await loginRes.json();
    assert(loginData.success === true && loginData.session?.teamName === testSquadName, "Newly registered squad can authenticate on landing page");
  } catch (e) {
    assert(false, "Register squad and login verification", e.message);
  }

  // 3.2 Spreadsheet Import Preview Mode (Validation & Column Mappings)
  const ts = Date.now();
  const sampleCsv = `Team Name,Leader Name,Score,Role
Alpha Squad ${ts},Alice Cooper,0,PLAYER
Beta Squad ${ts},Bob Dylan,0,PLAYER
Alpha Squad ${ts},Alice Cooper,0,PLAYER
MissingLeader,,0,PLAYER
,NoTeam,0,PLAYER
`;

  try {
    const previewRes = await fetch(`${BASE_URL}/api/admin/teams/import`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${buntyToken}`,
      },
      body: JSON.stringify({ csv: sampleCsv, preview: true, mode: "skip" }),
    });
    const previewData = await previewRes.json();
    assert(previewData.success === true && previewData.preview === true, "Spreadsheet Import Preview returns success", JSON.stringify(previewData));
    assert(previewData.validCount === 2, `Preview identifies 2 valid squads (got ${previewData.validCount})`);
    assert(previewData.duplicateCount >= 1, `Preview detects duplicate row (got ${previewData.duplicateCount})`);
    assert(previewData.missingCount >= 2, `Preview detects missing required fields (got ${previewData.missingCount})`);
  } catch (e) {
    assert(false, "Spreadsheet Import Preview", e.message);
  }

  // 3.3 Commit Import with Skip Duplicates Mode
  try {
    const commitRes = await fetch(`${BASE_URL}/api/admin/teams/import`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${buntyToken}`,
      },
      body: JSON.stringify({ csv: sampleCsv, preview: false, mode: "skip" }),
    });
    const commitData = await commitRes.json();
    assert(commitData.success === true, "Commit import with mode 'skip' succeeds", JSON.stringify(commitData));
    assert(commitData.createdCount === 2, `Created exactly 2 valid squads (got ${commitData.createdCount})`);
    assert(commitData.skippedCount >= 1, `Skipped duplicate squad (got ${commitData.skippedCount})`);
  } catch (e) {
    assert(false, "Commit import with skip mode", e.message);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PART 4: TEAM PERFORMANCE & DETAILED SCORE HISTORY (6 STAGES)
  // ─────────────────────────────────────────────────────────────────────────
  console.log("\n[SECTION 4] Team Performance History & 6 Canonical Stages");

  try {
    // Test on T01 (Null Pointers)
    const perfRes = await fetch(`${BASE_URL}/api/admin/teams/T01/performance`, {
      headers: { Authorization: `Bearer ${buntyToken}` },
    });
    const perfData = await perfRes.json();
    assert(perfData.success === true && perfData.performance !== undefined, "Performance endpoint returns 200 with data", JSON.stringify(perfData));

    const overview = perfData.performance?.teamOverview;
    assert(overview?.teamId === "T01" && overview?.teamName === "Null Pointers", "Team overview contains correct team identification");
    assert(typeof overview?.overallRank === "number", "Team overview includes overall rank");
    assert(typeof overview?.currentTotalPoints === "number", "Team overview includes total points");
    assert(typeof overview?.currentStage === "string", "Team overview includes current stage name");

    const stages = perfData.performance?.stages;
    assert(Array.isArray(stages) && stages.length === 6, `Returns exactly 6 canonical stages (got ${stages?.length})`);

    const stageNames = stages.map((s) => s.stageName);
    const expectedStages = [
      "HAWKINS TOWN",
      "POLICE STATION",
      "BYERS HOUSE",
      "HAWKINS LAB",
      "RADIO TOWER",
      "THE GATE RIFT",
    ];
    const allExpectedPresent = expectedStages.every((name, idx) => stageNames[idx] === name);
    assert(allExpectedPresent, "All 6 stages strictly match canonical specifications", JSON.stringify(stageNames));

    // Check stage fields
    const s1 = stages[0];
    assert(
      ["Completed", "In Progress", "Locked"].includes(s1.status),
      "Stage status is valid ('Completed' | 'In Progress' | 'Locked')"
    );
    assert(typeof s1.pointsEarned === "number", "Stage has pointsEarned metric");
    assert(typeof s1.pointsLost === "number", "Stage has pointsLost metric");
    assert(typeof s1.netStageScore === "number", "Stage has netStageScore metric");
    assert(s1.startedAt !== undefined && s1.completedAt !== undefined && s1.duration !== undefined, "Stage has timestamp and duration fields");

    // Missing timestamps must be explicitly 'Unavailable' rather than NaN or undefined
    if (s1.status === "Locked") {
      assert(s1.startedAt === "Unavailable" && s1.completedAt === "Unavailable", "Locked stage timestamps are explicitly 'Unavailable'");
    }

    assert(Array.isArray(perfData.performance?.eventWideActions), "Performance includes eventWideActions section");
  } catch (e) {
    assert(false, "Team Performance endpoint", e.message);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PART 5: FAIR & DETERMINISTIC RANKING RULES
  // ─────────────────────────────────────────────────────────────────────────
  console.log("\n[SECTION 5] Fair & Deterministic Ranking Rules");

  try {
    const lbRes = await fetch(`${BASE_URL}/api/admin/leaderboard`, {
      headers: { Authorization: `Bearer ${buntyToken}` },
    });
    const lbData = await lbRes.json();
    assert(lbData.success === true && Array.isArray(lbData.leaderboard), "Leaderboard returns valid array");

    const lb = lbData.leaderboard;

    // 5.1 Admin accounts excluded
    const adminInStandings = lb.some(
      (t) => t.role === "ADMIN" || t.teamName?.toLowerCase() === "admin bolte"
    );
    assert(!adminInStandings, "Admin accounts are strictly excluded from standings/leaderboard");

    // 5.2 Deterministic ordering: Score DESC
    let scoreOrderValid = true;
    for (let i = 0; i < lb.length - 1; i++) {
      if (lb[i].score < lb[i + 1].score) {
        scoreOrderValid = false;
        break;
      }
    }
    assert(scoreOrderValid, "Leaderboard is sorted in descending order of total score");

    // 5.3 Deterministic tie-breaker: Earlier lastScoreAchievedAt / lastSolvedAt timestamp
    let tieBreakerValid = true;
    for (let i = 0; i < lb.length - 1; i++) {
      if (lb[i].score === lb[i + 1].score) {
        const timeA = lb[i].lastScoreAchievedAt || lb[i].lastSolvedAt;
        const timeB = lb[i + 1].lastScoreAchievedAt || lb[i + 1].lastSolvedAt;
        if (timeA && timeB) {
          const tA = new Date(timeA).getTime();
          const tB = new Date(timeB).getTime();
          if (tA > tB) {
            tieBreakerValid = false;
            break;
          }
        }
      }
    }
    assert(tieBreakerValid, "Ties are broken by earlier score achievement timestamp, NEVER stage count");
  } catch (e) {
    assert(false, "Ranking rules test", e.message);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SUMMARY
  // ─────────────────────────────────────────────────────────────────────────
  console.log("\n========================================================");
  console.log(`PHASE 2 VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("========================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
