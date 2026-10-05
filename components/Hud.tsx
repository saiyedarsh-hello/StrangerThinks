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
      <div className="hud">
        <div className="brand" style={{ letterSpacing: ".2em" }}>
          THE HAWKINS PROTOCOL
        </div>

        <button
          id="hud-chapters-btn"
          type="button"
          className="btn sm ghost"
          onClick={() => {
            sfx("click");
            setChapterModalOpen(true);
          }}
          style={{
            borderColor: "var(--accent)",
            color: "var(--accent)",
            background: "rgba(255, 180, 84, 0.12)",
            fontSize: 13,
            padding: "6px 14px",
            letterSpacing: ".15em",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            cursor: "pointer",
            borderRadius: 4,
            marginLeft: 6,
          }}
        >
          <span>[CHAPTERS]</span>
          <span
            style={{
              fontSize: 11,
              background: "var(--accent)",
              color: "#000",
              padding: "1px 6px",
              borderRadius: 2,
              fontWeight: "bold",
            }}
          >
            {activeChapterId} / 7
          </span>
        </button>

        <div className="grow" />

        {/* Team Name, ID & Leader Name */}
        <div className="stat" style={{ minWidth: 150 }}>
          <small style={{ letterSpacing: ".25em", color: "var(--dim)", fontSize: 11 }}>TEAM / LEADER</small>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap", marginTop: 3 }}>
            <b style={{ fontSize: 17, color: "#fff", letterSpacing: ".08em" }}>{s.team?.name || "RECON-1"}</b>
            {s.team?.id && (
              <span style={{ fontSize: 12, color: "var(--accent)", fontWeight: "bold", background: "rgba(255,180,84,0.12)", padding: "1px 6px", borderRadius: 3, border: "1px solid rgba(255,180,84,0.25)" }}>
                [{s.team.id}]
              </span>
            )}
          </div>
          {s.team?.leaderName && (
            <div style={{ fontSize: 12, color: "var(--dim)", letterSpacing: ".06em", marginTop: 2 }}>
              LEADER: <span style={{ color: "#fff" }}>{s.team.leaderName}</span>
            </div>
          )}
        </div>

        {/* Score Readout */}
        <div className="stat" style={{ paddingLeft: 12, borderLeft: "1px solid rgba(255,255,255,0.08)" }}>
          <small style={{ letterSpacing: ".25em", color: "var(--dim)", fontSize: 11 }}>SCORE</small>
          <b style={{ fontSize: 24, color: "var(--accent)", letterSpacing: ".1em", marginTop: 2 }}>
            {String(score).padStart(5, "0")}
          </b>
        </div>

        <button
          id="player-logout-btn"
          className="btn sm ghost red"
          style={{
            marginLeft: 8,
            padding: "8px 16px",
            fontSize: 13,
            letterSpacing: ".15em",
            borderRadius: 4,
            cursor: "pointer",
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
