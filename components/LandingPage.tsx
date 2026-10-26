"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGame } from "@/lib/store";
import { sfx } from "@/lib/audio";
import { authenticateTeamWithTiDB } from "@/lib/tidbService";
import { saveSession } from "@/lib/config";
import CinematicBackground from "./CinematicBackground";
import RedLightningCanvas from "./RedLightningCanvas";
import { unlockAudio } from "./IntroLightning";

interface LandingPageProps {
  onEnterVecna?: () => void;
}

/**
 * Clean, calibrated Stranger Things Logo Lockup with bolder typography & refined contour glow
 */
function StrangerThingsLogo({ flashLevel = 0 }: { flashLevel?: number }) {
  const fontStack =
    '"ITC Benguiat Std", "Benguiat", "Benguiat Bold Condensed", "Libre Caslon Display", "Playfair Display", Georgia, serif';

  const barShadow =
    flashLevel > 0
      ? "0 0 8px rgba(230, 26, 40, 0.8), 0 2px 8px rgba(0, 0, 0, 0.9)"
      : "0 0 4px rgba(230, 26, 40, 0.55), 0 2px 6px rgba(0, 0, 0, 0.85)";

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        userSelect: "none",
        width: "min(96vw, 1360px)",
        margin: "0 auto clamp(14px, 2.2vh, 28px) auto",
        filter:
          flashLevel > 0
            ? "drop-shadow(0 0 16px rgba(230, 26, 40, 0.9)) drop-shadow(0 8px 30px rgba(0, 0, 0, 0.98))"
            : "drop-shadow(0 0 8px rgba(230, 26, 40, 0.6)) drop-shadow(0 6px 24px rgba(0, 0, 0, 0.95))",
        transition: "filter 0.08s ease-out",
      }}
    >
      {/* Top Word: S - TRANGE - R */}
      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          width: "100%",
          lineHeight: 0.85,
        }}
      >
        {/* Top Horizontal Red Bar bridging over TRANGE */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: "14%",
            right: "14%",
            height: "clamp(7px, 0.85vw, 11px)",
            background: "#e61a28",
            boxShadow: barShadow,
            borderRadius: "1px",
            transition: "box-shadow 0.08s ease-out",
          }}
        />

        {/* Large 'S' */}
        <span
          style={{
            fontFamily: fontStack,
            fontSize: "clamp(6.8rem, min(16vw, 22vh), 15.5rem)",
            fontWeight: 900,
            color: "#e61a28",
            WebkitTextStroke: "clamp(5px, 0.6vw, 7.5px) #ff2a3a",
            paintOrder: "stroke fill",
            letterSpacing: "-0.02em",
            transform: "translateY(12%)",
            zIndex: 2,
          }}
        >
          S
        </span>

        {/* Middle 'TRANGE' */}
        <span
          style={{
            fontFamily: fontStack,
            fontSize: "clamp(5.2rem, min(12.2vw, 17vh), 11.8rem)",
            fontWeight: 900,
            color: "#e61a28",
            WebkitTextStroke: "clamp(5px, 0.6vw, 7.5px) #ff2a3a",
            paintOrder: "stroke fill",
            letterSpacing: "0.01em",
            paddingTop: "clamp(12px, 1.8vh, 22px)",
            zIndex: 1,
          }}
        >
          TRANGE
        </span>

        {/* Large 'R' */}
        <span
          style={{
            fontFamily: fontStack,
            fontSize: "clamp(6.8rem, min(16vw, 22vh), 15.5rem)",
            fontWeight: 900,
            color: "#e61a28",
            WebkitTextStroke: "clamp(5px, 0.6vw, 7.5px) #ff2a3a",
            paintOrder: "stroke fill",
            letterSpacing: "-0.02em",
            transform: "translateY(12%)",
            zIndex: 2,
          }}
        >
          R
        </span>
      </div>

      {/* Bottom Row: [Left Bar] THINGS [Right Bar] */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          marginTop: "clamp(8px, 1.2vh, 16px)",
          gap: "clamp(12px, 2.8vw, 32px)",
        }}
      >
        {/* Left Flanking Bar */}
        <div
          style={{
            flex: 1,
            height: "clamp(7px, 0.85vw, 11px)",
            background: "#e61a28",
            boxShadow: barShadow,
            borderRadius: "1px",
            transition: "box-shadow 0.08s ease-out",
          }}
        />

        {/* Center 'THINGS' */}
        <span
          style={{
            fontFamily: fontStack,
            fontSize: "clamp(5.2rem, min(12.2vw, 17vh), 11.8rem)",
            fontWeight: 900,
            lineHeight: 0.9,
            color: "#e61a28",
            WebkitTextStroke: "clamp(5px, 0.6vw, 7.5px) #ff2a3a",
            paintOrder: "stroke fill",
            letterSpacing: "0.02em",
            whiteSpace: "nowrap",
          }}
        >
          THINGS
        </span>

        {/* Right Flanking Bar */}
        <div
          style={{
            flex: 1,
            height: "clamp(7px, 0.85vw, 11px)",
            background: "#e61a28",
            boxShadow: barShadow,
            borderRadius: "1px",
            transition: "box-shadow 0.08s ease-out",
          }}
        />
      </div>
    </div>
  );
}

