"use client";
import React from "react";
import { sfx } from "@/lib/audio";

export interface TeamRowData {
  id: string;
  name: string;
  leaderName: string;
  location: string;
  progress: number; // 0 - 100
  status: "Online" | "Stuck" | "Offline";
  score: number;
  timeLeft: number;
  completedTasks: string[];
  powers: string[];
  clues: string[];
}

interface VecnaTeamTableProps {
  teams: TeamRowData[];
  onInspectTeam: (team: TeamRowData) => void;
  selectedTeamId?: string | null;
}

export default function VecnaTeamTable({
  teams,
  onInspectTeam,
  selectedTeamId,
}: VecnaTeamTableProps) {
  const onlineCount = teams.filter((t) => t.status !== "Offline").length;

  return (
    <div
      style={{
        background: "rgba(10, 3, 6, 0.95)",
        border: "1px solid rgba(255, 45, 58, 0.3)",
        borderRadius: "4px",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        height: "100%",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontFamily: "var(--font-title)",
            fontSize: "14px",
            letterSpacing: "0.2em",
            fontWeight: 900,
            color: "#ffffff",
          }}
        >
          <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#ff2d3a", boxShadow: "0 0 8px #ff2d3a" }} />
          ACTIVE TEAMS
        </div>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "11px",
            letterSpacing: "0.1em",
            color: "rgba(255, 200, 200, 0.6)",
          }}
        >
          {onlineCount} / {teams.length} ONLINE
        </div>
      </div>

      {/* Table Container */}
      <div style={{ overflowX: "auto", flex: 1 }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontFamily: "var(--font-mono)",
            fontSize: "12px",
          }}
        >
          <thead>
            <tr
              style={{
                borderBottom: "1px solid rgba(255, 45, 58, 0.2)",
                color: "rgba(255, 180, 180, 0.6)",
                textAlign: "left",
              }}
            >
              <th style={{ padding: "8px 6px", fontWeight: "normal", width: "40px" }}>#</th>
              <th style={{ padding: "8px 6px", fontWeight: "normal" }}>TEAM NAME</th>
              <th style={{ padding: "8px 6px", fontWeight: "normal" }}>LOCATION</th>
              <th style={{ padding: "8px 6px", fontWeight: "normal", width: "120px" }}>PROGRESS</th>
              <th style={{ padding: "8px 6px", fontWeight: "normal", width: "70px" }}>STATUS</th>
              <th style={{ padding: "8px 6px", fontWeight: "normal", width: "50px", textAlign: "center" }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((t) => {
              const isSelected = selectedTeamId === t.id;
              return (
                <tr
                  key={t.id}
                  style={{
                    borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
                    background: isSelected ? "rgba(255, 45, 58, 0.12)" : "transparent",
                    transition: "background 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.background = "rgba(255, 45, 58, 0.06)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.background = "transparent";
                  }}
                >
                  {/* ID */}
                  <td style={{ padding: "10px 6px", color: "rgba(255, 255, 255, 0.5)" }}>{t.id}</td>

                  {/* Team Name */}
                  <td style={{ padding: "10px 6px", color: "#ffffff", fontWeight: "bold" }}>
                    {t.name}
                  </td>

                  {/* Location */}
                  <td style={{ padding: "10px 6px", color: "rgba(255, 220, 220, 0.85)" }}>
                    {t.location}
                  </td>

                  {/* Progress Bar + % */}
                  <td style={{ padding: "10px 6px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div
                        style={{
                          flex: 1,
                          height: "6px",
                          background: "rgba(255, 255, 255, 0.1)",
                          borderRadius: "3px",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${t.progress}%`,
                            height: "100%",
                            background: "#ff2d3a",
                            borderRadius: "3px",
                          }}
                        />
                      </div>
                      <span style={{ color: "rgba(255, 255, 255, 0.8)", fontSize: "11px", minWidth: "30px" }}>
                        {t.progress}%
                      </span>
                    </div>
                  </td>

                  {/* Status Badge */}
                  <td style={{ padding: "10px 6px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11px" }}>
                      <span
                        style={{
                          width: "6px",
                          height: "6px",
                          borderRadius: "50%",
                          background:
                            t.status === "Online"
                              ? "#36e0c4"
                              : t.status === "Stuck"
                              ? "#ff2d3a"
                              : "#6f8f88",
                        }}
                      />
                      <span
                        style={{
                          color:
                            t.status === "Online"
                              ? "#36e0c4"
                              : t.status === "Stuck"
                              ? "#ff4d58"
                              : "#888899",
                        }}
                      >
                        {t.status}
                      </span>
                    </div>
                  </td>

                  {/* Action (Inspect Eye) */}
                  <td style={{ padding: "10px 6px", textAlign: "center" }}>
                    <button
                      onClick={() => {
                        sfx("click");
                        onInspectTeam(t);
                      }}
                      title="Inspect Team Telemetry"
                      style={{
                        background: "none",
                        border: "none",
                        color: "#ff4d58",
                        cursor: "pointer",
                        padding: "4px",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
