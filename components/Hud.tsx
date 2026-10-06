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
          padding: "8px clamp(16px, 2.5vw, 32px)",
          height: 64,
          background: "linear-gradient(180deg, rgba(16, 4, 10, 0.98) 0%, rgba(6, 2, 5, 0.99) 100%)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: "1.5px solid rgba(255, 45, 58, 0.35)",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.95), inset 0 1px 0 rgba(255, 45, 58, 0.25)",
          gap: 16,
          zIndex: 800,
          boxSizing: "border-box",
        }}
      >
        {/* Left Side: Crazy Tactile 3D Red Pushpin & Yarn Evidence Board Toggle */}
        <div style={{ display: "flex", alignItems: "center" }}>
          <button
            id="hud-evidence-board-btn"
            type="button"
            onClick={() => {
              sfx("click");
              setViewMode(viewMode === "board" ? "location" : "board");
            }}
            style={{
              position: "relative",
              display: "inline-flex",
              alignItems: "center",
              gap: 12,
              padding: "7px 16px 7px 12px",
              background:
                viewMode === "board"
                  ? "linear-gradient(135deg, rgba(220, 20, 35, 0.32) 0%, rgba(100, 10, 20, 0.45) 100%)"
                  : "linear-gradient(135deg, rgba(25, 10, 18, 0.85) 0%, rgba(12, 4, 8, 0.9) 100%)",
              border: viewMode === "board" ? "1.5px solid #ff2d3a" : "1px solid rgba(255, 45, 58, 0.3)",
              borderRadius: 6,
              cursor: "pointer",
              boxShadow:
                viewMode === "board"
                  ? "0 0 24px rgba(255, 45, 58, 0.55), inset 0 0 14px rgba(255, 45, 58, 0.25)"
                  : "0 4px 14px rgba(0, 0, 0, 0.7)",
              transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
              transform: viewMode === "board" ? "scale(1.02)" : "scale(1)",
            }}
          >
            {/* Realistic 3D Angled Red Pushpin with Thread */}
            <div
              style={{
                position: "relative",
                width: 24,
                height: 24,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                style={{
                  filter: "drop-shadow(0 3px 6px rgba(255, 34, 51, 0.9))",
                  transform: "rotate(-18deg)",
                }}
              >
                {/* Silver Needle Tip */}
                <path d="M12 15L7 23L15 17" stroke="#e0e0e0" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M11.5 16L8 22" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" />
                {/* Pin Head Base Rim */}
                <ellipse cx="14.5" cy="9.5" rx="6.5" ry="4.5" fill="#660000" transform="rotate(-35 14.5 9.5)" />
                {/* Glossy Red Head Sphere */}
                <circle cx="12.5" cy="7.5" r="6" fill="url(#hudPinGrad)" />
                {/* White Gloss Highlight */}
                <ellipse cx="10.5" cy="5.5" rx="2.5" ry="1.5" fill="#ffffff" opacity="0.85" transform="rotate(-30 10.5 5.5)" />
                <defs>
                  <radialGradient id="hudPinGrad" cx="35%" cy="30%" r="70%">
                    <stop offset="0%" stopColor="#ff5a66" />
                    <stop offset="50%" stopColor="#ff1726" />
                    <stop offset="100%" stopColor="#80000a" />
                  </radialGradient>
                </defs>
              </svg>

              {/* Glowing Red Yarn Thread Trailing Off */}
              <span
                style={{
                  position: "absolute",
                  bottom: -1,
                  right: -5,
                  width: 12,
                  height: 12,
                  borderBottom: "2px solid #ff2233",
                  borderRight: "2px solid #ff2233",
                  borderRadius: "0 0 8px 0",
                  opacity: 0.85,
                  filter: "drop-shadow(0 0 4px #ff2233)",
                  pointerEvents: "none",
                }}
              />
            </div>

            {/* Evidence Board Text & Status */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", lineHeight: 1.15 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <span
                  style={{
                    fontFamily: "var(--font-term), monospace",
                    fontSize: 14.5,
                    fontWeight: 900,
                    letterSpacing: ".16em",
                    color: viewMode === "board" ? "#ffffff" : "#ff8a80",
                    textTransform: "uppercase",
                    textShadow: viewMode === "board" ? "0 0 12px rgba(255, 45, 58, 0.8)" : "none",
                  }}
                >
                  EVIDENCE PINBOARD
                </span>
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: "#ff2233",
                    boxShadow: "0 0 8px #ff2233",
                    animation: "pulse 1.4s infinite",
                  }}
                />
              </div>

              <div
                style={{
                  fontSize: 10,
                  fontFamily: "var(--font-mono)",
                  letterSpacing: ".14em",
                  color: "rgba(255, 255, 255, 0.45)",
                  marginTop: 2,
                }}
              >
                HAWKINS INVESTIGATION MATRIX
              </div>
            </div>

            {/* Chapter Badge */}
            <div
              style={{
                marginLeft: 4,
                padding: "2px 8px",
                borderRadius: 3,
                background: viewMode === "board" ? "#ff2d3a" : "rgba(255, 45, 58, 0.18)",
                color: viewMode === "board" ? "#000000" : "#ff8a80",
                border: "1px solid rgba(255, 45, 58, 0.5)",
                fontSize: 11,
                fontWeight: 900,
                letterSpacing: ".1em",
                fontFamily: "var(--font-mono)",
                boxShadow: viewMode === "board" ? "0 0 10px rgba(255, 45, 58, 0.6)" : "none",
              }}
            >
              {activeChapterId || 1} / 8
            </div>
          </button>
        </div>

        <div className="grow" />

        {/* Right Side: Team Info (No [T06]), Score & Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "clamp(12px, 2.2vw, 28px)" }}>
          {/* Team Name Only Capsule */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              padding: "4px 14px",
              borderRadius: 5,
            }}
          >
            <span
              style={{
                letterSpacing: ".26em",
                color: "#ff9e58",
                fontSize: 9.5,
                fontWeight: 900,
                textTransform: "uppercase",
                marginBottom: 2,
                fontFamily: "var(--font-mono)",
              }}
            >
              SQUAD / TEAM
            </span>
            <span
              style={{
                fontSize: "clamp(14px, 1.6vw, 17px)",
                fontWeight: 900,
                color: "#ffffff",
                letterSpacing: ".08em",
                textShadow: "0 0 12px rgba(255, 255, 255, 0.35)",
                fontFamily: "var(--font-mono)",
                textTransform: "uppercase",
              }}
            >
              {s.team?.name || "RECON-1"}
            </span>
          </div>

          {/* Elegant Vertical Neon Divider */}
          <div
            style={{
              width: 1,
              height: 32,
              background: "linear-gradient(180deg, transparent, rgba(255, 45, 58, 0.4), transparent)",
            }}
          />

          {/* Score Display with Shaded Retro Digits */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              background: "rgba(0, 0, 0, 0.45)",
              border: "1px solid rgba(255, 45, 58, 0.2)",
              padding: "3px 12px",
              borderRadius: 5,
            }}
          >
            <span
              style={{
                letterSpacing: ".24em",
                color: "rgba(255, 45, 58, 0.85)",
                fontSize: 9.5,
                fontWeight: 900,
                textTransform: "uppercase",
                fontFamily: "var(--font-mono)",
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
                textShadow: "0 0 14px rgba(255, 138, 76, 0.6)",
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
              padding: "8px 16px",
              fontSize: 12,
              letterSpacing: ".15em",
              borderRadius: 4,
              cursor: "pointer",
              fontFamily: "var(--font-mono)",
              fontWeight: 800,
              background: "rgba(255, 45, 58, 0.08)",
              borderColor: "rgba(255, 45, 58, 0.45)",
              color: "#ff4d5a",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.6)",
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