export default function LandingPage(_props: LandingPageProps) {
  const { loginPlayer, loginSession, setSoundOn } = useGame();

  const [flashLevel, setFlashLevel] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [leaderName, setLeaderName] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordRequired, setIsPasswordRequired] = useState(false);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  type Phase = "storm" | "title" | "ready";
  const [phase, setPhase] = useState<Phase>("ready");
  const titleIn = true;

  // Seamless audio unlock on first user click or keypress
  useEffect(() => {
    const handleGesture = () => {
      unlockAudio();
      setSoundOn(true);
    };
    window.addEventListener("click", handleGesture, { once: true });
    window.addEventListener("keydown", handleGesture, { once: true });
    return () => {
      window.removeEventListener("click", handleGesture);
      window.removeEventListener("keydown", handleGesture);
    };
  }, [setSoundOn]);

  const handleOpenAuth = () => {
    sfx("click");
    setSoundOn(true);
    setShowModal(true);
  };

  const handleCloseAuth = () => {
    sfx("click");
    setShowModal(false);
    setError(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim() || !leaderName.trim()) return;

    const isAdminAttempt = teamName.trim().toLowerCase() === "admin bolte";
    if (isAdminAttempt && isPasswordRequired && !password.trim()) {
      setError(true);
      setErrorMessage("SECURITY CLEARANCE PASSWORD REQUIRED");
      return;
    }

    if (!isAdminAttempt && typeof document !== "undefined" && !document.fullscreenElement) {
      try {
        document.documentElement.requestFullscreen?.().catch(() => {});
      } catch {}
    }

    setIsAuthenticating(true);
    setError(false);

    try {
      const authResult = await authenticateTeamWithTiDB(teamName, leaderName, password);

      if (authResult.requiresPassword) {
        setIsPasswordRequired(true);
        setError(false);
        setIsAuthenticating(false);
        return;
      }

      if (authResult.success && authResult.session) {
        setError(false);
        sfx("boom");

        if (authResult.session.role === "ADMIN") {
          loginSession({ ...authResult.session, token: authResult.token });
        } else if (authResult.session.role === "VECNA") {
          loginSession({ ...authResult.session, token: authResult.token });
        } else {
          loginPlayer({
            id: authResult.session.teamId || "T01",
            teamName: authResult.session.teamName,
            leaderName: authResult.session.leaderName,
            token: authResult.token,
            totalScore: authResult.team?.totalScore,
            breakdown: authResult.team?.breakdown,
            penalty: authResult.team?.penalty,
            completedTasks: authResult.team?.completedTasks,
            solvedChapters: authResult.team?.solvedChapters,
            taskScores: authResult.team?.taskScores,
            unlockedLocations: authResult.team?.unlockedLocations,
            storyProgress: authResult.team?.storyProgress,
          });
        }
      } else {
        setError(true);
        setErrorMessage(authResult.error || "UNKNOWN TEAM CREDENTIALS");
        sfx("err");
      }
    } catch (err: any) {
      setError(true);
      setErrorMessage(err.message || "DATABASE CONNECTION ERROR");
      sfx("err");
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <div
      className="screen"
      style={{
        position: "fixed",
        inset: 0,
        height: "100vh",
        maxHeight: "100vh",
        width: "100vw",
        maxWidth: "100vw",
        margin: 0,
        padding: 0,
        border: "none",
        outline: "none",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden",
        backgroundColor: "#05080b",
        background: "#05080b",
      }}
    >
      {/* Cinematic Photorealistic Hawkins Road Background */}
      <CinematicBackground
        src="/hawkins-town-bg.jpg"
        particles="none"
        vignette="medium"
        overlayOpacity={0.42}
      />

      {/* Realistic Procedural Red Lightning & Embers Canvas (Layered behind text) */}
      <RedLightningCanvas density="normal" onFlash={(intensity) => setFlashLevel(intensity)} />

      {/* Subtle Atmospheric Dark Vignette Layer */}
      <div
        className="layer"
        style={{
          zIndex: 3,
          pointerEvents: "none",
          opacity: 1,
          background:
            "radial-gradient(circle at 50% 50%, transparent 35%, rgba(0, 0, 0, 0.78) 100%), linear-gradient(180deg, rgba(0,0,0,0.45) 0%, transparent 50%, rgba(0,0,0,0.85) 100%)",
        }}
      />

      {/* CENTER STRANGER THINGS TITLE & ENTER CTA */}
      <main
        style={{
          position: "relative",
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "clamp(10px, 2vh, 20px) 16px",
          width: "100%",
          maxWidth: "100%",
          boxSizing: "border-box",
        }}
      >
        <motion.div
          initial={{ opacity: 0.85, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            duration: 0.5,
            ease: "easeOut",
          }}
        >
          <StrangerThingsLogo flashLevel={flashLevel} />
        </motion.div>

        {/* SINGLE MINIMAL ENTER BUTTON (Matches Uploaded Image, No Arrow) */}
        <motion.button
          id="enter-btn"
          initial={{ opacity: 0.9, y: 0 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          whileHover={{
            scale: 1.05,
            backgroundColor: "#7a0a12",
            borderColor: "#a6121c",
            boxShadow: "0 0 32px rgba(255, 34, 48, 0.8), inset 0 0 16px rgba(0, 0, 0, 0.5)",
          }}
          whileTap={{ scale: 0.96 }}
          onClick={handleOpenAuth}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            marginTop: "clamp(32px, 5.2vh, 56px)",
            padding: "clamp(14px, 1.9vh, 18px) clamp(46px, 5.5vw, 68px)",
            background: "#ff2230",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            border: "1.5px solid #ff5964",
            borderRadius: "2px",
            color: "#ffffff",
            fontFamily:
              '"ITC Benguiat Std", "Benguiat", "Benguiat Bold Condensed", "Libre Caslon Display", "Playfair Display", Georgia, serif',
            fontSize: "clamp(16px, 1.8vw, 22px)",
            fontWeight: 900,
            letterSpacing: "0.25em",
            cursor: "pointer",
            pointerEvents: "auto",
            boxShadow:
              "0 0 28px rgba(255, 34, 48, 0.65), inset 0 0 14px rgba(255, 255, 255, 0.25)",
            transition: "all 0.3s ease",
          }}
        >
          <span>ENTER</span>
        </motion.button>
      </main>

      {/* AUTHENTICATION / ENTER PROTOCOL MODAL */}
      <AnimatePresence>
        {showModal && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 9999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(0, 0, 0, 0.85)",
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
              padding: "20px",
            }}
            onClick={handleCloseAuth}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ duration: 0.3 }}
              style={{
                width: "min(460px, 94vw)",
                background: "rgba(12, 6, 10, 0.96)",
                border: "1.5px solid rgba(255, 45, 58, 0.5)",
                boxShadow:
                  "0 25px 60px rgba(0, 0, 0, 0.95), 0 0 30px rgba(255, 45, 58, 0.2)",
                padding: "36px 32px",
                position: "relative",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={handleCloseAuth}
                style={{
                  position: "absolute",
                  top: "16px",
                  right: "16px",
                  color: "rgba(255, 255, 255, 0.5)",
                  fontSize: "20px",
                  cursor: "pointer",
                  background: "none",
                  border: "none",
                }}
              >
                ✕
              </button>

              <div style={{ textAlign: "center", marginBottom: "26px" }}>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "12px",
                    letterSpacing: "0.3em",
                    color: "#ff3b45",
                    marginBottom: "6px",
                  }}
                >
                  TRANSMISSION CREDENTIALS
                </div>
                <h3
                  style={{
                    fontFamily:
                      '"ITC Benguiat Std", "Benguiat", "Libre Caslon Display", "Playfair Display", serif',
                    fontSize: "26px",
                    color: "#ffffff",
                    letterSpacing: "0.05em",
                    margin: 0,
                  }}
                >
                  ENTER THE PROTOCOL
                </h3>
              </div>

              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: "18px" }}>
                  <label
                    style={{
                      display: "block",
                      fontFamily: "var(--font-mono)",
                      fontSize: "12px",
                      letterSpacing: "0.2em",
                      color: "rgba(255, 255, 255, 0.7)",
                      marginBottom: "6px",
                    }}
                  >
                    TEAM NAME
                  </label>
                  <input
                    value={teamName}
                    onChange={(e) => {
                      setTeamName(e.target.value);
                      if (error) setError(false);
                    }}
                    placeholder="ENTER TEAM NAME..."
                    maxLength={40}
                    autoFocus
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      background: "rgba(0, 0, 0, 0.6)",
                      border: error
                        ? "1.5px solid #ff2d3a"
                        : "1px solid rgba(255, 255, 255, 0.2)",
                      color: "#ffffff",
                      fontFamily: "var(--font-mono)",
                      fontSize: "16px",
                      letterSpacing: "0.1em",
                      outline: "none",
                    }}
                  />
                </div>

                <div style={{ marginBottom: "20px" }}>
                  <label
                    style={{
                      display: "block",
                      fontFamily: "var(--font-mono)",
                      fontSize: "12px",
                      letterSpacing: "0.2em",
                      color: "rgba(255, 255, 255, 0.7)",
                      marginBottom: "6px",
                    }}
                  >
                    TEAM LEADER NAME
                  </label>
                  <input
                    value={leaderName}
                    onChange={(e) => {
                      setLeaderName(e.target.value);
                      if (error) setError(false);
                    }}
                    placeholder="ENTER LEADER NAME..."
                    maxLength={40}
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      background: "rgba(0, 0, 0, 0.6)",
                      border: error
                        ? "1.5px solid #ff2d3a"
                        : "1px solid rgba(255, 255, 255, 0.2)",
                      color: "#ffffff",
                      fontFamily: "var(--font-mono)",
                      fontSize: "16px",
                      letterSpacing: "0.1em",
                      outline: "none",
                    }}
                  />
                </div>

                {(isPasswordRequired || teamName.trim().toLowerCase() === "admin bolte") && (
                  <div style={{ marginBottom: "20px" }}>
                    <label
                      style={{
                        display: "block",
                        fontFamily: "var(--font-mono)",
                        fontSize: "12px",
                        letterSpacing: "0.2em",
                        color: "#ff2d3a",
                        marginBottom: "6px",
                      }}
                    >
                      CLEARANCE PASSWORD
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (error) setError(false);
                      }}
                      placeholder="ENTER CLEARANCE PASSWORD..."
                      maxLength={64}
                      autoFocus
                      style={{
                        width: "100%",
                        padding: "12px 16px",
                        background: "rgba(0, 0, 0, 0.6)",
                        border: error
                          ? "1.5px solid #ff2d3a"
                          : "1px solid rgba(255, 45, 58, 0.6)",
                        color: "#ffffff",
                        fontFamily: "var(--font-mono)",
                        fontSize: "16px",
                        letterSpacing: "0.1em",
                        outline: "none",
                      }}
                    />
                  </div>
                )}

                {error && (
                  <div
                    style={{
                      color: "#ff2d3a",
                      marginBottom: "18px",
                      padding: "10px",
                      background: "rgba(255, 45, 58, 0.12)",
                      border: "1px solid #ff2d3a",
                      fontSize: "13px",
                      fontFamily: "var(--font-mono)",
                      textAlign: "center",
                      letterSpacing: "0.1em",
                    }}
                  >
                    [ACCESS DENIED] {errorMessage}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={
                    !teamName.trim() ||
                    !leaderName.trim() ||
                    ((isPasswordRequired || teamName.trim().toLowerCase() === "admin bolte") && !password.trim()) ||
                    isAuthenticating
                  }
                  style={{
                    width: "100%",
                    padding: "14px",
                    background: "#ff2d3a",
                    border: "none",
                    color: "#ffffff",
                    fontFamily: "var(--font-mono)",
                    fontSize: "15px",
                    fontWeight: 800,
                    letterSpacing: "0.2em",
                    cursor: "pointer",
                    opacity: isAuthenticating ? 0.7 : 1,
                    transition: "opacity 0.2s ease",
                  }}
                >
                  {isAuthenticating
                    ? "AUTHENTICATING..."
                    : "CONFIRM & ENTER"}
                </button>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
