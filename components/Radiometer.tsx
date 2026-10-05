"use client";
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useGame } from "@/lib/store";
import {
  FINAL_CODE,
  RADIOMETER_PINS,
  RADIOMETER_TASKS,
  RadiometerTask,
  TASK_ANGLES,
} from "@/lib/radiometer";
import { sfx } from "@/lib/audio";
import CharacterStage, { ReactionType } from "./CharacterStage";
import { CHARACTERS } from "@/lib/characters";
import { getPipLine } from "@/lib/dialogue";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function scramble(str: string) {
  const sym = "▓▒░#@%&?§¥~";
  return str
    .split("")
    .map((c) =>
      /[a-z0-9]/i.test(c) && Math.random() > 0.55
        ? sym[Math.floor(Math.random() * sym.length)]
        : c
    )
    .join("");
}
const leet = (s: string) =>
  s.replace(/a/gi, "4").replace(/e/gi, "3").replace(/i/gi, "1")
   .replace(/o/gi, "0").replace(/s/gi, "5");

// ─────────────────────────────────────────────────────────────────────────────
// Code window (shared)
// ─────────────────────────────────────────────────────────────────────────────
function CodeWin({ code, distort }: { code: string; distort?: boolean }) {
  const lines = code.split("\n");
  return (
    <div className="codewin" style={{ marginBottom: 12 }}>
      <div className="gut">
        {lines.map((_, i) => <div key={i}>{i + 1}</div>)}
      </div>
      <pre style={{ filter: distort ? "hue-rotate(40deg) blur(0.6px)" : undefined }}>
        {code}
      </pre>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Morse decoder display
// ─────────────────────────────────────────────────────────────────────────────
function MorseDisplay({ morse, solved }: { morse: string; solved: boolean }) {
  return (
    <div className="rm-morse">
      <div className="rm-morse__label">INCOMING MORSE</div>
      <div className="rm-morse__code">
        {morse.split(" ").map((sym, i) => (
          <span key={i} className={`rm-morse__sym ${solved ? "rm-morse__sym--on" : ""}`}>
            {sym}
          </span>
        ))}
      </div>
      {!solved && (
        <div className="rm-morse__hint term" style={{ fontSize: 15, marginTop: 6, color: "var(--dim)" }}>
          Dots (·) = dit, Dashes (−) = dah. Each group = one character.
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Animated tuning dial (radio task)
// ─────────────────────────────────────────────────────────────────────────────
function TuningDial({
  target, onTuned,
}: { target: string; onTuned: () => void }) {
  const [freq, setFreq] = useState(88.0);
  const [tuned, setTuned] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setFreq(v);
    if (Math.abs(v - parseFloat(target)) < 0.15 && !tuned) {
      setTuned(true);
      sfx("clue");
      onTuned();
    }
  };

  return (
    <div className="rm-dial">
      <div className="rm-dial__display">
        <span className="rm-dial__freq eyebrow">{freq.toFixed(1)} MHz</span>
        <div className="rm-dial__signal-bar">
          <motion.div
            className="rm-dial__fill"
            animate={{ width: `${Math.max(0, 100 - Math.abs(freq - parseFloat(target)) * 200)}%` }}
            transition={{ duration: 0.1 }}
          />
        </div>
        <span className="rm-dial__status term" style={{ fontSize: 16, color: tuned ? "var(--accent2)" : "var(--dim)" }}>
          {tuned ? "◉ LOCKED ON" : "SEARCHING…"}
        </span>
      </div>
      <input
        type="range" min="87.0" max="88.2" step="0.1"
        value={freq}
        onChange={handleChange}
        className="rm-dial__slider"
        aria-label="Tune frequency"
      />
      <div className="rm-dial__scale">
        {["87.0","87.5","87.6","88.0","88.2"].map((f) => (
          <span key={f} style={{ color: f === target ? "var(--accent2)" : "var(--dim)", fontSize: 13 }}>{f}</span>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Connection / patch bay task
// ─────────────────────────────────────────────────────────────────────────────
function PatchBay({
  pairs, onComplete,
}: { pairs: Array<{ from: string; to: string }>; onComplete: () => void }) {
  const [connected, setConnected] = useState<Record<string, string>>({});
  const [dragging, setDragging] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);

  const connect = (from: string, to: string) => {
    setConnected((p) => {
      const next = { ...p, [from]: to };
      const allDone = pairs.every((pr) => next[pr.from] === pr.to);
      if (allDone && !revealed) {
        setRevealed(true);
        sfx("clue");
        setTimeout(onComplete, 600);
      }
      return next;
    });
    setDragging(null);
  };

  return (
    <div className="rm-patchbay">
      <div className="rm-patchbay__cols">
        {/* sources */}
        <div className="rm-patchbay__side rm-patchbay__side--left">
          {pairs.map((pr) => (
            <button
              key={pr.from}
              className={`rm-patchbay__port rm-patchbay__port--src ${dragging === pr.from ? "rm-patchbay__port--drag" : ""} ${connected[pr.from] ? "rm-patchbay__port--ok" : ""}`}
              onClick={() => setDragging(dragging === pr.from ? null : pr.from)}
              aria-pressed={dragging === pr.from}
            >
              {connected[pr.from] ? "[OK] " : ""}{pr.from}
            </button>
          ))}
        </div>

        {/* SVG wires */}
        <svg className="rm-patchbay__wires" aria-hidden>
          {pairs.map((pr, i) => {
            const isConnected = connected[pr.from] === pr.to;
            return isConnected ? (
              <line key={pr.from}
                x1="0%" y1={`${(i / pairs.length) * 100 + 12.5}%`}
                x2="100%" y2={`${(i / pairs.length) * 100 + 12.5}%`}
                stroke="var(--accent2)" strokeWidth="2"
                strokeDasharray="4 2"
              />
            ) : null;
          })}
          {dragging && <line x1="0%" y1="50%" x2="100%" y2="50%" stroke="var(--accent)" strokeWidth="1.5" strokeDasharray="6 3" opacity="0.6" />}
        </svg>

        {/* destinations */}
        <div className="rm-patchbay__side rm-patchbay__side--right">
          {pairs.map((pr) => (
            <button
              key={pr.to}
              className={`rm-patchbay__port rm-patchbay__port--dst ${Object.values(connected).includes(pr.to) ? "rm-patchbay__port--ok" : ""}`}
              onClick={() => dragging && connect(dragging, pr.to)}
              aria-label={`Connect to ${pr.to}`}
            >
              {Object.values(connected).includes(pr.to) ? "[OK] " : ""}{pr.to}
            </button>
          ))}
        </div>
      </div>

      {revealed && (
        <motion.div className="rm-patchbay__reveal" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
          DECODED DIGIT: <strong>4</strong>
        </motion.div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Rearrange / scrambled log task
// ─────────────────────────────────────────────────────────────────────────────
function RearrangeLog({
  tiles, correct, onComplete,
}: { tiles: string[]; correct: string[]; onComplete: () => void }) {
  const [order, setOrder] = useState(() => [...tiles].sort(() => Math.random() - 0.5));
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const [restored, setRestored] = useState(false);

  const swap = (from: number, to: number) => {
    setOrder((prev) => {
      const next = [...prev];
      [next[from], next[to]] = [next[to], next[from]];
      const ok = next.every((w, i) => w === correct[i]);
      if (ok && !restored) {
        setRestored(true);
        sfx("clue");
        setTimeout(onComplete, 700);
      }
      return next;
    });
    setDraggingIdx(null);
  };

  return (
    <div className="rm-rearrange">
      <div className="rm-rearrange__tiles">
        {order.map((word, i) => (
          <motion.button
            key={word + i}
            className={`rm-rearrange__tile ${draggingIdx === i ? "rm-rearrange__tile--drag" : ""} ${restored ? "rm-rearrange__tile--done" : ""}`}
            onClick={() => {
              if (draggingIdx === null) { setDraggingIdx(i); }
              else if (draggingIdx !== i) { swap(draggingIdx, i); }
              else { setDraggingIdx(null); }
            }}
            whileHover={{ y: -3 }}
            layout
          >
            {word}
          </motion.button>
        ))}
      </div>
      {restored && (
        <motion.div className="rm-rearrange__reveal" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          MESSAGE RESTORED — HIGHLIGHTED DIGIT: <strong>SEVEN</strong>
        </motion.div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Task modal — renders the right sub-task by type
// ─────────────────────────────────────────────────────────────────────────────
function TaskModal({
  task,
  pinIndex,
  alreadySolved,
  sabotage,
  onSolve,
  onClose,
  onFail,
}: {
  task: RadiometerTask;
  pinIndex: number;
  alreadySolved: boolean;
  sabotage: import("@/lib/store").Sabotage | null;
  onSolve: (pinIndex: number, points: number) => void;
  onClose: () => void;
  onFail?: () => void;
}) {
  const [val, setVal] = useState("");
  const [shake, setShake] = useState(0);
  const [fails, setFails] = useState(0);
  const [tuned, setTuned] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const jammed = sabotage?.kind === "SIGNAL_JAM";
  const locked = sabotage?.kind === "LOCK" && (sabotage.pinIndex === undefined || sabotage.pinIndex === pinIndex);
  const isCorrupt = sabotage?.kind === "CORRUPT";
  const isDistort = sabotage?.kind === "DISTORT";

  const promptText = isCorrupt
    ? scramble(task.prompt)
    : isDistort
    ? leet(task.prompt)
    : task.prompt;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (locked || alreadySolved) return;
    if (task.answer.test(val.trim())) {
      sfx("ok");
      onSolve(pinIndex, task.points);
    } else {
      sfx("err");
      setShake((n) => n + 1);
      setFails((n) => n + 1);
      if (onFail) onFail();
    }
  };

  // for connection/rearrange tasks, submit is triggered by component completing
  const handleSubComplete = () => {
    if (!alreadySolved) {
      sfx("ok");
      onSolve(pinIndex, task.points);
    }
  };

  return (
    <motion.div
      className="rm-modal-backdrop"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label={task.objectLabel}
    >
      <motion.div
        className={`rm-modal panel ${alreadySolved ? "rm-modal--solved" : ""}`}
        initial={{ scale: 0.9, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
      >
        {/* header */}
        <div className="panel-head">
          <span className="dot" style={{ background: alreadySolved ? "var(--accent2)" : "var(--accent)" }} />
          <span>{task.objectLabel}</span>
          <span style={{ marginLeft: "auto", color: "var(--dim)", fontSize: 16 }}>
            PIN {pinIndex + 1}/5 · {task.points} PTS
          </span>
          <button className="btn sm ghost" style={{ marginLeft: 12, padding: "4px 10px", fontSize: 12 }} onClick={onClose} aria-label="Close">[CLOSE]</button>
        </div>

        <div className="panel-body rm-modal__body">
          {/* story context & Pip section briefing */}
          <div className="eyebrow" style={{ fontSize: 13, marginBottom: 8, color: "var(--accent)" }}>{task.storyContext}</div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: "rgba(255, 124, 133, 0.1)",
              border: "1px solid rgba(255, 124, 133, 0.3)",
              borderRadius: 4,
              padding: "7px 12px",
              marginBottom: 14,
            }}
          >
            <img
              src="/characters/radiokid.png"
              alt="Pip"
              style={{ width: 30, height: 30, objectFit: "contain", imageRendering: "pixelated", flexShrink: 0 }}
            />
            <div style={{ fontSize: 13, fontFamily: "var(--font-mono)", color: "#ff7c85", lineHeight: 1.4 }}>
              <strong>PIP:</strong> "Calibrating Pin {pinIndex + 1}! Check the frequency sweep and harmonic indicators to lock the digit!"
            </div>
          </div>

          {/* already solved state */}
          {alreadySolved ? (
            <div className="term" style={{ color: "var(--accent2)", fontSize: 22 }}>
              [RESTORED] PIN {pinIndex + 1} RESTORED — ACCESS GRANTED
            </div>
          ) : (
            <>
              {/* ── RADIO task ─────────────────────────────────── */}
              {task.type === "radio" && (
                <div>
                  {jammed ? (
                    <div className="term" style={{ color: "var(--danger)" }}>
                      [ALERT] SIGNAL JAMMED — TUNING DIAL OFFLINE
                    </div>
                  ) : (
                    <>
                      <TuningDial target={task.frequency!} onTuned={() => setTuned(true)} />
                      {tuned && task.morseMessage && (
                        <MorseDisplay morse={task.morseMessage} solved={false} />
                      )}
                    </>
                  )}
                </div>
              )}

              {/* ── SERIES task ─────────────────────────────────── */}
              {task.type === "series" && (
                <div className="rm-blips">
                  {[2, 4, 8, 16].map((n, i) => (
                    <motion.div
                      key={n}
                      className="rm-blip"
                      animate={{ scale: [1, 1.25, 1], opacity: [0.6, 1, 0.6] }}
                      transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.25 }}
                    >
                      {n}
                    </motion.div>
                  ))}
                  <div className="rm-blip rm-blip--q">?</div>
                </div>
              )}

              {/* ── CONNECTION / PATCH BAY task ─────────────────── */}
              {task.type === "connection" && task.pairs && (
                <PatchBay pairs={task.pairs} onComplete={handleSubComplete} />
              )}

              {/* ── REARRANGE task ───────────────────────────────── */}
              {task.type === "rearrange" && task.tiles && task.correctOrder && (
                <RearrangeLog
                  tiles={task.tiles}
                  correct={task.correctOrder}
                  onComplete={handleSubComplete}
                />
              )}

              {/* ── DEBUG terminal task ──────────────────────────── */}
              {task.type === "debug" && task.code && (
                <CodeWin code={task.code} distort={isDistort} />
              )}

              {/* prompt (not shown for connection/rearrange which are self-completing) */}
              {task.type !== "connection" && task.type !== "rearrange" && (
                <p className="term" style={{ marginBottom: 14, color: isCorrupt || isDistort ? "var(--danger)" : "var(--ink)" }}>
                  {promptText}
                </p>
              )}

              {/* answer field — not for connection/rearrange (those self-complete) */}
              {task.type !== "connection" && task.type !== "rearrange" && (
                <form
                  onSubmit={onSubmit}
                  key={shake}
                  className={shake && fails ? "shake" : ""}
                  style={{ marginTop: 12 }}
                >
                  {locked && (
                    <div className="term" style={{ color: "var(--danger)", marginBottom: 8 }}>
                      VECNA HAS SEALED THIS PIN (PIN {pinIndex + 1})
                    </div>
                  )}
                  <label className="lbl">
                    {locked ? "ACCESS DENIED" : "ENTER DIGIT"}
                  </label>
                  <div style={{ display: "flex", gap: 10 }}>
                    <input
                      ref={inputRef}
                      className="field"
                      value={val}
                      disabled={locked}
                      onChange={(e) => { setVal(e.target.value); sfx("type"); }}
                      placeholder={task.placeholder}
                      autoComplete="off"
                      spellCheck={false}
                      maxLength={6}
                    />
                    <button className="btn" disabled={locked || !val.trim()}>SEND</button>
                  </div>
                  {fails > 0 && (
                    <div className="term" style={{ color: "var(--danger)", marginTop: 8 }}>
                      ACCESS DENIED · ATTEMPT {fails}
                    </div>
                  )}
                </form>
              )}
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Keypad — final code entry (only shows when all 5 pins solved)
// ─────────────────────────────────────────────────────────────────────────────
function Keypad({ onFail }: { onFail?: () => void }) {
  const { s, submitRadiometerCode, say } = useGame();
  const [code, setCode] = useState("");
  const [shake, setShake] = useState(0);
  const [fails, setFails] = useState(0);
  const rm = s.radiometer;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ok = submitRadiometerCode(code);
    if (ok) {
      say("LAB ACCESS GRANTED — DOOR UNLOCKED");
    } else {
      setShake((n) => n + 1);
      setFails((n) => n + 1);
      if (onFail) onFail();
    }
  };

  if (rm.codeSolved) {
    return (
      <motion.div
        className="rm-keypad rm-keypad--open panel"
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
      >
        <div className="panel-head">
          <span className="dot" style={{ background: "var(--accent2)" }} />
          <span>LAB ACCESS</span>
        </div>
        <div className="panel-body" style={{ textAlign: "center" }}>
          <motion.div
            className="title-xl"
            style={{ fontSize: "clamp(22px,4vw,40px)", marginBottom: 10 }}
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            LAB ACCESS GRANTED
          </motion.div>
          <div className="term" style={{ color: "var(--accent2)" }}>
            [ACCESS GRANTED] DOOR UNLOCKED · PROCEED TO HAWKINS LAB
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="rm-keypad panel"
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
    >
      <div className="panel-head">
        <span className="dot" style={{ background: "var(--danger)" }} />
        <span>HAWKINS LAB — SECURITY DOOR</span>
      </div>
      <div className="panel-body">
        <div className="term" style={{ marginBottom: 10, fontSize: 16 }}>
          ACCESS CODE RESTORED. Enter the 5-digit code to open the Lab door.
        </div>
        <div className="rm-keypad__display">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className={`rm-keypad__cell ${code[i] ? "rm-keypad__cell--filled" : ""}`}>
              {code[i] || "·"}
            </div>
          ))}
        </div>
        <form onSubmit={onSubmit} key={shake} className={shake && fails ? "shake" : ""}>
          <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
            <input
              className="field"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 5))}
              placeholder="_ _ _ _ _"
              maxLength={5}
              autoComplete="off"
              spellCheck={false}
              aria-label="Enter 5-digit access code"
              style={{ letterSpacing: "0.4em", textAlign: "center", fontSize: 28 }}
            />
            <button className="btn" disabled={code.length < 5}>ENTER</button>
          </div>
          {fails > 0 && (
            <div className="term" style={{ color: "var(--danger)", marginTop: 8 }}>
              ACCESS DENIED · ATTEMPT {fails}
            </div>
          )}
        </form>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Progress badge (HUD addition for this section)
// ─────────────────────────────────────────────────────────────────────────────
function PinProgressBadge() {
  const { radiometerPinCount } = useGame();
  return (
    <div className="rm-progress-badge" aria-label={`Pins restored: ${radiometerPinCount} of 5`}>
      <span className="rm-progress-badge__label eyebrow">PINS RESTORED</span>
      <div className="rm-progress-badge__dots">
        {Array.from({ length: 5 }, (_, i) => (
          <motion.div
            key={i}
            className={`rm-progress-badge__dot ${i < radiometerPinCount ? "rm-progress-badge__dot--on" : ""}`}
            animate={i < radiometerPinCount ? { scale: [1, 1.35, 1] } : {}}
            transition={{ duration: 0.4 }}
          />
        ))}
      </div>
      <span className="rm-progress-badge__count">{radiometerPinCount}/5</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Task node buttons (the clickable in-world objects)
// ─────────────────────────────────────────────────────────────────────────────
function TaskButton({
  task,
  pinIndex,
  solved,
  jammed,
  locked,
  onClick,
}: {
  task: RadiometerTask;
  pinIndex: number;
  solved: boolean;
  jammed: boolean;
  locked?: boolean;
  onClick: () => void;
}) {
  const icons: Record<string, string> = {
    radio: "RAD",
    series: "SIG",
    connection: "LNK",
    rearrange: "ORD",
    debug: "LOG",
  };
  const disabled = solved || jammed || locked;
  return (
    <motion.button
      className={`rm-taskbtn ${solved ? "rm-taskbtn--done" : locked ? "rm-taskbtn--jammed" : jammed ? "rm-taskbtn--jammed" : "rm-taskbtn--active"}`}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      whileHover={!disabled ? { scale: 1.06, y: -3 } : undefined}
      whileTap={!disabled ? { scale: 0.97 } : undefined}
      aria-label={`${task.objectLabel}${solved ? " – complete" : locked ? " – locked by vecna" : jammed ? " – jammed" : ""}`}
    >
      <span className="rm-taskbtn__icon">{solved ? "[OK]" : locked ? "[LOCK]" : icons[task.type] ?? "◎"}</span>
      <span className="rm-taskbtn__name">{task.objectLabel}</span>
      {solved && <span className="rm-taskbtn__solved">SOLVED</span>}
      {locked && <span className="rm-taskbtn__jammed">LOCKED</span>}
      {jammed && !locked && task.type === "radio" && <span className="rm-taskbtn__jammed">JAMMED</span>}
    </motion.button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Root Radiometer component
// ─────────────────────────────────────────────────────────────────────────────
export default function Radiometer() {
  const { s, sabotage, radiometerPinCount, solveRadiometerPin, say } = useGame();
  const rm = s.radiometer;
  const [openTask, setOpenTask] = useState<number | null>(null);
  const [cinematicPin, setCinematicPin] = useState<number | null>(null);
  const [pipCustomText, setPipCustomText] = useState<string>("");
  const [pipReaction, setPipReaction] = useState<ReactionType>("idle");

  const jammed = sabotage?.kind === "SIGNAL_JAM";
  const allSolved = radiometerPinCount === 5;

  useEffect(() => {
    if (allSolved) {
      setPipCustomText(getPipLine("taskComplete"));
      setPipReaction("happy");
    }
  }, [allSolved]);

  const openModal = useCallback((taskIdx: number) => {
    sfx("click");
    setOpenTask(taskIdx);
    setPipCustomText(`Let's tune Pin ${taskIdx + 1}! Sweep the frequency and look for harmonic resonance!`);
    setPipReaction("talking");
  }, []);

  const closeModal = useCallback(() => setOpenTask(null), []);

  const handleFail = useCallback(() => {
    setPipCustomText(getPipLine("wrong"));
    setPipReaction("wrong");
  }, []);

  const handleSolve = (pinIndex: number, points: number) => {
    setOpenTask(null);
    setCinematicPin(pinIndex);
    solveRadiometerPin(pinIndex, points);
    say(`PIN ${pinIndex + 1} RESTORED  +${points} PTS`);
    setPipCustomText(getPipLine("correct"));
    setPipReaction("happy");
    setTimeout(() => {
      sfx("click");
    }, 450);
    setTimeout(() => {
      setCinematicPin(null);
    }, 1800);
  };

  return (
    <div className="rm-root">
      {/* ── header ─────────────────────────────────────────────────────── */}
      <div className="rm-header">
        <div className="eyebrow" style={{ fontSize: 13 }}>RADIO TOWER · SUBLEVEL A</div>
        <h2 className="title-xl" style={{ fontSize: "clamp(22px,3.5vw,44px)" }}>
          RADIOMETER
        </h2>
        <div className="term" style={{ fontSize: 17, color: "var(--dim)", marginTop: 4 }}>
          The tower's old radiometer is scrambled. Restore all 5 pins to recover the Lab access code.
        </div>
        <PinProgressBadge />
      </div>

      {/* ── Pip's Live Radio Communication Bar ──────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          background: "rgba(10, 4, 7, 0.85)",
          border: "1px solid rgba(255, 124, 133, 0.35)",
          borderRadius: 4,
          padding: "8px 14px",
          marginBottom: 14,
        }}
      >
        <img
          src="/characters/radiokid.png"
          alt="Pip"
          style={{ width: 34, height: 34, objectFit: "contain", imageRendering: "pixelated" }}
        />
        <div style={{ flex: 1, fontFamily: "var(--font-mono)", fontSize: 13, color: "#ff7c85" }}>
          <strong style={{ color: "#fff", marginRight: 6 }}>[PIP]:</strong>
          {pipCustomText || "Carrier wave locked on 14.3 MHz! Restore all 5 pins to decrypt the code!"}
        </div>
        <button
          type="button"
          onClick={() => {
            setPipCustomText(getPipLine("hint"));
            setPipReaction("thinking");
          }}
          className="btn sm ghost"
          style={{ fontSize: 10, padding: "2px 8px", borderColor: "rgba(255, 124, 133, 0.4)", color: "#ff7c85" }}
        >
          💡 INTEL
        </button>
      </div>

      {/* ── instrument + task buttons ─────────────────────────────────── */}
      <div className="rm-layout">
        {/* instrument */}
        <div className="rm-instrument-wrap">
          <div className="rm-instrument-placeholder">
            <RadiometerInstrumentInline pinsSolved={rm.pinsSolved} jammed={jammed} cinematicPin={cinematicPin} />
          </div>
        </div>

        {/* task object buttons */}
        <div className="rm-tasks">
          {RADIOMETER_TASKS.map((task, i) => {
            const pinIdx = RADIOMETER_PINS[i]?.taskIndex ?? i;
            return (
              <TaskButton
                key={task.id}
                task={task}
                pinIndex={pinIdx}
                solved={rm.pinsSolved[pinIdx]}
                jammed={jammed && task.type === "radio"}
                locked={sabotage?.kind === "LOCK" && (sabotage.pinIndex === undefined || sabotage.pinIndex === pinIdx)}
                onClick={() => openModal(i)}
              />
            );
          })}
        </div>
      </div>

      {/* ── keypad (shown when all pins solved) ──────────────────────── */}
      <AnimatePresence>
        {allSolved && (
          <motion.div key="keypad" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="rm-banner-restored">
              <motion.div
                className="title-xl"
                style={{ fontSize: "clamp(18px,3vw,32px)", textAlign: "center", color: "var(--accent)" }}
              >
                ◉ ACCESS CODE RESTORED
              </motion.div>
            </div>
            <Keypad onFail={handleFail} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── task modal ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {openTask !== null && (() => {
          const task = RADIOMETER_TASKS[openTask];
          const pinIdx = RADIOMETER_PINS[openTask]?.taskIndex ?? openTask;
          return (
            <TaskModal
              key={task.id}
              task={task}
              pinIndex={pinIdx}
              alreadySolved={rm.pinsSolved[pinIdx]}
              sabotage={sabotage}
              onSolve={handleSolve}
              onClose={closeModal}
              onFail={handleFail}
            />
          );
        })()}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Inline instrument (self-contained so Radiometer.tsx stays independent of
// RadiometerScene.tsx's canvas hooks, which need client-only code)
// ─────────────────────────────────────────────────────────────────────────────
function RadiometerInstrumentInline({
  pinsSolved,
  jammed,
  cinematicPin = null,
}: {
  pinsSolved: boolean[];
  jammed: boolean;
  cinematicPin?: number | null;
}) {
  const clarity = pinsSolved.filter(Boolean).length / 5;
  const [rot, setRot] = useState(0);
  const rafRef = useRef<number>();

  useEffect(() => {
    const tick = () => {
      setRot((r) => (r + 0.18 + clarity * 0.5) % 360);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [clarity]);

  // jitter needle
  const jitter = jammed ? 28 : (5 - pinsSolved.filter(Boolean).length) * 10;
  const needleAngle = 45 + clarity * 90;
  const GLYPHS2 = "▓▒░01?#";
  const [glyph, setGlyph] = useState("▓");
  useEffect(() => {
    const t = setInterval(() => setGlyph(GLYPHS2[Math.floor(Math.random() * GLYPHS2.length)]), 150);
    return () => clearInterval(t);
  }, []);

  return (
    <svg viewBox="0 0 520 520" xmlns="http://www.w3.org/2000/svg" className="rm-svg rm-svg--inline" aria-hidden>
      <defs>
        <radialGradient id="rmFaceG2" cx="50%" cy="45%" r="55%">
          <stop offset="0%"  stopColor="#0a1e14" />
          <stop offset="100%" stopColor="#020606" />
        </radialGradient>
        <radialGradient id="rmGlw2" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={jammed ? "#ff3b45" : "#36e0c4"} stopOpacity="0.22" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
        <filter id="gf2"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>

      {/* chassis */}
      <circle cx="260" cy="240" r="238" fill="#0a1010" stroke="#1e3830" strokeWidth="3" />
      <circle cx="260" cy="240" r="234" fill="none" stroke="#36e0c4" strokeWidth="0.8" opacity="0.35" />
      <circle cx="260" cy="240" r="230" fill="url(#rmGlw2)" />
      <circle cx="260" cy="240" r="200" fill="url(#rmFaceG2)" />

      {/* tick marks */}
      {Array.from({ length: 36 }, (_, i) => {
        const a = (i / 36) * 2 * Math.PI - Math.PI / 2;
        const r1 = i % 9 === 0 ? 165 : i % 3 === 0 ? 169 : 173;
        return (
          <line key={i}
            x1={260 + r1 * Math.cos(a)} y1={240 + r1 * Math.sin(a)}
            x2={260 + 180 * Math.cos(a)} y2={240 + 180 * Math.sin(a)}
            stroke={i % 9 === 0 ? "#36e0c4" : "#36e0c430"}
            strokeWidth={i % 9 === 0 ? 2 : 0.8}
          />
        );
      })}

      {/* rotating inner dial */}
      <g transform={`rotate(${rot} 260 240)`}>
        {Array.from({ length: 10 }, (_, i) => {
          const a = (i / 10) * 2 * Math.PI;
          return <line key={i} x1="260" y1="240" x2={260 + 120 * Math.cos(a)} y2={240 + 120 * Math.sin(a)} stroke="#36e0c415" strokeWidth="0.8" />;
        })}
        <circle cx="260" cy="240" r="60" fill="none" stroke="#36e0c420" strokeWidth="0.8" strokeDasharray="3 3" />
        <circle cx="260" cy="240" r="100" fill="none" stroke="#36e0c410" strokeWidth="0.8" />
      </g>

      {/* needle */}
      <g transform={`rotate(${needleAngle + (jammed ? Math.sin(Date.now() / 100) * jitter : 0)} 260 380)`}>
        <line x1="260" y1="380" x2="260" y2="110" stroke="#ffb454" strokeWidth="2.2" strokeLinecap="round" filter="url(#gf2)" opacity={jammed ? 0.45 : 1} />
        <polygon points="260,100 255,120 265,120" fill="#ffb454" />
      </g>
      <circle cx="260" cy="380" r="9" fill="#0a1e14" stroke="#36e0c4" strokeWidth="1.5" />
      <circle cx="260" cy="380" r="4" fill="#36e0c4" />

      {/* scope viewport */}
      <rect x="140" y="272" width="240" height="74" rx="3" fill="#020e06" stroke="#36e0c440" strokeWidth="0.8" />
      {/* scope waveform (static representation; live canvas is in scene) */}
      {Array.from({ length: 60 }, (_, xi) => {
        const x = 140 + (xi / 60) * 240;
        const noise = jammed ? (Math.random() - 0.5) * 60 : (1 - clarity) * (Math.random() - 0.5) * 40;
        const y = 309 + Math.sin((xi / 60) * Math.PI * 4 * (jammed ? 8 : 2)) * 20 * (0.3 + clarity * 0.7) + noise;
        return xi === 0 ? null : (
          <line key={xi}
            x1={140 + ((xi - 1) / 60) * 240} y1={y}
            x2={x} y2={y}
            stroke={jammed ? "#ff3b45" : clarity > 0.7 ? "#36e0c4" : "#ff8050"}
            strokeWidth="1.2" opacity={0.8}
          />
        );
      })}

      {/* label */}
      <text x="260" y="156" textAnchor="middle" fill="#36e0c4" fontSize="11" fontFamily="'VT323',monospace" letterSpacing="3">
        HAWKINS TOWER RADIOMETER
      </text>
      <text x="260" y="170" textAnchor="middle" fill={jammed ? "#ff3b45" : "#ffb454"} fontSize="9.5" fontFamily="'VT323',monospace" letterSpacing="2.5">
        {jammed ? "── SIGNAL JAMMED ──" : `${(87.3 + clarity * 0.3).toFixed(1)} MHz`}
      </text>

      {/* quality arc */}
      <path d="M 80 380 A 190 190 0 0 1 440 380" fill="none" stroke="#36e0c415" strokeWidth="14" strokeLinecap="round" />
      <path d="M 80 380 A 190 190 0 0 1 440 380" fill="none"
        stroke={jammed ? "#ff3b45" : "#36e0c4"} strokeWidth="14" strokeLinecap="round"
        strokeDasharray={`${clarity * 530} 530`}
        opacity={0.65}
        style={{ transition: "stroke-dasharray 0.8s ease" }}
      />

      {/* bolts */}
      {[[28,28],[492,28],[28,452],[492,452]].map(([bx,by],i) => (
        <g key={i}>
          <circle cx={bx} cy={by} r="7" fill="#0a1010" stroke="#36e0c440" strokeWidth="0.8" />
          <line x1={bx-3.5} y1={by} x2={bx+3.5} y2={by} stroke="#36e0c450" strokeWidth="0.8" />
          <line x1={bx} y1={by-3.5} x2={bx+3.5} y2={by+3.5} stroke="#36e0c450" strokeWidth="0.8" />
        </g>
      ))}

      {/* Cinematic beam pulse from task node to restored pin */}
      {cinematicPin !== null && (() => {
        const i = cinematicPin;
        const deg = TASK_ANGLES[i] ?? 180;
        const rad = (deg * Math.PI) / 180;
        const x1 = 260 + 190 * Math.cos(rad);
        const y1 = 240 + 190 * Math.sin(rad);
        const x2 = 100 + i * 80;
        const y2 = 455;
        const midX = (x1 + x2) / 2;
        const midY = 320;
        const d = `M ${x1} ${y1} Q ${midX} ${midY} ${x2} ${y2}`;
        return (
          <g key="cinematic-beam">
            <path
              d={d}
              fill="none"
              stroke="rgba(54,224,196,0.25)"
              strokeWidth="6"
              filter="url(#gf2)"
            />
            <motion.path
              d={d}
              fill="none"
              stroke="#36e0c4"
              strokeWidth="2.5"
              strokeDasharray="16 8"
              animate={{ strokeDashoffset: [100, 0] }}
              transition={{ duration: 0.5, repeat: Infinity, ease: "linear" }}
              filter="url(#gf2)"
            />
            <motion.circle
              r="6"
              fill="#ffb454"
              filter="url(#gf2)"
              initial={{ cx: x1, cy: y1 }}
              animate={{ cx: x2, cy: y2 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </g>
        );
      })()}

      {/* pin slots along bottom */}
      {RADIOMETER_PINS.map((pin, i) => {
        const px = 100 + i * 80;
        const py = 455;
        const solved = pinsSolved[pin.taskIndex];
        const isCinematic = cinematicPin === i;
        return (
          <g key={i}>
            <rect x={px - 26} y={py - 14} width="52" height="28" rx="3"
              fill={solved ? "rgba(54,224,196,0.15)" : "rgba(0,0,0,0.6)"}
              stroke={solved ? "#36e0c4" : "#36e0c430"}
              strokeWidth={solved ? 1.2 : 0.8}
            />
            {/* Scanline sweep animation when solved in cinematic */}
            {isCinematic && (
              <motion.rect
                x={px - 26}
                width="52"
                height="4"
                fill="#36e0c4"
                initial={{ y: py - 14, opacity: 1 }}
                animate={{ y: py + 14, opacity: 0 }}
                transition={{ duration: 0.65, ease: "easeInOut" }}
                filter="url(#gf2)"
              />
            )}
            {/* Expanding pulse shockwave when pin locks in */}
            {isCinematic && (
              <motion.circle
                cx={px}
                cy={py}
                initial={{ r: 4, opacity: 1 }}
                animate={{ r: 35, opacity: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                fill="none"
                stroke="#36e0c4"
                strokeWidth="2"
              />
            )}
            <text x={px} y={py + 5} textAnchor="middle"
              fill={solved ? "#36e0c4" : "#36e0c450"}
              fontSize={solved ? 16 : 12}
              fontFamily="'VT323',monospace"
            >
              {solved ? pin.digit : (i % 2 === 0 ? glyph : "▒")}
            </text>
            {/* LED */}
            <circle cx={px} cy={py + 18} r="3"
              fill={solved ? "#36e0c4" : "#ff3b45"}
            />
          </g>
        );
      })}
    </svg>
  );
}
