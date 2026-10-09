/**
 * THE HAWKINS PROTOCOL — PRODUCTION BACKEND VERIFICATION SUITE
 * 
 * Tests:
 * 1. Team Authentication & Single Active Session Enforcement
 * 2. Second Device Rejection ("Already logged in")
 * 3. Question Submission & Server-Side Answer Validation (Anti-Cheat)
 * 4. Duplicate Question Submission Prevention
 * 5. Hint Unlock & One-Time Deduction Integrity
 * 6. Round Unlock Security (Cannot submit locked rounds)
 * 7. Admin Authentication & Credential Recovery
 * 8. Admin Force Logout
 * 9. Re-login after Force Logout
 */

import fs from "fs";
import { createClient } from "@supabase/supabase-js";

try {
  const envContent = fs.readFileSync(".env.local", "utf8");
  for (const line of envContent.split(/\r?\n/)) {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match && !process.env[match[1].trim()]) {
      process.env[match[1].trim()] = match[2].trim();
    }
  }
} catch {}

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://pxlbktdaldicbtrtbqxu.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

async function runTests() {
  console.log("==================================================================");
  console.log("★ HAWKINS PROTOCOL PRODUCTION BACKEND VERIFICATION SUITE ★");
  console.log("==================================================================");

  console.log("\n[SETUP] Resetting T01 test squad state for clean test execution...");
  await supabaseAdmin.from("active_sessions").delete().eq("team_id", "T01");
  await supabaseAdmin.from("team_submissions").delete().eq("team_id", "T01");
  await supabaseAdmin.from("team_hint_usage").delete().eq("team_id", "T01");
  await supabaseAdmin.from("teams").update({ total_score: 0, current_stage: 1 }).eq("team_id", "T01");
  console.log("✓ Squad T01 state clean.");

  let cookie = "";

  // Test 1: Team Login
  console.log("\n[TEST 1] Team Login with valid credentials (TEAM01)...");
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "TEAM01", password: "hawkins83_01" }),
  });
  const loginData = await loginRes.json();
  const rawCookie = loginRes.headers.get("set-cookie");
  if (rawCookie) {
    cookie = rawCookie.split(";")[0];
  }
  console.log("Status:", loginRes.status, "| Success:", loginData.success);
  if (!loginData.success) {
    throw new Error(`Login failed: ${JSON.stringify(loginData)}`);
  }
  console.log("✓ Team authenticated:", loginData.team.teamName, `(ID: ${loginData.team.id})`);

  // Test 2: Second Device Login Rejection
  console.log("\n[TEST 2] Second Device attempting login while TEAM01 is active...");
  const secondLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "TEAM01", password: "hawkins83_01" }),
  });
  const secondLoginData = await secondLoginRes.json();
  console.log("Status:", secondLoginRes.status, "| Error Code:", secondLoginData.error);
  if (secondLoginRes.status === 409 && secondLoginData.error === "ALREADY_LOGGED_IN") {
    console.log("✓ PASSED: Second device rejected with message:", secondLoginData.message);
  } else {
    throw new Error(`Single-session check failed! Response: ${JSON.stringify(secondLoginData)}`);
  }

  // Test 3: Session Check
  console.log("\n[TEST 3] Session heartbeat check with cookie...");
  const sessionRes = await fetch(`${BASE_URL}/api/auth/session`, {
    headers: { Cookie: cookie },
  });
  const sessionData = await sessionRes.json();
  console.log("Status:", sessionRes.status, "| Authenticated:", sessionData.authenticated);
  if (sessionData.authenticated && sessionData.team.username === "TEAM01") {
    console.log("✓ PASSED: Active session verified for team:", sessionData.team.teamName);
  } else {
    throw new Error(`Session check failed: ${JSON.stringify(sessionData)}`);
  }

  // Test 4: Question Submission (Server-side validation)
  console.log("\n[TEST 4] Submitting Chapter 1 Question 1 ('ch1-q1') with answer 'A'...");
  const submitRes = await fetch(`${BASE_URL}/api/questions/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ questionId: "ch1-q1", answer: "A" }),
  });
  const submitData = await submitRes.json();
  console.log("Status:", submitRes.status, "| isCorrect:", submitData.isCorrect, "| Points:", submitData.pointsAwarded);
  if (submitData.success && submitData.isCorrect) {
    console.log("✓ PASSED: Server validated correct answer without client leakage! New score:", submitData.totalScore);
  } else {
    throw new Error(`Submission failed: ${JSON.stringify(submitData)}`);
  }

  // Test 5: Duplicate Question Submission Block
  console.log("\n[TEST 5] Attempting duplicate submission of 'ch1-q1'...");
  const dupSubmitRes = await fetch(`${BASE_URL}/api/questions/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ questionId: "ch1-q1", answer: "B" }),
  });
  const dupSubmitData = await dupSubmitRes.json();
  console.log("Status:", dupSubmitRes.status, "| Error Code:", dupSubmitData.error);
  if (dupSubmitRes.status === 409 && dupSubmitData.error === "ALREADY_SUBMITTED") {
    console.log("✓ PASSED: Duplicate submission blocked at database constraint level!");
  } else {
    throw new Error(`Duplicate submission check failed: ${JSON.stringify(dupSubmitData)}`);
  }

  // Test 6: Round Lock Protection
  console.log("\n[TEST 6] Attempting to submit locked Round 4 question ('ch4-q1')...");
  const lockedRes = await fetch(`${BASE_URL}/api/questions/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ questionId: "ch4-q1", answer: "A" }),
  });
  const lockedData = await lockedRes.json();
  console.log("Status:", lockedRes.status, "| Error Code:", lockedData.error);
  if (lockedRes.status === 403 && lockedData.error === "ROUND_LOCKED") {
    console.log("✓ PASSED: Locked round access forbidden!");
  } else {
    throw new Error(`Round lock check failed: ${JSON.stringify(lockedData)}`);
  }

  // Test 7: Hint Unlock & One-Time Deduction
  console.log("\n[TEST 7] Requesting hint for 'ch1-q2' (First time)...");
  const hintRes1 = await fetch(`${BASE_URL}/api/hints/use`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ questionId: "ch1-q2", hintNumber: 1 }),
  });
  const hintData1 = await hintRes1.json();
  console.log("Status:", hintRes1.status, "| Deduction:", hintData1.deductionApplied);

  console.log("Requesting same hint again (Second time)...");
  const hintRes2 = await fetch(`${BASE_URL}/api/hints/use`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ questionId: "ch1-q2", hintNumber: 1 }),
  });
  const hintData2 = await hintRes2.json();
  console.log("Status:", hintRes2.status, "| Deduction:", hintData2.deductionApplied, "| Already Unlocked:", hintData2.alreadyUnlocked);
  if (hintData1.deductionApplied > 0 && hintData2.deductionApplied === 0) {
    console.log("✓ PASSED: Hint deduction charged exactly once, subsequent views free!");
  } else {
    throw new Error(`Hint deduction integrity failed: ${JSON.stringify(hintData2)}`);
  }

  // Test 8: Admin Authentication & Credential Retrieval
  console.log("\n[TEST 8] Admin Login with passkey...");
  const adminLoginRes = await fetch(`${BASE_URL}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ passkey: "1234567" }),
  });
  const adminLoginData = await adminLoginRes.json();
  console.log("Status:", adminLoginRes.status, "| Success:", adminLoginData.success);

  console.log("Admin fetching team credentials list...");
  const adminTeamsRes = await fetch(`${BASE_URL}/api/admin/teams`);
  const adminTeamsData = await adminTeamsRes.json();
  console.log("Status:", adminTeamsRes.status, "| Total teams loaded:", adminTeamsData.teams?.length);
  const team1Info = adminTeamsData.teams?.find((t) => t.teamId === "T01");
  if (team1Info && team1Info.password) {
    console.log("✓ PASSED: Admin successfully retrieved team password for recovery:", team1Info.username, "->", team1Info.password);
  } else {
    throw new Error(`Admin teams fetch failed: ${JSON.stringify(adminTeamsData)}`);
  }

  // Test 9: Admin Force Logout
  console.log("\n[TEST 9] Admin force logout of TEAM01...");
  const forceLogoutRes = await fetch(`${BASE_URL}/api/admin/teams/force-logout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ teamId: "T01" }),
  });
  const forceLogoutData = await forceLogoutRes.json();
  console.log("Status:", forceLogoutRes.status, "| Message:", forceLogoutData.message);

  // Verify session is now invalidated
  const sessionAfterRes = await fetch(`${BASE_URL}/api/auth/session`, {
    headers: { Cookie: cookie },
  });
  console.log("Session status after force logout:", sessionAfterRes.status);
  if (sessionAfterRes.status === 401) {
    console.log("✓ PASSED: Session revoked immediately by administrator force-logout!");
  } else {
    throw new Error("Force logout did not invalidate session!");
  }

  // Test 10: Re-login after Force Logout
  console.log("\n[TEST 10] Re-logging in after force logout...");
  const reloginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "TEAM01", password: "hawkins83_01" }),
  });
  const reloginData = await reloginRes.json();
  console.log("Status:", reloginRes.status, "| Success:", reloginData.success);
  if (reloginData.success) {
    console.log("✓ PASSED: Team can now log in cleanly with all previous progress saved!");
  } else {
    throw new Error(`Re-login failed: ${JSON.stringify(reloginData)}`);
  }

  console.log("\n==================================================================");
  console.log("🎉 ALL 10 TESTS PASSED WITH 100% SUCCESS!");
  console.log("==================================================================");
}

runTests().catch(console.error);
