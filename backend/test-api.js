// Quick verification script
async function runTests() {
  const BASE = "http://localhost:5000/api";

  console.log("--> Testing GET /api/health");
  const healthRes = await fetch(`${BASE}/health`);
  console.log("Health:", await healthRes.json());

  console.log("\n--> Testing GET /api/chapters");
  const chaptersRes = await fetch(`${BASE}/chapters`);
  const chaptersData = await chaptersRes.json();
  console.log("Total sanitized chapters:", chaptersData.chapters?.length);
  const sampleChapter = chaptersData.chapters[0];
  console.log("Sample chapter options (should NOT have isCorrect):", sampleChapter.options);

  console.log("\n--> Testing Chapter 1 with INCORRECT answer 'B'");
  const ch1Wrong = await fetch(`${BASE}/chapters/validate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chapterId: 1, taskId: "ch1-quiz", answer: "B" }),
  });
  console.log("Wrong answer result:", await ch1Wrong.json());

  console.log("\n--> Testing Chapter 1 with CORRECT answer 'A'");
  const ch1Right = await fetch(`${BASE}/chapters/validate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chapterId: 1, taskId: "ch1-quiz", answer: "A" }),
  });
  console.log("Correct answer result:", await ch1Right.json());

  console.log("\n--> Testing Chapter 4 (Coding) with CORRECT answer '68'");
  const ch4Right = await fetch(`${BASE}/chapters/validate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chapterId: 4, taskId: "ch4-lab", answer: "68" }),
  });
  console.log("Chapter 4 result:", await ch4Right.json());

  console.log("\n--> Testing Radiometer Pin 0 with answer '8'");
  const pin0Res = await fetch(`${BASE}/radiometer/validate-pin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pinIndex: 0, answer: "8" }),
  });
  console.log("Pin 0 result:", await pin0Res.json());

  console.log("\n--> Testing Master Keypad with code '83479'");
  const keypadRes = await fetch(`${BASE}/radiometer/validate-keypad`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: "83479" }),
  });
  console.log("Keypad result:", await keypadRes.json());
}

runTests().catch(console.error);
