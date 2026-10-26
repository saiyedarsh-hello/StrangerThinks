"use client";
import React, { useEffect, useState, useCallback, useRef } from "react";
import { useGame } from "@/lib/store";
import { sfx } from "@/lib/audio";
import SecurityBreachOverlay from "./SecurityBreachOverlay";
import SecurityDisqualifiedScreen from "./SecurityDisqualifiedScreen";

export default function SecurityGuard() {
  const { session, logout, say } = useGame();
  const [isBreachOverlayOpen, setIsBreachOverlayOpen] = useState(false);
  const [breachReason, setBreachReason] = useState("ALT-TAB / WINDOW FOCUS LOSS DETECTED");
  const [clipboardWarning, setClipboardWarning] = useState<string | null>(null);

  // Check if player has already been kicked
  const [isKicked, setIsKicked] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("hawkins_security_kicked") === "true";
    }
    return false;
  });

  const [kickedReason, setKickedReason] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return (
        sessionStorage.getItem("hawkins_kicked_reason") ||
        "MULTIPLE WINDOW FOCUS LOSS / ALT-TAB VIOLATIONS DETECTED (STRIKE 2 OF 2 EXCEEDED)"
      );
    }
    return "MULTIPLE WINDOW FOCUS LOSS / ALT-TAB VIOLATIONS DETECTED (STRIKE 2 OF 2 EXCEEDED)";
  });

  // Read persistent strikes from sessionStorage
  const [strikes, setStrikes] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem("hawkins_security_strikes");
      return stored ? parseInt(stored, 10) : 0;
    }
    return 0;
  });

  const strikesRef = useRef(strikes);
  useEffect(() => {
    strikesRef.current = strikes;
  }, [strikes]);

  const lastViolationTimeRef = useRef<number>(0);

  // Exemption check for tournament administrators
  const isUserAdmin = useCallback(() => {
    if (typeof window === "undefined") return false;
    try {
      if (session?.role === "ADMIN") return true;
      if (
        localStorage.getItem("hawkins_admin_token") ||
        sessionStorage.getItem("hawkins_admin_token") ||
        sessionStorage.getItem("hawkins-protocol:operator")
      ) {
        return true;
      }
      if (window.location.pathname.startsWith("/admin")) return true;
    } catch {}
    return false;
  }, [session?.role]);

  // Dismiss clipboard warning toast
  const showClipboardWarning = useCallback((msg: string) => {
    sfx("err");
    setClipboardWarning(msg);
    setTimeout(() => {
      setClipboardWarning((prev) => (prev === msg ? null : prev));
    }, 3500);
  }, []);

  // Alt-Tab / Focus Loss Handler
  const handleFocusLoss = useCallback(
    (source: string) => {
      if (isUserAdmin()) return;
      if (isKicked) return;

      const now = Date.now();
      // Debounce to prevent blur and visibilitychange from firing on the same single Alt-Tab
      if (now - lastViolationTimeRef.current < 2500) {
        return;
      }
      lastViolationTimeRef.current = now;

      const currentStrikes = strikesRef.current;

      if (currentStrikes === 0) {
        // ── STRIKE 1: 10-Second Countdown Warning ──
        setStrikes(1);
        if (typeof window !== "undefined") {
          sessionStorage.setItem("hawkins_security_strikes", "1");
        }
        setBreachReason(
          source === "alt-tab"
            ? "ALT-TAB SHORTCUT INTERCEPTED"
            : source === "visibility"
            ? "BROWSER TAB HIDDEN / SWITCHED"
            : "WINDOW LOST FOCUS / MINIMIZED"
        );
        setIsBreachOverlayOpen(true);
        sfx("alarm");
        say?.("HAWKINS SECURITY: FOCUS LOSS DETECTED. STRIKE 1 OF 2. 10 SECONDS TO RETURN.");
      } else if (currentStrikes >= 1) {
        // ── STRIKE 2: Immediate Disqualification & Logout ──
        const reasonMsg =
          source === "alt-tab"
            ? "SECOND ALT-TAB DETECTED · MAXIMUM STRIKES EXCEEDED (2/2)"
            : "SECOND WINDOW FOCUS LOSS DETECTED · MAXIMUM STRIKES EXCEEDED (2/2)";

        setStrikes(2);
        setIsBreachOverlayOpen(false);
        setIsKicked(true);
        setKickedReason(reasonMsg);

        if (typeof window !== "undefined") {
          sessionStorage.setItem("hawkins_security_strikes", "2");
          sessionStorage.setItem("hawkins_security_kicked", "true");
          sessionStorage.setItem("hawkins_kicked_reason", reasonMsg);
        }

        sfx("alarm");
        sfx("glitch");
        try {
          logout?.();
        } catch {}
      }
    },
    [isUserAdmin, isKicked, say, logout]
  );

  // Attach global anti-cheat listeners
  useEffect(() => {
    if (isUserAdmin()) return;

    // 1. Block right click / context menu
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      showClipboardWarning("RIGHT-CLICK & INSPECT ARE DISABLED BY SECURITY PROTOCOL");
    };

    // 2. Block clipboard events
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      showClipboardWarning("SECURITY BREACH: COPYING TERMINAL CONTENT IS STRICTLY PROHIBITED");
    };

    const handleCut = (e: ClipboardEvent) => {
      e.preventDefault();
      showClipboardWarning("SECURITY BREACH: CUTTING TERMINAL CONTENT IS PROHIBITED");
    };

    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault();
      showClipboardWarning("SECURITY BREACH: PASTING EXTERNAL DATA IS STRICTLY PROHIBITED");
    };

    // 3. Block text drag
    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
    };

    // 4. Intercept shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      // Intercept Alt-Tab
      if (e.altKey && (e.key === "Tab" || e.keyCode === 9)) {
        e.preventDefault();
        handleFocusLoss("alt-tab");
        return;
      }

      // Intercept F12 (DevTools)
      if (e.key === "F12" || e.keyCode === 123) {
        e.preventDefault();
        showClipboardWarning("SECURITY ALERT: DEVELOPER TOOLS (F12) ACCESS IS PROHIBITED");
        return;
      }

      // Intercept Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C (Inspect Element)
      if (isCtrlOrCmd && e.shiftKey && ["i", "j", "c"].includes(key)) {
        e.preventDefault();
        showClipboardWarning("SECURITY ALERT: INSPECT ELEMENT IS STRICTLY PROHIBITED");
        return;
      }

      // Intercept Ctrl+U (View Source)
      if (isCtrlOrCmd && key === "u") {
        e.preventDefault();
        showClipboardWarning("SECURITY ALERT: VIEW SOURCE CODE IS DISABLED");
        return;
      }

      // Intercept Copy / Cut / Paste shortcuts
      if (isCtrlOrCmd && ["c", "v", "x"].includes(key)) {
        e.preventDefault();
        showClipboardWarning("SECURITY ALERT: CLIPBOARD SHORTCUTS ARE DISABLED");
        return;
      }
    };

    // 5. Window Blur & Visibility Change
    const handleBlur = () => {
      handleFocusLoss("blur");
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleFocusLoss("visibility");
      }
    };

    window.addEventListener("contextmenu", handleContextMenu, { capture: true });
    window.addEventListener("copy", handleCopy, { capture: true });
    window.addEventListener("cut", handleCut, { capture: true });
    window.addEventListener("paste", handlePaste, { capture: true });
    window.addEventListener("dragstart", handleDragStart, { capture: true });
    window.addEventListener("keydown", handleKeyDown, { capture: true });
    window.addEventListener("blur", handleBlur);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    document.body.classList.add("hawkins-player-secured");

    return () => {
      window.removeEventListener("contextmenu", handleContextMenu, { capture: true });
      window.removeEventListener("copy", handleCopy, { capture: true });
      window.removeEventListener("cut", handleCut, { capture: true });
      window.removeEventListener("paste", handlePaste, { capture: true });
      window.removeEventListener("dragstart", handleDragStart, { capture: true });
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.body.classList.remove("hawkins-player-secured");
    };
  }, [isUserAdmin, handleFocusLoss, showClipboardWarning]);

  // Anti-Inspect debugger trap & DevTools monitor
  useEffect(() => {
    if (isUserAdmin()) return;

    const trapInterval = setInterval(() => {
      const startTime = performance.now();
      try {
        (function () {
          return false;
        })["constructor"]("debugger")();
      } catch {}
      const endTime = performance.now();
      if (endTime - startTime > 100) {
        showClipboardWarning("SECURITY ALERT: DEVTOOLS DETECTED · ACTIVE SURVEILLANCE RUNNING");
      }
    }, 1500);

    const consoleClear = setInterval(() => {
      try {
        console.clear();
      } catch {}
    }, 4000);

    return () => {
      clearInterval(trapInterval);
      clearInterval(consoleClear);
    };
  }, [isUserAdmin, showClipboardWarning]);

  if (isUserAdmin()) return null;

  // If player is kicked, immediately render the Disqualified Screen
  if (isKicked) {
    return (
      <SecurityDisqualifiedScreen
        reason={kickedReason}
        onAdminReset={() => {
          setIsKicked(false);
          setStrikes(0);
          if (typeof window !== "undefined") {
            sessionStorage.removeItem("hawkins_security_kicked");
            sessionStorage.removeItem("hawkins_kicked_reason");
            sessionStorage.removeItem("hawkins_security_strikes");
          }
        }}
      />
    );
  }

  return (
    <>
      <style jsx global>{`
        body.hawkins-player-secured {
          user-select: none !important;
          -webkit-user-select: none !important;
          -moz-user-select: none !important;
          -ms-user-select: none !important;
        }
        body.hawkins-player-secured input,
        body.hawkins-player-secured textarea {
          user-select: text !important;
          -webkit-user-select: text !important;
        }
        @keyframes pulseRedAlert {
          0% { box-shadow: 0 0 15px rgba(239, 68, 68, 0.4); }
          100% { box-shadow: 0 0 35px rgba(239, 68, 68, 0.9); }
        }
      `}</style>

      {/* Floating Clipboard / Shortcut Warning Toast */}
      {clipboardWarning && (
        <div
          style={{
            position: "fixed",
            top: "24px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 9999998,
            background: "linear-gradient(180deg, #7f1d1d 0%, #450a0a 100%)",
            border: "1.5px solid #ef4444",
            borderRadius: "4px",
            color: "#fecaca",
            padding: "12px 24px",
            fontFamily: "'Courier New', Courier, monospace",
            fontSize: "12px",
            fontWeight: 900,
            letterSpacing: ".08em",
            boxShadow: "0 0 30px rgba(239, 68, 68, 0.8)",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            animation: "pulseRedAlert 0.8s infinite alternate",
            pointerEvents: "none",
          }}
        >
          <span style={{ fontSize: "18px" }}>⚠️</span>
          <span>{clipboardWarning}</span>
        </div>
      )}

      {/* Persistent Strike 1 Status Badge on HUD */}
      {strikes === 1 && !isBreachOverlayOpen && (
        <div
          style={{
            position: "fixed",
            bottom: "16px",
            right: "16px",
            zIndex: 99999,
            background: "rgba(127, 29, 29, 0.95)",
            border: "1.5px solid #ef4444",
            borderRadius: "4px",
            color: "#fecaca",
            padding: "8px 14px",
            fontFamily: "'Courier New', Courier, monospace",
            fontSize: "11px",
            fontWeight: 900,
            letterSpacing: ".08em",
            boxShadow: "0 0 15px rgba(239, 68, 68, 0.5)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#ef4444", boxShadow: "0 0 8px #ef4444" }} />
          <span>SECURITY STRIKE: 1/2 · NEXT ALT-TAB TERMINATES SESSION</span>
        </div>
      )}

      {/* 10-Second Countdown Security Breach Modal for Strike 1 */}
      <SecurityBreachOverlay
        isOpen={isBreachOverlayOpen}
        onAcknowledge={() => setIsBreachOverlayOpen(false)}
        strikeNumber={strikes}
        maxStrikes={2}
        reason={breachReason}
        teamName={session?.teamName}
      />
    </>
  );
}
