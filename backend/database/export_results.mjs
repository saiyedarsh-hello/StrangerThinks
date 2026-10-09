/**
 * THE HAWKINS PROTOCOL — DISASTER RECOVERY & EVENT RESULTS EXPORTER
 * 
 * Exports complete event snapshot from Supabase PostgreSQL:
 * - Teams and Scores
 * - Submissions and Timestamps
 * - Hint Usage
 * - Event Lifecycle State
 * Outputs: `hawkins_event_backup_[TIMESTAMP].json` and `final_leaderboard_[TIMESTAMP].csv`
 */

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
  return await res.json();
}

async function exportData() {
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  console.log(`Starting export at ${ts}...`);

  const teams = await query("SELECT * FROM teams ORDER BY total_score DESC;");
  const submissions = await query("SELECT * FROM team_submissions ORDER BY submitted_at ASC;");
  const hints = await query("SELECT * FROM team_hint_usage ORDER BY used_at ASC;");
  const eventState = await query("SELECT * FROM event_state;");
  const activeSessions = await query("SELECT * FROM active_sessions;");

  const snapshot = {
    exportedAt: new Date().toISOString(),
    eventState,
    teamsCount: teams.length,
    teams,
    submissionsCount: submissions.length,
    submissions,
    hintsUsedCount: hints.length,
    hints,
    activeSessions,
  };

  const jsonFilename = `c:/Users/nilot/OneDrive/Desktop/STRANGERS THING NIL/backend/database/hawkins_backup_${ts}.json`;
  fs.writeFileSync(jsonFilename, JSON.stringify(snapshot, null, 2), "utf-8");
  console.log(`✓ Database JSON snapshot saved to: ${jsonFilename}`);

  // CSV Leaderboard export
  const csvRows = [
    "Rank,Team ID,Username,Password,Team Name,Squad Leader,Total Score,Current Stage,Status"
  ];
  teams.forEach((t, idx) => {
    csvRows.push(
      `${idx + 1},"${t.team_id}","${t.username}","${t.password_plain}","${t.team_name}","${t.squad_leader}",${t.total_score},${t.current_stage},"${t.status}"`
    );
  });

  const csvFilename = `c:/Users/nilot/OneDrive/Desktop/STRANGERS THING NIL/backend/database/leaderboard_${ts}.csv`;
  fs.writeFileSync(csvFilename, csvRows.join("\n"), "utf-8");
  console.log(`✓ CSV Leaderboard exported to: ${csvFilename}`);
}

exportData().catch(console.error);
