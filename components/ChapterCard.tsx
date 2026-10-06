"use client";
import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useGame } from "@/lib/store";
import { STAGES } from "@/lib/stages";
import { sfx } from "@/lib/audio";
import Glitch from "./Glitch";

export default function ChapterCard() {
  const { cutscene, endCutscene } = useGame();
  useEffect(() => {
    if (!cutscene) return;
    sfx(cutscene === "upsidedown" ? "gate" : "glitch");
    const t = setTimeout(endCutscene, cutscene === "ending" ? 3200 : 4500);
    return () => clearTimeout(t);
  }, [cutscene, endCutscene]);

  const st = cutscene ? STAGES[cutscene] : null;
  const upside = st?.theme === "upside";
  return (
    <AnimatePresence>
      {st && (
        <motion.div
          key={st.id}
          className="card-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, filter: "blur(10px)" }}
          transition={{ duration: 0.6 }}
          onClick={endCutscene}
          style={{ background: upside ? "#0a0002" : "#000", cursor: "pointer" }}
        >
          {/* Animated background glow */}
          <motion.div
            style={{
              position: "absolute", inset: 0,
              background: upside
                ? "radial-gradient(ellipse at 50% 50%, rgba(120,0,20,.6), transparent 70%)"
                : "radial-gradient(ellipse at 50% 50%, rgba(40,10,0,.4), transparent 70%)",
            }}
            initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0.6] }} transition={{ duration: 2 }}
          />
          {/* Scanline effect on card */}
          <div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(to bottom, rgba(0,0,0,0) 0, rgba(0,0,0,0) 2px, rgba(0,0,0,0.15) 3px, rgba(0,0,0,0) 4px)", pointerEvents: "none" }} />

          <motion.div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(14px, 1.8vw, 20px)",
              color: "#36e0c4",
              letterSpacing: "0.55em",
              textTransform: "uppercase",
              marginBottom: "16px",
            }}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, delay: 0.2 }}
          >
            {st.chapter}
          </motion.div>

          <motion.h1
            style={{
              fontFamily:
                '"ITC Benguiat Std", "Benguiat", "Benguiat Bold Condensed", "Libre Caslon Display", "Playfair Display", Georgia, serif',
              fontSize: "clamp(3.8rem, 10vw, 8rem)",
              fontWeight: 900,
              background: "linear-gradient(180deg, #ff71ce 0%, #ff2d3a 52%, #b7121f 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              filter: "drop-shadow(0 0 18px rgba(255, 45, 58, 0.75))",
              letterSpacing: "-0.01em",
              margin: "0 0 12px 0",
              lineHeight: 1,
              textTransform: "uppercase",
            }}
            initial={{ opacity: 0, scale: 1.15, filter: "blur(14px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            transition={{ duration: 1.4, delay: 0.5 }}
          >
            {st.title}
          </motion.h1>

          <motion.div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(13px, 1.4vw, 17px)",
              color: "rgba(215, 235, 240, 0.75)",
              letterSpacing: "0.25em",
              marginBottom: "28px",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.4, duration: 1 }}
          >
            {st.subtitle}
          </motion.div>

          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.8, duration: 1.6, ease: "easeInOut" }}
            style={{
              height: 2,
              width: "min(560px, 75vw)",
              background: "linear-gradient(90deg, transparent, #ff2d3a, transparent)",
              boxShadow: "0 0 14px rgba(255, 45, 58, 0.85)",
            }}
          />

          <motion.div
            className="term dim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            transition={{ delay: 2.5, duration: 0.8 }}
            style={{ position: "absolute", bottom: 28, fontSize: 14, letterSpacing: ".35em" }}
          >
            CLICK TO CONTINUE
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
