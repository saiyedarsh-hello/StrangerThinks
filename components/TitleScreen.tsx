"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import { useGame } from "@/lib/store";
import { setMuted, sfx } from "@/lib/audio";
import HawkinsScene from "./scenes/HawkinsScene";

function Letters({ text, delay = 0, size }: { text: string; delay?: number; size: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", gap: "0.04em", fontSize: size, flexWrap: "wrap" }}>
      {text.split("").map((c, i) => c === " " ? <span key={i} style={{ width: "0.32em" }} /> : (
        <motion.span
          key={i} className="title-xl"
          style={{ display: "inline-block", color: "#ff3b45" }}
          initial={{ opacity: 0, y: 40, scale: 1.4, filter: "blur(14px)" }}
          animate={{ opacity: [0, 1, 0.3, 1, 0.6, 1], y: 0, scale: 1, filter: "blur(0px)" }}
          transition={{ duration: 1.4, delay: delay + i * 0.11 }}
        >
          <span className="flick" style={{ animationDelay: `${(i * 0.7) % 3}s` }}>{c}</span>
        </motion.span>
      ))}
    </div>
  );
}

export default function TitleScreen() {
  const { start, setSoundOn } = useGame();
  return (
    <div className="screen" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="layer"><HawkinsScene /></div>
      {/* Atmospheric red gradient overlay */}
      <div className="layer" style={{ background: "radial-gradient(ellipse at 50% 55%, rgba(255,30,45,.22), transparent 62%), linear-gradient(180deg, rgba(0,0,0,.55), rgba(0,0,0,.2) 40%, rgba(0,0,0,.8))" }} />
      <div className="content" style={{ textAlign: "center", padding: 24 }}>
        <motion.div className="eyebrow" initial={{ opacity: 0, letterSpacing: "1.2em" }} animate={{ opacity: 1, letterSpacing: "0.55em" }} transition={{ duration: 2, delay: 0.2 }}>
          Indiana · 1986 · Classified
        </motion.div>
        <div style={{ margin: "26px 0 8px" }}>
          <Letters text="THE HAWKINS" size="clamp(44px, 10.5vw, 150px)" delay={0.6} />
          <Letters text="PROTOCOL" size="clamp(44px, 10.5vw, 150px)" delay={1.6} />
        </div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 3, duration: 1.5 }} className="term dim" style={{ letterSpacing: ".35em", fontSize: 24 }}>
          A STORY-DRIVEN CODING ADVENTURE
        </motion.div>
        {/* Decorative horizontal rule */}
        <motion.div
          initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 3.2, duration: 1.4, ease: "easeOut" }}
          style={{ height: 1, width: "min(360px,60vw)", margin: "22px auto 0", background: "linear-gradient(90deg,transparent,#ff3b45,transparent)", transformOrigin: "center" }}
        />
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 3.4, duration: 1 }} style={{ marginTop: 46, display: "flex", flexDirection: "column", gap: 14, alignItems: "center" }}>
          <button
            id="press-start-btn"
            className="btn big pulse-cta"
            onClick={() => {
              setSoundOn(true);
              setMuted(false);
              sfx("boom");
              if (typeof document !== "undefined" && !document.fullscreenElement) {
                try {
                  document.documentElement.requestFullscreen?.().catch(() => {});
                } catch {}
              }
              start();
            }}
          >
            ▶ PRESS START
          </button>
          <div style={{ display: "flex", gap: 14 }}>
            <Link href="/leaderboard"><button className="btn sm ghost" id="leaderboard-btn">Leaderboard</button></Link>
            <Link href="/"><button className="btn sm ghost red" id="organizer-btn">Organizer</button></Link>
          </div>
        </motion.div>
      </div>
      <motion.div
        className="term dim"
        style={{ position: "absolute", bottom: 16, width: "100%", textAlign: "center", fontSize: 16, letterSpacing: ".2em", zIndex: 5 }}
        initial={{ opacity: 0 }} animate={{ opacity: 0.6 }} transition={{ delay: 4.2, duration: 1.5 }}
      >
        BEST EXPERIENCED FULLSCREEN · CLICK SOUND ON · HEADPHONES RECOMMENDED
      </motion.div>
    </div>
  );
}
