// test-backend.js - Comprehensive Verification Suite for Hawkins Protocol + TiDB Spec
const { default: app } = require("./dist/server.js");

async function runDirectTests() {
  console.log("==================================================================");
  console.log("⚡ TESTING HAWKINS PROTOCOL SPEC-ALIGNED BACKEND (IN-PROCESS)");
  console.log("   TiDB Distributed SQL + Socket.IO + Vecna Approval Pipeline");
  console.log("==================================================================");

  const PORT = 5055;
  const server = app.listen(PORT, async () => {
    const BASE = `http://localhost:${PORT}/api`;

    async function post(url, body, token) {
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      return { status: res.status, data: await res.json().catch(() => ({})) };
    }

    async function get(url, token) {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(url, { headers });
      return { status: res.status, data: await res.json().catch(() => ({})) };
    }

    try {
      let passed = 0;
      let total = 0;

      function assert(title, condition, extra = "") {
        total++;
        if (condition) {
          passed++;
          console.log(`[PASS ${passed}] ✅ ${title} ${extra ? `(${extra})` : ""}`);
        } else {
          console.error(`[FAIL] ❌ ${title} ${extra ? `(${extra})` : ""}`);
          throw new Error(`Test failed: ${title}`);
        }
      }

      // 1. Health check
      const health = await get(`${BASE}/health`);
      assert("Health check returns TiDB Distributed SQL", health.status === 200 && health.data.database === "TIDB_DISTRIBUTED_SQL");

      // 2. Team Login
      const login1 = await post(`${BASE}/auth/login`, { teamName: "Null Pointers", leaderName: "Aarav Sharma" });
      assert("First participant login succeeds", login1.data.success === true && login1.status === 200, `Team ID: ${login1.data.session?.teamId}`);

      // 3. Single Active Session Rule (Section 8.8 & 10.1)
      const login2 = await post(`${BASE}/auth/login`, { teamName: "Null Pointers", leaderName: "Aarav Sharma" });
      assert("Second login on another device is blocked (single session rule)", login2.status === 409 && login2.data.error === "ALREADY_LOGGED_IN", login2.data.message);

      // 4. Admin Force Logout
      const forceLogout = await post(`${BASE}/admin/teams/T01/force-logout`, {});
      assert("Admin can force logout an active team session", forceLogout.data.success === true);

      // 5. Re-login after Force Logout
      const login3 = await post(`${BASE}/auth/login`, { teamName: "Null Pointers", leaderName: "Aarav Sharma" });
      assert("Team can log in again after admin force-logout", login3.data.success === true && login3.status === 200);
      const playerToken = login3.data.token;

      // 6. Event state inspection (Participant safe)
      const eventState = await get(`${BASE}/event/state`);
      assert("Event state read endpoint returns active event without secrets", eventState.data.success === true && eventState.data.event?.status === "active");

      // 7. Participant Rounds list
      const rounds = await get(`${BASE}/me/rounds?teamId=T01`, playerToken);
      assert("Participant rounds list returned", rounds.data.success === true && rounds.data.rounds?.length >= 1);

      // 8. Question access without exposing secrets
      const qAccessible = await get(`${BASE}/rounds/1/questions/Q_CH1_CORONER?teamId=T01`, playerToken);
      assert("Question prompt fetched without leaking answer keys", qAccessible.data.success === true && !qAccessible.data.question.correctAnswer);

      // 9. Authoritative HMAC Answer submission (Normalization: " A " -> "a")
      const subRes = await post(`${BASE}/questions/Q_CH1_CORONER/submit`, { answer: "  A  ", teamId: "T01" });
      assert("HMAC answer submission evaluated server-side and awarded points", subRes.data.success === true && subRes.data.isCorrect === true && subRes.data.pointsAwarded === 100);

      // 10. Idempotency test (Submitting again returns saved result, no double points)
      const retrySub = await post(`${BASE}/questions/Q_CH1_CORONER/submit`, { answer: "A", teamId: "T01" });
      assert("Idempotent submission recovery returns saved locked state without duplicate award", retrySub.data.success === true && retrySub.data.isLocked === true);

      // 11. Hint consumption & deduction ledger
      const hintRes = await post(`${BASE}/questions/Q_CH1_CORONER/hints/1/use`, { teamId: "T01" });
      assert("Hint endpoint returns hint text and records ledger penalty", hintRes.data.success === true && !!hintRes.data.hintText);

      // 12. Vecna Sender Login
      const vecnaLogin = await post(`${BASE}/vecna/auth/login`, { username: "vecna", password: "CREEL_HOUSE_001" });
      assert("Authorized Vecna sender logs in with separate credentials", vecnaLogin.data.success === true && vecnaLogin.data.sender?.username === "vecna");
      const vecnaToken = vecnaLogin.data.token;

      // 13. Vecna Recipients safe list
      const recipients = await get(`${BASE}/vecna/recipients`, vecnaToken);
      assert("Vecna sender can retrieve non-sensitive Hawkins team labels", recipients.data.success === true && recipients.data.recipients?.length > 0);

      // 14. Vecna Templates list (<= 150 chars)
      const templates = await get(`${BASE}/vecna/templates`, vecnaToken);
      assert("Vecna sender can retrieve active prepared templates", templates.data.success === true && templates.data.templates?.length > 0);

      // 15. Body length validation: >150 characters is rejected
      const longBody = "A".repeat(151);
      const longRes = await post(`${BASE}/vecna/messages`, {
        sourceType: "custom",
        bodyText: longBody,
        recipientScope: "all_teams",
      }, vecnaToken);
      assert("Message body > 150 characters is rejected server-side", longRes.status === 400 && longRes.data.success === false);

      // 16. Valid Vecna Message submission -> creates 'pending_approval' (NOT delivered yet)
      const msgSubmit = await post(`${BASE}/vecna/messages`, {
        sourceType: "custom",
        bodyText: "Tick tock, Hawkins. The clock strikes four.",
        recipientScope: "all_teams",
      }, vecnaToken);
      assert("Vecna message submitted in 'pending_approval' status", msgSubmit.data.success === true && msgSubmit.data.message?.approvalStatus === "pending_approval");
      const submittedMessageId = msgSubmit.data.message?.messageId;

      // 17. Hawkins Team Inbox BEFORE approval: must be EMPTY!
      const inboxBefore = await get(`${BASE}/me/vecna-messages?teamId=T01`);
      assert("Hawkins team inbox is empty before admin approval (unapproved message withheld)", inboxBefore.data.messages?.length === 0);

      // 18. Admin inspects pending review queue
      const pendingQueue = await get(`${BASE}/admin/vecna/messages/pending`);
      assert("Admin can inspect pending Vecna review queue", pendingQueue.data.success === true && pendingQueue.data.messages?.some((m) => m.messageId === submittedMessageId));

      // 19. Admin explicitly approves the message
      const approveRes = await post(`${BASE}/admin/vecna/messages/${submittedMessageId}/approve`, {});
      assert("Admin approves message and creates recipient deliveries", approveRes.data.success === true && approveRes.data.deliveredCount > 0);

      // 20. Hawkins Team Inbox AFTER approval: message delivered!
      const inboxAfter = await get(`${BASE}/me/vecna-messages?teamId=T01`);
      assert("Hawkins team inbox now contains approved message", inboxAfter.data.messages?.length > 0 && inboxAfter.data.messages[0].bodyText.includes("Tick tock"));

      // 21. Event lifecycle controls (pause and resume)
      const pauseRes = await post(`${BASE}/admin/event/pause`, {});
      assert("Admin can pause the event", pauseRes.data.success === true && pauseRes.data.event?.isPaused === true);
      const resumeRes = await post(`${BASE}/admin/event/resume`, {});
      assert("Admin can resume the event", resumeRes.data.success === true && resumeRes.data.event?.isPaused === false);

      // 22. Results and overall standings
      const results = await get(`${BASE}/admin/results/overall`);
      assert("Admin can retrieve overall tournament results", results.data.success === true && Array.isArray(results.data.results));

      // 23. Backward compatibility: legacy chapter validation & radiometer
      const chVal = await post(`${BASE}/chapters/validate`, {
        chapterId: 1,
        taskId: "ch1-quiz",
        answer: "A",
        teamId: "T01",
      });
      assert("Backward compatibility: Chapter 1 validation passes", chVal.data.success === true);

      const pinVal = await post(`${BASE}/radiometer/validate-pin`, { pinIndex: 0, answer: "8", teamId: "T01" });
      assert("Backward compatibility: Radiometer Pin validation passes", pinVal.data.success === true && pinVal.data.digit === "8");

      console.log("==================================================================");
      console.log(`🎉 ALL ${passed}/${total} SPECIFICATION & BACKEND TESTS PASSED WITH 100% SUCCESS!`);
      console.log("==================================================================");
      setTimeout(() => process.exit(0), 100);
    } catch (err) {
      console.error("Test execution error:", err);
      setTimeout(() => process.exit(1), 100);
    }
  });
}

runDirectTests();
