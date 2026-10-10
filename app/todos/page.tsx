import { getApiBase } from "@/lib/api";

export default async function Page() {
  let health: any = null;
  let errorMsg: string | null = null;

  try {
    const base = getApiBase();
    const res = await fetch(`${base}/health`, { cache: "no-store" });
    if (res.ok) {
      health = await res.json();
    } else {
      errorMsg = `Server responded with HTTP ${res.status}`;
    }
  } catch (err: any) {
    errorMsg = err.message || "Security backend is offline on port 5000";
  }

  return (
    <div style={{ padding: "40px", fontFamily: "monospace", color: "#fff", background: "#05080b", minHeight: "100vh" }}>
      <h1 style={{ fontSize: "22px", marginBottom: "16px", color: "#36e0c4", textTransform: "uppercase", letterSpacing: "1px" }}>
        ⚡ TiDB Distributed SQL & Mainframe Telemetry
      </h1>
      <p style={{ color: "#9ca3af", marginBottom: "24px", fontSize: "14px" }}>
        Real-time telemetry verification connecting frontend to the TiDB Serverless database & Hawkins Security Vault.
      </p>

      {errorMsg ? (
        <div style={{ padding: "16px", background: "rgba(255, 59, 69, 0.1)", border: "1px solid #ff3b45", color: "#ff8b8f", borderRadius: "4px" }}>
          <strong>BACKEND / DATABASE DISCONNECTED:</strong> {errorMsg}
          <div style={{ marginTop: "8px", fontSize: "12px", color: "#ccc" }}>
            Make sure the backend is running (`cd backend && npm run dev`) and TiDB parameters are configured.
          </div>
        </div>
      ) : (
        <div style={{ padding: "20px", background: "#0b1218", border: "1px solid #1e3a47", borderRadius: "4px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
            <span style={{ display: "inline-block", width: "10px", height: "10px", borderRadius: "50%", background: "#36e0c4", boxShadow: "0 0 8px #36e0c4" }}></span>
            <strong style={{ color: "#36e0c4", fontSize: "16px" }}>MAINFRAME ONLINE · {health?.status}</strong>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: "8px", fontSize: "13px", color: "#cbd5e1" }}>
            <div>Database Engine:</div>
            <div style={{ color: "#36e0c4", fontWeight: "bold" }}>{health?.database || "TIDB_DISTRIBUTED_SQL"}</div>
            <div>Sector Code:</div>
            <div>{health?.sector}</div>
            <div>Version:</div>
            <div>{health?.version}</div>
            <div>Server Timestamp:</div>
            <div>{health?.timestamp}</div>
          </div>
        </div>
      )}
    </div>
  );
}
