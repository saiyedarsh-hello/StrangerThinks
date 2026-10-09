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

async function runQuery(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${SUPABASE_PAT}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return await res.json();
}

async function runMigration() {
  const sql = fs.readFileSync("c:/Users/nilot/OneDrive/Desktop/STRANGERS THING NIL/backend/database/migration_prod.sql", "utf-8");
  
  // Split by statements separated by semicolon at the end of lines
  const statements = sql
    .split(/;\s*$/m)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith("--"));

  console.log(`Executing ${statements.length} statements...`);
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    try {
      await runQuery(stmt);
      console.log(`[${i + 1}/${statements.length}] SUCCESS: ${stmt.substring(0, 45).replace(/\n/g, " ")}...`);
    } catch (err) {
      console.error(`[${i + 1}/${statements.length}] ERROR in: ${stmt.substring(0, 60)}...`);
      console.error(err.message);
    }
  }
  console.log("Migration complete!");
}

runMigration().catch(console.error);
