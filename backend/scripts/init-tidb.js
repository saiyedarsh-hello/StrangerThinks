#!/usr/bin/env node
/**
 * TiDB Schema Initializer & Migration Tool
 * Connects to TiDB Serverless / TiDB Cloud / Local TiDB and applies the full schema.
 */

const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function initTiDB() {
  console.log("==================================================");
  console.log("⚡ HAWKINS PROTOCOL — TIDB SCHEMA MIGRATION TOOL");
  console.log("==================================================");

  const databaseUrl = process.env.TIDB_DATABASE_URL;
  const host = process.env.TIDB_HOST || "127.0.0.1";
  const port = parseInt(process.env.TIDB_PORT || "4000", 10);
  const user = process.env.TIDB_USER || "root";
  const password = process.env.TIDB_PASSWORD || "";
  const database = process.env.TIDB_DATABASE || "stranger_thinks";
  const isSsl = process.env.TIDB_SSL === "true" || !!databaseUrl?.includes("ssl=");

  const connectionOptions = databaseUrl
    ? {
        uri: databaseUrl,
        multipleStatements: true,
        ssl: isSsl ? { rejectUnauthorized: true } : undefined,
      }
    : {
        host,
        port,
        user,
        password,
        database,
        multipleStatements: true,
        ssl: isSsl ? { rejectUnauthorized: true } : undefined,
      };

  console.log(`Connecting to TiDB at ${databaseUrl ? "provided TIDB_DATABASE_URL" : `${host}:${port} (Database: ${database})`}...`);

  let connection;
  try {
    connection = await mysql.createConnection(connectionOptions);
    console.log("✅ Connection established successfully!");
  } catch (err) {
    console.error("❌ Failed to connect to TiDB:", err.message);
    console.log("\n[TIP] Check your .env file credentials. For TiDB Cloud Serverless, make sure TIDB_SSL=true.");
    process.exit(1);
  }

  try {
    const schemaPath = path.resolve(__dirname, "../database/tidb_schema.sql");
    const sql = fs.readFileSync(schemaPath, "utf-8");

    console.log(`Executing schema definitions from ${path.basename(schemaPath)}...`);
    await connection.query(sql);

    console.log("✅ All tables, indexes, views, and canon seeds executed successfully!");
    console.log("==================================================");
    console.log("🎉 TIDB DATABASE INITIALIZATION COMPLETE");
    console.log("==================================================");
  } catch (err) {
    console.error("❌ Error executing SQL script:", err.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

initTiDB();
