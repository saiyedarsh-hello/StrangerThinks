"use client";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { POWERS, PowerId, useGame } from "@/lib/store";
import { ITEMS, STAGE_ORDER, STAGES, StageId } from "@/lib/stages";
import { LocationId } from "@/lib/tasks";
import { isMuted, setMuted, sfx } from "@/lib/audio";

export function SoundToggle({ style }: { style?: React.CSSProperties }) {
  return null;
}

export function Toast() {
  const { toast } = useGame();
  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          key={toast}
          className="toast"
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
        >
          {toast}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const LOCATION_NAMES: Record<LocationId, string> = {
  town: "HAWKINS TOWN",
  policeStation: "POLICE DEPT",
  byersHouse: "BYERS HOUSE",
  radioTower: "RADIO TOWER",
  lab: "HAWKINS LAB",
  forest: "THE FOREST",
  gate: "THE GATE",
  upsidedown: "UPSIDE DOWN",
  mind: "VECNA'S MIND",
};

export default function Hud() {
  const { s, score, jump, reset, logout, radiometerPinCount, viewMode, setViewMode, activeChapterId, setChapterModalOpen } = useGame();
  const [dev, setDev] = useState(false);
  const [showClueLog, setShowClueLog] = useState(false);

  useEffect(() => {
    setDev(new URLSearchParams(window.location.search).get("dev") === "1");
  }, []);

  return (
    <>
      <div
        className="hud"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px clamp(16px, 2.5vw, 32px)",
          background: "linear-gradient(180deg, rgba(14, 5, 10, 0.96) 0%, rgba(6, 2, 5, 0.98) 100%)",
          backdropFilter: "blur(18px)",
          WebkitBackdropFilter: "blur(18px)",
          borderBottom: "1px solid rgba(255, 45, 58, 0.25)",
          boxShadow: "0 4px 28px rgba(0, 0, 0, 0.9), inset 0 1px 0 rgba(255, 45, 58, 0.12)",
          gap: 16,
          zIndex: 800,
        }}
      >
        {/* Left Side: Navigation / Evidence Board Toggle */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            id="hud-evidence-board-btn"
            type="button"
            onClick={() => {
              sfx("click");
              setViewMode(viewMode === "board" ? "location" : "board");
            }}
            style={{
              borderColor: viewMode === "board" ? "#ff2d3a" : "rgba(255, 180, 84, 0.4)",
              color: viewMode === "board" ? "#ffffff" : "rgba(255, 255, 255, 0.85)",
              background:
                viewMode === "board"
                  ? "linear-gradient(135deg, rgba(255, 45, 58, 0.25) 0%, rgba(180, 20, 30, 0.15) 100%)"
                  : "rgba(255, 255, 255, 0.05)",
              border: viewMode === "board" ? "1px solid #ff2d3a" : "1px solid rgba(255, 255, 255, 0.16)",
              fontSize: 12.5,
              padding: "7px 15px",
              letterSpacing: ".14em",
              display: "inline-flex",
              alignItems: "center",
              gap: 9,
              cursor: "pointer",
              borderRadius: 4,
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              boxShadow: viewMode === "board" ? "0 0 16px rgba(255, 45, 58, 0.35)" : "none",
              transition: "all 0.18s ease",
            }}
          >
            <span style={{ fontSize: 13 }}>📌</span>
            <span>EVIDENCE BOARD</span>
            <span
              style={{
                fontSize: 10.5,
                background: viewMode === "board" ? "#ff2d3a" : "rgba(255, 180, 84, 0.25)",
                color: viewMode === "board" ? "#000000" : "#ffb454",
                padding: "2px 7px",
                borderRadius: 3,
                fontWeight: 900,
                letterSpacing: ".08em",
              }}
            >
              {activeChapterId || 1} / 8
            </span>
          </button>
        </div>

        <div className="grow" />

        {/* Right Side: Team Info, Score & Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "clamp(12px, 2vw, 24px)" }}>
          {/* Team Name and Tag Only (No Leader) */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <span
              style={{
                letterSpacing: ".24em",
                color: "rgba(255, 180, 84, 0.7)",
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase",
                marginBottom: 2,
              }}
            >
              TEAM
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <span
                style={{
                  fontSize: "clamp(14px, 1.6vw, 16.5px)",
                  fontWeight: 800,
                  color: "#ffffff",
                  letterSpacing: ".06em",
                  textShadow: "0 0 10px rgba(255, 255, 255, 0.2)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {s.team?.name || "RECON-1"}
              </span>
              {s.team?.id && (
                <span
                  style={{
                    fontSize: 11,
                    color: "#ffb454",
                    fontWeight: 700,
                    background: "rgba(255, 180, 84, 0.12)",
                    padding: "1px 6px",
                    borderRadius: 3,
                    border: "1px solid rgba(255, 180, 84, 0.3)",
                    letterSpacing: ".08em",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  [{s.team.id}]
                </span>
              )}
            </div>
          </div>

          {/* Elegant Vertical Divider */}
          <div
            style={{
              width: 1,
              height: 28,
              background: "linear-gradient(180deg, transparent, rgba(255, 255, 255, 0.18), transparent)",
            }}
          />

          {/* Score Display with Shaded Retro Digits */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <span
              style={{
                letterSpacing: ".24em",
                color: "rgba(255, 45, 58, 0.75)",
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase",
                marginBottom: 1,
              }}
            >
              SCORE
            </span>
            <span
              style={{
                fontSize: "clamp(20px, 2.2vw, 24px)",
                fontWeight: "bold",
                color: "var(--accent, #ff8a4c)",
                letterSpacing: ".12em",
                fontFamily: "var(--font-term), monospace",
                lineHeight: 1,
                textShadow: "0 0 12px rgba(255, 138, 76, 0.45)",
              }}
            >
              {String(score).padStart(5, "0")}
            </span>
          </div>

          {/* Logout Button */}
          <button
            id="player-logout-btn"
            type="button"
            className="btn sm ghost red"
            style={{
              padding: "7px 16px",
              fontSize: 11.5,
              letterSpacing: ".14em",
              borderRadius: 4,
              cursor: "pointer",
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              background: "rgba(255, 45, 58, 0.08)",
              borderColor: "rgba(255, 45, 58, 0.4)",
              color: "#ff4d5a",
              transition: "all 0.15s ease",
            }}
            onClick={() => {
              if (confirm("Log out of Hawkins Protocol and return to login screen?")) {
                logout();
              }
            }}
          >
            [LOGOUT]
          </button>
        </div>
      </div>

      {/* Slide-out Clue Log Drawer */}
      <AnimatePresence>
        {showClueLog && (
          <motion.div
            initial={{ opacity: 0, x: 200 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 200 }}
            style={{
              position: "fixed",
              top: 60,
              right: 14,
              width: 340,
              maxHeight: "80vh",
              background: "rgba(10, 14, 20, 0.96)",
              border: "1px solid var(--accent)",
              borderRadius: 6,
              boxShadow: "0 10px 40px rgba(0,0,0,0.8)",
              zIndex: 890,
              padding: "16px 18px",
              fontFamily: "var(--font-term)",
              overflowY: "auto",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: 8 }}>
              <div className="eyebrow" style={{ color: "var(--accent)" }}>
                DISCOVERED INTEL &amp; CLUES
              </div>
              <button
                type="button"
                onClick={() => setShowClueLog(false)}
                style={{ background: "none", border: "none", color: "var(--dim)", cursor: "pointer", fontSize: 13, letterSpacing: ".1em" }}
              >
                [CLOSE]
              </button>
            </div>

            {Object.keys(s.clues || {}).length === 0 ? (
              <div className="term dim" style={{ fontSize: 14, padding: "10px 0" }}>
                No clues logged yet. Solve tasks at Hawkins locations to collect evidence.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {Object.entries(s.clues || {}).map(([key, val]) => (
                  <div
                    key={key}
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 4,
                      padding: "8px 10px",
                    }}
                  >
                    <div className="eyebrow" style={{ fontSize: 10, color: "var(--accent2)" }}>
                      {key.toUpperCase()}
                    </div>
                    <div style={{ fontSize: 14, color: "#fff", marginTop: 2 }}>{val}</div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

const ICON: Record<PowerId, string> = { vision: "SIGHT", will: "LINK", eleven: "FORCE" };
const LABEL: Record<PowerId, string> = { vision: "EYE", will: "WAVE", eleven: "PSI" };

export function Dock() {
  const { s, powerUnlocked, castPower, active, say } = useGame();
  const cast = (p: PowerId) => {
    if (!powerUnlocked(p)) return say(`${POWERS[p].name} — LOCKED`);
    if (!active) return say("OPEN A TASK FIRST");
    const r = castPower(p, active);
    if (r === "ALREADY") say("ALREADY USED ON THIS TASK");
  };

  return (
    <div className="dock">
      {(Object.keys(POWERS) as PowerId[]).map((p) => {
        const un = powerUnlocked(p);
        const left = POWERS[p].max - (s.powerUses?.[p] || 0);
        return (
          <button
            key={p}
            className={`slot ${un && left > 0 ? "ready" : "locked"}`}
            onClick={() => cast(p)}
            title={`${POWERS[p].name} — ${POWERS[p].blurb} (-10 pts)`}
          >
            <span className="g" style={{ fontSize: un ? 28 : 12, letterSpacing: ".1em" }}>
              {un ? ICON[p] : "[LOCK]"}
            </span>
            <small>{LABEL[p]}</small>
            {un && <span className="ch">{left}</span>}
          </button>
        );
      })}

      {s.inventory?.length > 0 && <div className="sep" />}

      {s.inventory?.map((id) => (
        <div key={id} className="slot item" title={`${ITEMS[id]?.name}: ${ITEMS[id]?.desc}`}>
          <span className="g" style={{ color: "var(--accent2)" }}>
            {ITEMS[id]?.glyph || "▤"}
          </span>
        </div>
      ))}
    </div>
  );
}
