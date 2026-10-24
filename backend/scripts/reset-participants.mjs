#!/usr/bin/env node
/**
 * Participant reset for the Hawkins Protocol testing environment.
 *
 * Deletes Hawkins (PLAYER) and Vecna (VECNA) participant teams and their
 * dependent runtime state, while preserving:
 *   - admin_users and their authentication configuration
 *   - schema, rounds, questions, answer keys, hints, chapters
 *   - events and event history/audit records
 *   - Vecna sender/template configuration
 *
 * A JSON backup of every affected row is written before deleting anything.
 * Re-running the script is safe and does not touch admin users.
 *
 * Usage: node scripts/reset-participants.mjs --confirm
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import mysql from "mysql2/promise";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.resolve(__dirname, "..");

dotenv.config({ path: path.join(backendDir, ".env") });

const CONFIRMED = process.argv.includes("--confirm");
const DATA_DIR = path.join(backendDir, "data");
const STATE_FILE = path.join(DATA_DIR, "db-state.json");
const BACKUP_DIR = path.join(DATA_DIR, "backups");

function connectionOptions() {
  return {
    host: process.env.TIDB_HOST || "127.0.0.1",
    port: parseInt(process.env.TIDB_PORT || "4000", 10),
    user: process.env.TIDB_USER || "root",
    password: process.env.TIDB_PASSWORD || "",
    database: process.env.TIDB_DATABASE || "stranger_thinks",
    ssl: process.env.TIDB_SSL === "true" ? { rejectUnauthorized: true } : undefined,
  };
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

async function main() {
  if (!CONFIRMED) {
    console.error("Refusing to reset without --confirm.");
    process.exit(1);
  }

  const opts = connectionOptions();
  console.log(`Target TiDB: ${opts.host}:${opts.port} / ${opts.database} (ssl=${Boolean(opts.ssl)})`);

  const conn = await mysql.createConnection(opts);

  try {
    const [participantRows] = await conn.query(
      "SELECT team_id, team_name, squad_leader, role FROM teams WHERE role IN ('PLAYER','VECNA') AND team_id NOT LIKE 'ADMIN%' ORDER BY team_id"
    );
    const ids = participantRows.map((r) => r.team_id);

    console.log(`Participant teams found: ${ids.length}`);
    if (ids.length) console.log(ids.join(", "));

    const [adminRows] = await conn.query("SELECT admin_id, username, display_name FROM admin_users ORDER BY admin_id");
    console.log(`Admin accounts preserved: ${adminRows.length}`);

    // ── Backup ────────────────────────────────────────────────────────────────
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    const stamp = timestamp();
    const backupFile = path.join(BACKUP_DIR, `participant-reset-${stamp}.json`);

    const backup = {
      meta: {
        createdAt: new Date().toISOString(),
        host: opts.host,
        port: opts.port,
        database: opts.database,
        participantIds: ids,
        participantCount: ids.length,
        adminCount: adminRows.length,
      },
      teams: participantRows,
      adminUsers: adminRows,
      dependentRows: {},
      activeSabotages: [],
      vecnaSenders: [],
      events: [],
    };

    const [tableRows] = await conn.query("SHOW TABLES");
    const tableKey = Object.keys(tableRows[0] || {})[0];
    const tables = tableRows.map((r) => r[tableKey]).filter(Boolean);

    const [teamColumns] = await conn.query(
      "SELECT TABLE_NAME, COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND COLUMN_NAME IN ('team_id','target_team_id')",
      [opts.database]
    );
    const dependentTables = teamColumns
      .filter((c) => c.TABLE_NAME !== "teams")
      .map((c) => ({ table: c.TABLE_NAME, column: c.COLUMN_NAME }));

    if (ids.length) {
      const placeholders = ids.map(() => "?").join(",");
      for (const { table, column } of dependentTables) {
        if (!tables.includes(table)) continue;
        const [rows] = await conn.query(`SELECT * FROM \`${table}\` WHERE \`${column}\` IN (${placeholders})`, ids);
        if (rows.length) backup.dependentRows[table] = rows;
      }
    }

    const [sabotages] = await conn.query("SELECT * FROM active_sabotages").catch(() => [[]]);
    backup.activeSabotages = sabotages || [];
    const [senders] = await conn.query("SELECT * FROM vecna_senders").catch(() => [[]]);
    backup.vecnaSenders = senders || [];
    const [events] = await conn.query("SELECT * FROM events").catch(() => [[]]);
    backup.events = events || [];

    fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2), "utf8");
    console.log(`Backup written: ${backupFile}`);

    const stateBackup = path.join(BACKUP_DIR, `db-state-${stamp}.json`);
    if (fs.existsSync(STATE_FILE)) {
      fs.copyFileSync(STATE_FILE, stateBackup);
      console.log(`Local state backup: ${stateBackup}`);
    }

    // ── Destructive reset ─────────────────────────────────────────────────────
    await conn.beginTransaction();
    try {
      if (ids.length) {
        const placeholders = ids.map(() => "?").join(",");
        for (const { table, column } of dependentTables) {
          if (!tables.includes(table)) continue;
          await conn.query(`DELETE FROM \`${table}\` WHERE \`${column}\` IN (${placeholders})`, ids);
        }
        await conn.query(`DELETE FROM teams WHERE team_id IN (${placeholders})`, ids);
      }

      // Active effects are event-wide and must not carry into a fresh test run.
      await conn.query("DELETE FROM active_sabotages");
      await conn.commit();
      console.log("TiDB participant reset committed.");
    } catch (err) {
      await conn.rollback();
      throw err;
    }

    // ── Local JSON snapshot ───────────────────────────────────────────────────
    if (fs.existsSync(STATE_FILE)) {
      const state = readJson(STATE_FILE, {});
      const teams = state.teams && typeof state.teams === "object" ? state.teams : {};
      const preservedTeams = Object.fromEntries(
        Object.entries(teams).filter(([, t]) => t && t.role === "ADMIN")
      );
      const nextState = {
        ...state,
        teams: preservedTeams,
        activeSabotages: {},
        vecnaProgress: {},
        // eventHistory is intentionally preserved as historical archive.
      };
      fs.writeFileSync(STATE_FILE, JSON.stringify(nextState, null, 2), "utf8");
      console.log("Local db-state.json participant records cleared (event history preserved).");
    }

    // ── Verification ─────────────────────────────────────────────────────────
    const [roleCounts] = await conn.query("SELECT role, COUNT(*) AS n FROM teams GROUP BY role");
    const [adminCount] = await conn.query("SELECT COUNT(*) AS n FROM admin_users");
    const [questionCount] = await conn.query("SELECT COUNT(*) AS n FROM questions");
    const [chapterCount] = await conn.query("SELECT COUNT(*) AS n FROM chapters");
    const [roundCount] = await conn.query("SELECT COUNT(*) AS n FROM rounds");
    const [sessionCount] = await conn.query("SELECT COUNT(*) AS n FROM team_active_sessions");
    const [sabotageCount] = await conn.query("SELECT COUNT(*) AS n FROM active_sabotages");
    const [eventRows] = await conn.query("SELECT event_id, status, login_open, submissions_open, started_at FROM events");

    const participantCount = roleCounts
      .filter((r) => r.role === "PLAYER" || r.role === "VECNA")
      .reduce((sum, r) => sum + Number(r.n), 0);

    console.log("\n=== POST-RESET VERIFICATION ===");
    console.log("Participant teams:", participantCount);
    console.log("Role counts:", JSON.stringify(roleCounts));
    console.log("Admin accounts:", adminCount[0].n);
    console.log("Questions:", questionCount[0].n, "Chapters:", chapterCount[0].n, "Rounds:", roundCount[0].n);
    console.log("Active sessions:", sessionCount[0].n, "Active sabotages:", sabotageCount[0].n);
    console.log("Event:", JSON.stringify(eventRows));

    if (participantCount !== 0) {
      console.error("RESET INCOMPLETE: participant teams remain.");
      process.exitCode = 1;
    }
    if (Number(adminCount[0].n) < 1) {
      console.error("RESET ERROR: admin accounts were not preserved.");
      process.exitCode = 1;
    }
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("RESET FAILED:", err.code || err.message);
  process.exit(1);
});
