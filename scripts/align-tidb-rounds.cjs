const path = require('path');
const dotenv = require(path.join(__dirname, '../backend/node_modules/dotenv'));
dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const mysql = require(path.join(__dirname, '../backend/node_modules/mysql2/promise'));

async function alignRounds() {
  const conn = await mysql.createConnection({
    host: process.env.TIDB_HOST,
    port: Number(process.env.TIDB_PORT) || 4000,
    user: process.env.TIDB_USER,
    password: process.env.TIDB_PASSWORD,
    database: process.env.TIDB_DATABASE || 'stranger_thinks',
    ssl: { rejectUnauthorized: false }
  });

  console.log("Aligning TiDB rounds safely...");

  // 1. Move demo questions in round 5 to round_id 99 and bump order + 100 to free up round_id 5
  await conn.query(`
    INSERT INTO rounds (round_id, event_id, round_number, round_code, round_name, is_active)
    VALUES (99, 1, 99, 'R99', 'Demo Archive', 0)
    ON DUPLICATE KEY UPDATE is_active = 0
  `).catch(() => {});

  const [demoRes] = await conn.query(
    `UPDATE questions
     SET round_id = 99, question_order = question_order + 100, is_active = 0
     WHERE round_id = 5 AND question_code LIKE '%ch5-q%'`
  );
  console.log(`Archived ${demoRes.affectedRows} demo questions to round_id 99.`);

  // 2. Move former round 6 questions (Signal) to round_id 5 and rename ch6-qX -> ch5-qX
  for (let i = 1; i <= 10; i++) {
    await conn.query(
      `UPDATE questions
       SET round_id = 5, question_code = ?
       WHERE round_id = 6 AND question_code = ?`,
      [`ch5-q${i}`, `ch6-q${i}`]
    );
  }
  console.log("Moved Signal questions to round_id 5 with ch5-q1..q10.");

  // 3. Move former round 7 questions (Lab Tasks) to round_id 6 and rename ch7-qX -> ch6-qX
  for (let i = 1; i <= 10; i++) {
    await conn.query(
      `UPDATE questions
       SET round_id = 6, question_code = ?
       WHERE round_id = 7 AND question_code = ?`,
      [`ch6-q${i}`, `ch7-q${i}`]
    );
  }
  console.log("Moved Lab Tasks questions to round_id 6 with ch6-q1..q10.");

  // 4. Update prompt_content for ch5 and ch6 questions to have updated chapterId
  for (let i = 1; i <= 10; i++) {
    const [q5] = await conn.query("SELECT question_id, prompt_content FROM questions WHERE question_code = ?", [`ch5-q${i}`]);
    if (q5?.[0]) {
      const pc = typeof q5[0].prompt_content === 'string' ? JSON.parse(q5[0].prompt_content) : q5[0].prompt_content;
      pc.chapterId = 5;
      await conn.query("UPDATE questions SET prompt_content = ? WHERE question_id = ?", [JSON.stringify(pc), q5[0].question_id]);
    }

    const [q6] = await conn.query("SELECT question_id, prompt_content FROM questions WHERE question_code = ?", [`ch6-q${i}`]);
    if (q6?.[0]) {
      const pc = typeof q6[0].prompt_content === 'string' ? JSON.parse(q6[0].prompt_content) : q6[0].prompt_content;
      pc.chapterId = 6;
      await conn.query("UPDATE questions SET prompt_content = ? WHERE question_id = ?", [JSON.stringify(pc), q6[0].question_id]);
    }
  }

  // 5. Update round names in rounds table
  await conn.query("UPDATE rounds SET round_name = 'Chapter 5: Radio Transmission & Tower' WHERE round_id = 5");
  await conn.query("UPDATE rounds SET round_name = 'Chapter 6: The Gate Rift & Lab Tasks' WHERE round_id = 6");

  // Verify
  const [roundsSummary] = await conn.query(`
    SELECT round_id, count(*) as count, min(question_code) as min_code, max(question_code) as max_code
    FROM questions
    WHERE is_active = 1 AND question_code LIKE 'ch%-q%'
    GROUP BY round_id
    ORDER BY round_id
  `);
  console.log("Active canonical rounds summary:", roundsSummary);

  await conn.end();
}

alignRounds().catch(console.error);
