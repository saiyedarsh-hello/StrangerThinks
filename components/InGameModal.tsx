"use client";
import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGame, InGameModalConfig } from "@/lib/store";
import { sfx } from "@/lib/audio";

export default function InGameModal() {
  const { modal, closeModal } = useGame();

  useEffect(() => {
    if (!modal) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (modal.onCancel) {
          modal.onCancel();
        } else {
          closeModal();
        }
      } else if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (modal.onConfirm) {
          modal.onConfirm();
        } else {
          closeModal();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [modal, closeModal]);

  if (!modal) return null;

  const isDanger = modal.type === "danger";
  const isWarning = modal.type === "warning";
  const hasCancel = Boolean(modal.onCancel || modal.cancelLabel);

  const accentColor = isDanger
    ? "#ff2d3a"
    : isWarning
    ? "#f59e0b"
    : "#e61a28";

  const glowShadow = isDanger
    ? "0 0 24px rgba(255, 45, 58, 0.45)"
    : isWarning
    ? "0 0 24px rgba(245, 158, 11, 0.4)"
    : "0 0 24px rgba(230, 26, 40, 0.35)";

  const titleText =
    modal.title ||
    (isDanger
      ? "HAWKINS SECURITY // CRITICAL ALERT"
      : isWarning
      ? "HAWKINS TELEMETRY // CAUTION"
      : "HAWKINS PROTOCOL DIRECTIVE");

  return (
    <AnimatePresence>
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 99999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "16px",
          background: "rgba(8, 2, 5, 0.82)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
        }}
        onClick={() => {
          if (modal.onCancel) {
            modal.onCancel();
          } else {
            closeModal();
          }
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 10 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "relative",
            width: "100%",
            maxWidth: "480px",
            background: "linear-gradient(180deg, #18070a 0%, #0c0305 100%)",
            border: `2px solid ${accentColor}`,
            borderRadius: "6px",
            boxShadow: `${glowShadow}, 0 20px 50px rgba(0, 0, 0, 0.9)`,
            padding: "20px 24px 22px",
            boxSizing: "border-box",
            color: "#f3e8dc",
            fontFamily: "'Courier New', Courier, monospace",
          }}
        >
          {/* Subtle Top Red Accent Line */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: "10%",
              right: "10%",
              height: "2px",
              background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
            }}
          />

          {/* Subheader Header Badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 10,
              borderBottom: "1px dashed rgba(255, 255, 255, 0.15)",
              paddingBottom: 8,
            }}
          >
            <div
              style={{
                fontSize: 10.5,
                fontWeight: 900,
                letterSpacing: ".14em",
                color: accentColor,
                textTransform: "uppercase",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: accentColor,
                  boxShadow: `0 0 8px ${accentColor}`,
                  display: "inline-block",
                }}
              />
              <span>CLASSIFIED PROTOCOL // LEVEL 4</span>
            </div>

            <span
              style={{
                fontSize: 9.5,
                color: "rgba(255, 255, 255, 0.4)",
                fontFamily: "monospace",
                letterSpacing: ".06em",
              }}
            >
              FORM HPD-83
            </span>
          </div>

          {/* Title */}
          <h3
            style={{
              margin: "0 0 12px",
              fontFamily: "'Benguiat Bold', 'ITC Benguiat', serif",
              fontSize: "clamp(15px, 1.4vw, 17px)",
              color: "#ffffff",
              letterSpacing: ".1em",
              textTransform: "uppercase",
              lineHeight: 1.35,
              textShadow: "0 2px 8px rgba(0,0,0,0.8)",
            }}
          >
            {titleText}
          </h3>

          {/* Message Content */}
          <p
            style={{
              margin: "0 0 20px",
              fontSize: "13.5px",
              lineHeight: 1.6,
              color: "#ded2c4",
              fontFamily: "'Courier New', Courier, monospace",
              fontWeight: 600,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {modal.message}
          </p>

          {/* Action Buttons */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            {hasCancel && (
              <button
                type="button"
                onClick={() => {
                  sfx("click");
                  if (modal.onCancel) {
                    modal.onCancel();
                  } else {
                    closeModal();
                  }
                }}
                style={{
                  padding: "9px 18px",
                  background: "rgba(255, 255, 255, 0.05)",
                  color: "#c9bda4",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  borderRadius: 3,
                  fontFamily: "'Benguiat Bold', serif",
                  fontSize: 11.5,
                  fontWeight: 800,
                  letterSpacing: ".1em",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  textTransform: "uppercase",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.12)";
                  e.currentTarget.style.color = "#ffffff";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                  e.currentTarget.style.color = "#c9bda4";
                }}
              >
                {modal.cancelLabel || "CANCEL"}
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                sfx("ok");
                if (modal.onConfirm) {
                  modal.onConfirm();
                } else {
                  closeModal();
                }
              }}
              style={{
                padding: "9px 22px",
                background: accentColor,
                color: isWarning ? "#000000" : "#ffffff",
                border: `1.5px solid ${accentColor}`,
                borderRadius: 3,
                fontFamily: "'Benguiat Bold', serif",
                fontSize: 12,
                fontWeight: 900,
                letterSpacing: ".12em",
                cursor: "pointer",
                boxShadow: `0 2px 10px ${accentColor}55`,
                transition: "all 0.15s ease",
                textTransform: "uppercase",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.filter = "brightness(1.15)";
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.filter = "none";
                e.currentTarget.style.transform = "none";
              }}
            >
              {modal.confirmLabel || (hasCancel ? "CONFIRM" : "ACKNOWLEDGE")}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
