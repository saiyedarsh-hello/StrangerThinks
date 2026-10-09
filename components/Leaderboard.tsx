"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { subscribe } from "@/lib/realtime";

export interface LeaderboardRow {
  rank: number;
  teamId: string;
  team: string;
  leader: string;
  score: number;
  stage: number;
  status: string;
}

export default function Leaderboard({ highlight }: { highlight?: string }) {
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch("/api/leaderboard");
      const data = await res.json();
      if (data.success && Array.isArray(data.leaderboard)) {
        setRows(data.leaderboard);
      }
    } catch (e) {
      console.warn("Failed to fetch leaderboard:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();

    // Re-fetch on any score update broadcast
    const unsub = subscribe((m) => {
      if (m.type === "SCORE_UPDATE" || (m as any).type === "presence") {
        fetchLeaderboard();
      }
    });

    const interval = setInterval(fetchLeaderboard, 10000); // Poll every 10s as backup
    return () => {
      unsub();
      clearInterval(interval);
    };
  }, []);

  const top = rows.slice(0, 3);
  const order = [top[1], top[0], top[2]].filter(Boolean);
  const heights: Record<number, number> = { 0: 150, 1: 190, 2: 120 };

  return (
    <div>
      {/* Podium for Top 3 */}
      <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-end", gap: 14, marginBottom: 26 }}>
        {order.map((r, i) => {
          const rank = r.rank;
          return (
            <motion.div
              key={r.teamId + r.score}
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.2, type: "spring" }}
              className="panel"
              style={{
                width: "min(180px, 30vw)",
                height: heights[i],
                padding: 12,
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
                borderColor: rank === 1 ? "var(--accent)" : undefined,
              }}
            >
              <div className="title-xl" style={{ fontSize: 44 }}>{rank}</div>
              <div className="term" style={{ fontSize: 18, wordBreak: "break-word" }}>{r.team}</div>
              <div className="term accent">{r.score} PTS</div>
            </motion.div>
          );
        })}
      </div>

      {/* Full Leaderboard Table */}
      <div className="panel">
        <div className="panel-head">
          <span className="dot" /> HAWKINS MAINFRAME LIVE STANDINGS {loading && "(SYNCING...)"}
        </div>
        <div className="panel-body" style={{ padding: 0 }}>
          {rows.length === 0 && !loading && (
            <div style={{ padding: 24, textAlign: "center", color: "var(--dim)" }}>
              NO SQUADS REGISTERED YET
            </div>
          )}
          {rows.map((r, i) => (
            <motion.div
              key={r.teamId + i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.05 }}
              style={{
                display: "grid",
                gridTemplateColumns: "50px 1fr 120px 100px",
                padding: "12px 18px",
                borderBottom: "1px solid var(--line)",
                fontFamily: "var(--font-term)",
                fontSize: 20,
                letterSpacing: ".08em",
                background: highlight && (r.team === highlight || r.teamId === highlight) ? "color-mix(in srgb, var(--accent) 14%, transparent)" : undefined,
                color: highlight && (r.team === highlight || r.teamId === highlight) ? "var(--accent)" : undefined,
              }}
            >
              <span className="dim">{String(r.rank).padStart(2, "0")}</span>
              <div>
                <span>{r.team}</span>
                <span className="dim" style={{ fontSize: 13, marginLeft: 10 }}>({r.leader})</span>
              </div>
              <span className="dim" style={{ textAlign: "center" }}>STAGE {r.stage}/7</span>
              <span style={{ textAlign: "right", color: "var(--accent)" }}>{r.score} PTS</span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
