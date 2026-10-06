import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { StoryTask, LocationId } from "@/lib/tasks";
import { sfx } from "@/lib/audio";
import PushPin from "@/components/PushPin";

interface CaseStudyTaskProps {
  task: StoryTask;
  solved: boolean;
  onSolve: (points: number, routeLocation: LocationId) => void;
  disabled?: boolean;
}

export default function CaseStudyTask({ task, solved, onSolve, disabled }: CaseStudyTaskProps) {
  const data = task.caseStudyData;
  if (!data) return null;

  const [pinnedCards, setPinnedCards] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    data.cards.forEach((c) => {
      init[c.id] = !!c.pinned;
    });
    return init;
  });
  const [selectedRoute, setSelectedRoute] = useState<LocationId | null>(null);
  const [errorShake, setErrorShake] = useState(false);

  const togglePin = (cardId: string) => {
    if (disabled || solved) return;
    sfx("snap");
    setPinnedCards((p) => ({ ...p, [cardId]: !p[cardId] }));
  };

  const handleConfirm = () => {
    if (disabled || solved || !selectedRoute) return;
    if (selectedRoute === data.correctLocationRoute) {
      sfx("ok");
      onSolve(task.points, selectedRoute);
    } else {
      sfx("err");
      setErrorShake(true);
      setTimeout(() => setErrorShake(false), 600);
    }
  };

  const routes: { id: LocationId; label: string; desc: string }[] = [
    { id: "policeStation", label: "Hawkins Police Station", desc: "Review remaining witness statements" },
    { id: "byersHouse", label: "Byers Residence", desc: "Examine Christmas lights electromagnetic wiring" },
    { id: "radioTower", label: "Hawkins Radio Tower", desc: "Triangulate the 87.6 MHz carrier broadcast" },
    { id: "lab", label: "Hawkins National Laboratory", desc: "Investigate Sublevel 4 power drop" },
    { id: "forest", label: "Deep Forest Trail", desc: "Inspect temperature drops and trail marks" },
  ];

  return (
    <div
      style={{
        position: "relative",
        background: "radial-gradient(ellipse at 50% 30%, #151922, #0b0e14)",
        border: "1px solid rgba(255, 180, 84, 0.35)",
        borderRadius: 6,
        padding: "24px 22px",
        fontFamily: "var(--font-term)",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18, borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: 14 }}>
        <div>
          <div className="eyebrow" style={{ color: "var(--accent)" }}>
            CASE STUDY · {data.reportNumber}
          </div>
          <div style={{ fontSize: 20, color: "#fff" }}>{data.incidentTitle}</div>
        </div>
        <div
          style={{
            border: "1px solid var(--accent)",
            color: "var(--accent)",
            padding: "3px 8px",
            fontSize: 13,
            letterSpacing: ".15em",
            borderRadius: 2,
          }}
        >
          INCIDENT CORRELATION
        </div>
      </div>

      <div style={{ fontSize: 16, color: "var(--dim)", marginBottom: 16 }}>
        {task.question} Click cards to pin/unpin key findings, then select your investigative destination.
      </div>

      {/* Corkboard Grid of Evidence Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 14,
          marginBottom: 22,
        }}
      >
        {data.cards.map((c) => {
          const isPinned = pinnedCards[c.id];
          return (
            <div
              key={c.id}
              onClick={() => togglePin(c.id)}
              style={{
                position: "relative",
                background: isPinned ? "rgba(255, 180, 84, 0.1)" : "rgba(255, 255, 255, 0.03)",
                border: `1px solid ${isPinned ? "var(--accent)" : "rgba(255, 255, 255, 0.12)"}`,
                borderRadius: 4,
                padding: "16px 14px 14px",
                cursor: disabled || solved ? "default" : "pointer",
                transition: "all .2s",
                boxShadow: "none",
              }}
            >
              {/* 3D Realistic Pushpin indicator */}
              <div style={{ position: "absolute", top: "-11px", right: "12px", zIndex: 10 }}>
                <PushPin color={isPinned ? "#d32f2f" : "#607d8b"} size={22} angle={isPinned ? -8 : 12} />
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span
                  style={{
                    fontSize: 11,
                    letterSpacing: ".1em",
                    padding: "1px 6px",
                    borderRadius: 2,
                    background: "rgba(255,255,255,0.08)",
                    color: isPinned ? "var(--accent)" : "var(--dim)",
                  }}
                >
                  {c.tag}
                </span>
                <span className="dim" style={{ fontSize: 13 }}>{c.date}</span>
              </div>

              <div style={{ fontSize: 17, color: "#fff", fontWeight: "bold", marginBottom: 4 }}>
                {c.title}
              </div>
              <div className="eyebrow" style={{ fontSize: 12, marginBottom: 8, color: "var(--accent2)" }}>
                {c.location}
              </div>
              <div style={{ fontSize: 14, color: "var(--dim)", lineHeight: 1.4 }}>
                {c.summary}
              </div>
            </div>
          );
        })}
      </div>

      {/* Route Deduction Selection */}
      <div style={{ background: "rgba(0,0,0,0.4)", padding: "16px 18px", borderRadius: 4, marginBottom: 18 }}>
        <div className="eyebrow" style={{ color: "var(--accent)", marginBottom: 10 }}>
          {data.question}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
          {routes.map((r) => {
            const isSelected = selectedRoute === r.id;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  sfx("click");
                  setSelectedRoute(r.id);
                }}
                disabled={disabled || solved}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 14px",
                  background: isSelected ? "rgba(255,180,84,0.18)" : "transparent",
                  border: `1px solid ${isSelected ? "var(--accent)" : "rgba(255,255,255,0.1)"}`,
                  borderRadius: 4,
                  color: isSelected ? "#fff" : "var(--dim)",
                  cursor: disabled || solved ? "default" : "pointer",
                  textAlign: "left",
                }}
              >
                <div>
                  <b style={{ fontSize: 16 }}>{r.label}</b>
                  <div style={{ fontSize: 13, color: "var(--dim)" }}>{r.desc}</div>
                </div>
                <span style={{ fontSize: 18 }}>{isSelected ? "◉" : "○"}</span>
              </button>
            );
          })}
        </div>

        <button
          className={`btn ${errorShake ? "shake" : ""}`}
          onClick={handleConfirm}
          disabled={disabled || solved || !selectedRoute}
        >
          {solved ? "[ESTABLISHED] INVESTIGATION ROUTE ESTABLISHED" : "DEPLOY INVESTIGATION →"}
        </button>
      </div>

      {/* Completion feedback */}
      <AnimatePresence>
        {solved && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              padding: "14px 18px",
              background: "rgba(54, 224, 196, 0.12)",
              border: "1px solid var(--accent2)",
              borderRadius: 4,
              color: "var(--accent2)",
              fontSize: 18,
              letterSpacing: ".1em",
            }}
          >
            <div style={{ fontWeight: "bold" }}>[CONFIRMED] PRIMARY EPICENTER CONFIRMED (+{task.points} PTS)</div>
            {task.storyClue && (
              <div style={{ fontSize: 15, color: "#fff", marginTop: 6, opacity: 0.9 }}>
                {task.storyClue}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
