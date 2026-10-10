import mysql, { Pool, PoolOptions } from "mysql2/promise";
import { ENV } from "./env";

let pool: Pool | null = null;
let isConnected = false;

function buildPoolOptions(): PoolOptions {
  if (ENV.TIDB_DATABASE_URL) {
    try {
      const url = new URL(ENV.TIDB_DATABASE_URL);
      const isSsl = url.searchParams.get("ssl") !== null || ENV.TIDB_SSL;

      return {
        uri: ENV.TIDB_DATABASE_URL,
        waitForConnections: true,
        connectionLimit: 30,
        maxIdle: 10,
        idleTimeout: 60000,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 10000,
        ssl: isSsl ? { rejectUnauthorized: true } : undefined,
      };
    } catch {
      // Fall through to standard config if URL parsing fails
    }
  }

  return {
    host: ENV.TIDB_HOST,
    port: ENV.TIDB_PORT,
    user: ENV.TIDB_USER,
    password: ENV.TIDB_PASSWORD,
    database: ENV.TIDB_DATABASE,
    waitForConnections: true,
    connectionLimit: 30,
    maxIdle: 10,
    idleTimeout: 60000,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
    ssl: ENV.TIDB_SSL ? { rejectUnauthorized: true } : undefined,
  };
}

export function getTiDBPool(): Pool | null {
  if (!pool) {
    try {
      const options = buildPoolOptions();
      pool = mysql.createPool(options);
    } catch (err) {
      console.warn("[TIDB INIT WARNING] Could not construct TiDB connection pool:", err);
      pool = null;
    }
  }
  return pool;
}

export async function testTiDBConnection(): Promise<{ connected: boolean; version?: string; error?: string }> {
  const p = getTiDBPool();
  if (!p) {
    return { connected: false, error: "Pool uninitialized" };
  }

  try {
    const [rows] = await p.query<any[]>("SELECT VERSION() as version, DATABASE() as db");
    isConnected = true;
    const version = rows?.[0]?.version || "TiDB/MySQL";
    const db = rows?.[0]?.db || ENV.TIDB_DATABASE;
    console.log(`[TIDB] Successfully connected to TiDB cluster (Version: ${version}, DB: ${db})`);
    return { connected: true, version };
  } catch (err: any) {
    isConnected = false;
    const target = ENV.TIDB_DATABASE_URL ? "URL" : `${ENV.TIDB_HOST}:${ENV.TIDB_PORT}`;
    console.warn(`[TIDB NOTICE] TiDB cluster (${target}) is offline or unconfigured (${err.message}). Using resilient local snapshot storage.`);
    return { connected: false, error: err.message };
  }
}

export function isTiDBReady(): boolean {
  return isConnected;
}

export const tidb = {
  get pool() {
    return getTiDBPool();
  },
  testConnection: testTiDBConnection,
  isReady: isTiDBReady,
};
