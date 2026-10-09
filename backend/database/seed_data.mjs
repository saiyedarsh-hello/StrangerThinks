import fs from "fs";

try {
  const envContent = fs.readFileSync(".env.local", "utf8");
  for (const line of envContent.split(/\r?\n/)) {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match && !process.env[match[1].trim()]) {
      process.env[match[1].trim()] = match[2].trim();
    }
  }
} catch {}

const SUPABASE_PAT = process.env.SUPABASE_PAT || "";
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || "pxlbktdaldicbtrtbqxu";

async function query(sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${SUPABASE_PAT}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(JSON.stringify(data));
  }
  return data;
}

async function seed() {
  console.log("1. Seeding rounds...");
  await query(`
    INSERT INTO rounds (round_number, title, stage_key, is_active) VALUES
    (1, 'Hawkins Town Telemetry', 'town', TRUE),
    (2, 'Police Station Dossier', 'police', TRUE),
    (3, 'Byers House Transmission', 'byers', TRUE),
    (4, 'Hawkins Lab Sublevel', 'lab', TRUE),
    (5, 'Creepy Forest Runes', 'forest', TRUE),
    (6, 'Radio Tower Decryption', 'radiotower', TRUE),
    (7, 'Upside Down Gate', 'upsidedown', TRUE)
    ON CONFLICT (round_number) DO UPDATE SET title = EXCLUDED.title, stage_key = EXCLUDED.stage_key;
  `);

  console.log("2. Seeding 10 test teams...");
  const TEAMS = [
    { id: "T01", username: "TEAM01", pass: "hawkins83_01", name: "Null Pointers", leader: "Aarav Sharma" },
    { id: "T02", username: "TEAM02", pass: "hawkins83_02", name: "Stack Smashers", leader: "Maya Lin" },
    { id: "T03", username: "TEAM03", pass: "hawkins83_03", name: "Rift Runners", leader: "Lucas Sinclair" },
    { id: "T04", username: "TEAM04", pass: "hawkins83_04", name: "Byte Byters", leader: "Dustin Henderson" },
    { id: "T05", username: "TEAM05", pass: "hawkins83_05", name: "Shadow Walkers", leader: "Mike Wheeler" },
    { id: "T06", username: "TEAM06", pass: "hawkins83_06", name: "Hellfire Club", leader: "Eddie Munson" },
    { id: "T07", username: "TEAM07", pass: "hawkins83_07", name: "Hawkins AV Club", leader: "Will Byers" },
    { id: "T08", username: "TEAM08", pass: "hawkins83_08", name: "Mind Flayers", leader: "Max Mayfield" },
    { id: "T09", username: "TEAM09", pass: "hawkins83_09", name: "The Investigators", leader: "Nancy Wheeler" },
    { id: "T10", username: "TEAM10", pass: "hawkins83_10", name: "Scoops Troop", leader: "Steve Harrington" },
  ];

  for (const t of TEAMS) {
    await query(`
      INSERT INTO teams (team_id, username, password_plain, team_name, squad_leader, total_score, current_stage, status)
      VALUES ('${t.id}', '${t.username}', '${t.pass}', '${t.name.replace(/'/g, "''")}', '${t.leader.replace(/'/g, "''")}', 0, 1, 'ACTIVE')
      ON CONFLICT (team_id) DO UPDATE SET
        username = EXCLUDED.username,
        password_plain = EXCLUDED.password_plain,
        team_name = EXCLUDED.team_name,
        squad_leader = EXCLUDED.squad_leader;
    `);
  }

  console.log("3. Parsing and seeding question answers from lib/chapterQuestions.ts...");
  const fileContent = fs.readFileSync("c:/Users/nilot/OneDrive/Desktop/STRANGERS THING NIL/lib/chapterQuestions.ts", "utf-8");

  // Regex to match question blocks: id: "...", itemNumber: ..., ..., correctAnswerId: "...", hint: "..."
  const questionRegex = /id:\s*"([^"]+)",[\s\S]*?correctAnswerId:\s*"([^"]+)"(?:,[\s\S]*?hint:\s*"([^"]*)")?/g;
  let match;
  let count = 0;

  while ((match = questionRegex.exec(fileContent)) !== null) {
    const qId = match[1];
    const correctAns = match[2];
    const hintText = match[3] || "";

    // Determine round number from qId (e.g. ch1-q1 -> 1)
    const roundMatch = qId.match(/^ch(\d+)/);
    const roundNum = roundMatch ? parseInt(roundMatch[1], 10) : 1;

    await query(`
      INSERT INTO question_answers (question_id, round_number, correct_answer, accepted_answers, points)
      VALUES ('${qId}', ${roundNum}, '${correctAns}', '["${correctAns}"]'::jsonb, 5)
      ON CONFLICT (question_id) DO UPDATE SET
        round_number = EXCLUDED.round_number,
        correct_answer = EXCLUDED.correct_answer;
    `);

    if (hintText) {
      await query(`
        INSERT INTO question_hints (hint_id, question_id, hint_number, hint_text, deduction)
        VALUES ('${qId}-h1', '${qId}', 1, '${hintText.replace(/'/g, "''")}', 2)
        ON CONFLICT (hint_id) DO UPDATE SET
          hint_text = EXCLUDED.hint_text;
      `);
    }
    count++;
  }
  console.log(`Seeded ${count} questions and hints into database!`);

  console.log("4. Seeding default Vecna story messages...");
  const MESSAGES = [
    { id: "vecna-welcome", title: "THE EYE OF VECNA", content: "You have entered Hawkins. Every step you take is recorded.", type: "ROUND", val: "1" },
    { id: "vecna-midway", title: "PSYCHIC DISTORTION", content: "The deeper you descend into the lab, the less of your mind remains.", type: "ROUND", val: "4" },
    { id: "vecna-gate", title: "THE RIFT IS WIDE", content: "The four gates are opening. Your clocks are ticking.", type: "ROUND", val: "7" },
  ];
  for (const m of MESSAGES) {
    await query(`
      INSERT INTO vecna_messages (message_id, title, content, trigger_type, trigger_value)
      VALUES ('${m.id}', '${m.title}', '${m.content}', '${m.type}', '${m.val}')
      ON CONFLICT (message_id) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content;
    `);
  }

  console.log("Seed complete!");
}

seed().catch(console.error);
