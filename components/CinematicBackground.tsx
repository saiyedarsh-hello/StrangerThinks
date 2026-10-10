"use client";
import React, { useMemo } from "react";
import { motion } from "framer-motion";
import Particles from "./Particles";

export const CINEMATIC_BACKGROUNDS = [
  "/hawkins-town-bg.jpg",
  "/hawkins-lab-bg.jpg",
  "/hawkins-police-bg.jpg",
  "/hawkins-gate-bg.jpg",
] as const;

export type BackgroundKey = (typeof CINEMATIC_BACKGROUNDS)[number];

interface CinematicBackgroundProps {
  src?: string | "random";
  videoSrc?: string;
  particles?: "spores" | "embers" | "dust" | "none";
  particleCount?: number;
  vignette?: "none" | "light" | "medium" | "heavy";
  overlayOpacity?: number;
}

export default function CinematicBackground({
  src = "random",
  videoSrc,
  particles = "spores",
  particleCount = 55,
  vignette = "medium",
  overlayOpacity = 0.72,
}: CinematicBackgroundProps) {
  // Deterministic or stable random selection per component instance
  const chosenSrc = useMemo(() => {
    if (src && src !== "random") return src;
    const idx = Math.floor(Math.random() * CINEMATIC_BACKGROUNDS.length);
    return CINEMATIC_BACKGROUNDS[idx];
  }, [src]);

  const vignetteGradient = useMemo(() => {
    if (vignette === "none") return "none";
    if (vignette === "heavy") {
      return "radial-gradient(ellipse at 50% 50%, rgba(10, 4, 8, 0.55) 0%, rgba(0, 0, 0, 0.92) 85%), linear-gradient(180deg, rgba(0,0,0,0.85) 0%, transparent 40%, rgba(0,0,0,0.92) 100%)";
    }
    if (vignette === "light") {
      return "radial-gradient(ellipse at 50% 50%, rgba(10, 4, 8, 0.25) 0%, rgba(0, 0, 0, 0.7) 85%), linear-gradient(180deg, rgba(0,0,0,0.5) 0%, transparent 50%, rgba(0,0,0,0.7) 100%)";
    }
    // medium default
    return "radial-gradient(ellipse at 50% 50%, rgba(10, 4, 8, 0.38) 0%, rgba(0, 0, 0, 0.82) 85%), linear-gradient(180deg, rgba(0,0,0,0.7) 0%, transparent 45%, rgba(0,0,0,0.86) 100%)";
  }, [vignette]);

  return (
    <>
      {/* Cinematic Photorealistic Background with slow breathing zoom */}
      <div
        className="layer"
        style={{
          position: "absolute",
          inset: 0,
          overflow: "hidden",
          zIndex: 1,
          pointerEvents: "none",
        }}
      >
        {videoSrc ? (
          <video
            autoPlay
            loop
            muted
            playsInline
            poster={chosenSrc}
            ref={(el) => {
              if (el) {
                el.muted = true;
                el.play().catch(() => {});
              }
            }}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center center",
              filter: `brightness(${overlayOpacity}) contrast(1.15)`,
            }}
          >
            <source src={videoSrc} type="video/mp4" />
            {videoSrc.endsWith(".mp4") && (
              <source src={videoSrc.replace(".mp4", ".webm")} type="video/webm" />
            )}
            <img
              src={chosenSrc}
              alt="Stranger Things Scene"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "center center",
              }}
            />
          </video>
        ) : (
          <motion.img
            key={chosenSrc}
            src={chosenSrc}
            alt="Stranger Things Scene"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center center",
              filter: `brightness(${overlayOpacity}) contrast(1.15)`,
            }}
            initial={{ opacity: 0.2, scale: 1.04 }}
            animate={{ opacity: 1, scale: [1.04, 1.07, 1.04] }}
            transition={{
              opacity: { duration: 0.5 },
              scale: { duration: 22, repeat: Infinity, ease: "easeInOut" },
            }}
          />
        )}
      </div>

      {/* Floating Upside Down Spores/Embers */}
      {particles !== "none" && (
        <div className="layer" style={{ zIndex: 2, pointerEvents: "none" }}>
          <Particles
            mode={particles}
            count={particleCount}
            color={particles === "spores" ? "255,95,75" : "255,180,100"}
          />
        </div>
      )}

      {/* Atmospheric dark red/noir vignette & depth overlay */}
      <div
        className="layer"
        style={{
          zIndex: 3,
          background: vignetteGradient,
          pointerEvents: "none",
        }}
      />
    </>
  );
}
