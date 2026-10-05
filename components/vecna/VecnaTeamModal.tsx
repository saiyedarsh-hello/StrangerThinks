"use client";
import React from "react";
import { motion } from "framer-motion";
import { sfx } from "@/lib/audio";
import { TeamRowData } from "./VecnaTeamTable";
import { mmss } from "@/lib/results";

interface VecnaTeamModalProps {
  team: TeamRowData | null;
  onClose: () => void;
  onAward: (teamId: string, pts: number) => void;
  onDirectSabotage: (teamName: string, kind: string) => void;
}

export default function VecnaTeamModal({
  team,
  onClose,
  onAward,
  onDirectSabotage,
}: VecnaTeamModalProps) {
  if (!team) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0, 0, 0, 0.85)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        padding: "20px",
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.2 }}
        style={{
          width: "min(620px, 95vw)",
          background: "rgba(12, 4, 7, 0.98)",
          border: "1.5px solid rgba(255, 45, 58, 0.5)",
          boxShadow: "0 25px 60px rgba(0, 0, 0, 0.95), 0 0 30px rgba(255, 45, 58, 0.2)",
          borderRadius: "4px",
          padding: "28px",
          position: "relative",
          display: "flex",
          flexDirection: "column",
          gap: "18px",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "#ff2d3a", letterSpacing: "0.2em" }}>
              TEAM TELEMETRY MONITOR · {team.id}
            </div>
            <h2 style={{ fontFamily: "var(--font-title)", fontSize: "24px", color: "#ffffff", margin: "4px 0 0 0" }}>
              {team.name}
            </h2>
            <div style={{ fontSize: "12px", fontFamily: "var(--font-mono)", color: "rgba(255, 255, 255, 0.5)" }}>
              Leader: {team.leaderName || "Unknown"} · Status: {team.status.toUpperCase()}
            </div>
          </div>
          <button
            onClick={() => {
              sfx("click");
              onClose();
            }}
            style={{
              background: "none",
              border: "none",
              color: "rgba(255, 255, 255, 0.6)",
              fontSize: "20px",
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        {/* Key Metrics Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "10px",
            background: "rgba(0, 0, 0, 0.5)",
            padding: "12px",
            borderRadius: "4px",
            border: "1px solid rgba(255, 45, 58, 0.2)",
            textAlign: "center",
          }}
        >
          <div>
            <div style={{ fontSize: "10px", fontFamily: "var(--font-mono)", color: "rgba(255, 180, 180, 0.6)" }}>
              LOCATION
            </div>
            <div style={{ fontSize: "13px", fontWeight: "bold", color: "#ffffff", marginTop: "2px" }}>
              {team.location}
            </div>
          </div>
          <div>
            <div style={{ fontSize: "10px", fontFamily: "var(--font-mono)", color: "rgba(255, 180, 180, 0.6)" }}>
              PROGRESS
            </div>
            <div style={{ fontSize: "13px", fontWeight: "bold", color: "#ff4d58", marginTop: "2px" }}>
              {team.progress}%
            </div>
          </div>
          <div>
            <div style={{ fontSize: "10px", fontFamily: "var(--font-mono)", color: "rgba(255, 180, 180, 0.6)" }}>
              SCORE
            </div>
            <div style={{ fontSize: "13px", fontWeight: "bold", color: "#36e0c4", marginTop: "2px" }}>
              {team.score} PTS
            </div>
          </div>
          <div>
            <div style={{ fontSize: "10px", fontFamily: "var(--font-mono)", color: "rgba(255, 180, 180, 0.6)" }}>
              TIME LEFT
            </div>
            <div style={{ fontSize: "13px", fontWeight: "bold", color: "#ffb454", marginTop: "2px" }}>
              {mmss(team.timeLeft)}
            </div>
          </div>
        </div>

        {/* Powers & Clues Accordion */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          {/* Active Powers */}
          <div
            style={{
              background: "rgba(0, 0, 0, 0.4)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              padding: "10px 12px",
              borderRadius: "3px",
            }}
          >
            <div style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "#36e0c4", marginBottom: "6px" }}>
              ⚡ UNLOCKED POWERS
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {team.powers && team.powers.length > 0 ? (
                team.powers.map((p, idx) => (
                  <span
                    key={idx}
                    style={{
                      fontSize: "10px",
                      fontFamily: "var(--font-mono)",
                      background: "rgba(54, 224, 196, 0.15)",
                      border: "1px solid rgba(54, 224, 196, 0.4)",
                      color: "#36e0c4",
                      padding: "2px 6px",
                      borderRadius: "2px",
                    }}
                  >
                    ● {p}
                  </span>
                ))
              ) : (
                <span style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.4)", fontFamily: "var(--font-mono)" }}>
                  None unlocked yet
                </span>
              )}
            </div>
          </div>

          {/* Clues / Codes */}
          <div
            style={{
              background: "rgba(0, 0, 0, 0.4)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              padding: "10px 12px",
              borderRadius: "3px",
            }}
          >
            <div style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "#ffb454", marginBottom: "6px" }}>
              🔍 DISCOVERED CLUES
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {team.clues && team.clues.length > 0 ? (
                team.clues.map((c, idx) => (
                  <span
                    key={idx}
                    style={{
                      fontSize: "10px",
                      fontFamily: "var(--font-mono)",
                      background: "rgba(255, 180, 84, 0.15)",
                      border: "1px solid rgba(255, 180, 84, 0.4)",
                      color: "#ffb454",
                      padding: "2px 6px",
                      borderRadius: "2px",
                    }}
                  >
                    ★ {c}
                  </span>
                ))
              ) : (
                <span style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.4)", fontFamily: "var(--font-mono)" }}>
                  No clues archived
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Quick Operator Actions */}
        <div>
          <div style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "rgba(255, 255, 255, 0.6)", marginBottom: "8px" }}>
            DIRECT TARGET ACTIONS
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button
              onClick={() => {
                sfx("boom");
                onDirectSabotage(team.name, "CORRUPT");
              }}
              style={{
                flex: 1,
                padding: "8px",
                background: "rgba(255, 45, 58, 0.18)",
                border: "1px solid #ff2d3a",
                color: "#ff4d58",
                fontSize: "11px",
                fontFamily: "var(--font-mono)",
                cursor: "pointer",
                borderRadius: "2px",
              }}
            >
              🖥️ CORRUPT
            </button>
            <button
              onClick={() => {
                sfx("boom");
                onDirectSabotage(team.name, "LOCK");
              }}
              style={{
                flex: 1,
                padding: "8px",
                background: "rgba(255, 45, 58, 0.18)",
                border: "1px solid #ff2d3a",
                color: "#ff4d58",
                fontSize: "11px",
                fontFamily: "var(--font-mono)",
                cursor: "pointer",
                borderRadius: "2px",
              }}
            >
              🔒 LOCK
            </button>
            <button
              onClick={() => {
                sfx("boom");
                onAward(team.id, 50);
              }}
              style={{
                flex: 1,
                padding: "8px",
                background: "rgba(54, 224, 196, 0.15)",
                border: "1px solid #36e0c4",
                color: "#36e0c4",
                fontSize: "11px",
                fontFamily: "var(--font-mono)",
                cursor: "pointer",
                borderRadius: "2px",
              }}
            >
              🏆 +50 TEAMWORK
            </button>
            <button
              onClick={() => {
                sfx("boom");
                onAward(team.id, 100);
              }}
              style={{
                flex: 1,
                padding: "8px",
                background: "rgba(54, 224, 196, 0.15)",
                border: "1px solid #36e0c4",
                color: "#36e0c4",
                fontSize: "11px",
                fontFamily: "var(--font-mono)",
                cursor: "pointer",
                borderRadius: "2px",
              }}
            >
              🏆 +100 TEAMWORK
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
