const path = require('path');
const dotenv = require(path.join(__dirname, '../backend/node_modules/dotenv'));
dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const mysql = require(path.join(__dirname, '../backend/node_modules/mysql2/promise'));
const crypto = require('crypto');

async function updateQ3() {
  const conn = await mysql.createConnection({
    host: process.env.TIDB_HOST,
    port: Number(process.env.TIDB_PORT) || 4000,
    user: process.env.TIDB_USER,
    password: process.env.TIDB_PASSWORD,
    database: process.env.TIDB_DATABASE || 'stranger_thinks',
    ssl: { rejectUnauthorized: false }
  });

  const secret = process.env.ANSWER_HMAC_SECRET || 'HAWKINS_SECRET_HMAC_KEY_1983';

  function computeHmac(ans) {
    return crypto.createHmac('sha256', secret).update(ans.trim().toLowerCase()).digest('hex');
  }

  const hmacA = computeHmac('a');
  const hmacText = computeHmac('1,500 lb');

  console.log('Computed HMAC for "a":', hmacA);
  console.log('Computed HMAC for "1,500 lb":', hmacText);

  // Update question_answer_keys for question_id = 30004 (ch1-q3)
  const [res1] = await conn.query(
    `UPDATE question_answer_keys
     SET accepted_answer_hmac = ?
     WHERE question_id = 30004 AND answer_variant_number = 1`,
    [hmacA]
  );
  console.log('Updated variant 1:', res1.affectedRows);

  const [res2] = await conn.query(
    `UPDATE question_answer_keys
     SET accepted_answer_hmac = ?
     WHERE question_id = 30004 AND answer_variant_number = 2`,
    [hmacText]
  );
  console.log('Updated variant 2:', res2.affectedRows);

  // Verify
  const [verify] = await conn.query('SELECT * FROM question_answer_keys WHERE question_id = 30004');
  console.log('Verified keys for 30004:', verify);

  await conn.end();
}

updateQ3().catch(console.error);
