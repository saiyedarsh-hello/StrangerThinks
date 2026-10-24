"use client";
import React, { useState, useMemo, useEffect } from "react";
import { sfx } from "@/lib/audio";
import { MAP_LOCATIONS } from "./VecnaTacticalMap";

export type TriggerActionKind = "CORRUPT" | "LOCK";

export interface TriggerAction {
  id: TriggerActionKind;
  label: string;
  sublabel: string;
  icon: React.ReactNode;
  costPerTeam: number;
  targetTeams?: string[];
  totalCost?: number;
}

export const TRIGGER_ACTIONS: TriggerAction[] = [
  {
    id: "CORRUPT",
    label: "SYSTEM CORRUPTED",
    sublabel: "4-Cipher Recovery Challenge · 80s Lockout",
    costPerTeam: 10,
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
  },
  {
    id: "LOCK",
    label: "LOCK LOCATION",
    sublabel: "Restrain Stage Progression for 120s",
    costPerTeam: 10,
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
  },
];

export interface TargetSquadItem {
  id: string;
  name: string;
  leader?: string;
  status?: string;
}

interface VecnaTriggerPanelProps {
  selectedLocation: string;
  onSelectLocation: (locId: string) => void;
  onTriggerAction: (action: TriggerAction) => void;
  activeActionId?: string | null;
  currentVecnaScore?: number;
  availableSquads?: TargetSquadItem[];
}

export default function VecnaTriggerPanel({
  selectedLocation,
  onSelectLocation,
  onTriggerAction,
  activeActionId,
  currentVecnaScore = 50,
  availableSquads,
}: VecnaTriggerPanelProps) {
  // Filter strictly for online Hawkins squads, presented in randomized order to prevent ranking leaks
  const squads = useMemo(() => {
    const list = (availableSquads || []).filter(
      (s) => s && s.name && s.status !== "Offline"
    );
    const shuffled = [...list];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }, [availableSquads]);

  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [selectedPower, setSelectedPower] = useState<TriggerActionKind>("LOCK");
  const [showConfirm, setShowConfirm] = useState(false);

  // Sync selected teams when available squads change
  useEffect(() => {
    if (squads.length > 0) {
      setSelectedTeams((prev) => {
        const stillValid = prev.filter((name) => squads.some((s) => s.name === name));
        return stillValid.length > 0 ? stillValid : [squads[0].name];
      });
    } else {
      setSelectedTeams([]);
    }
  }, [squads]);

  const toggleTeam = (tmName: string) => {
    sfx("click");
    setSelectedTeams((prev) =>
      prev.includes(tmName) ? prev.filter((t) => t !== tmName) : [...prev, tmName]
    );
  };

  const selectAllTeams = () => {
    sfx("click");
    const allNames = squads.map((s) => s.name);
    if (selectedTeams.length === allNames.length) {
      setSelectedTeams([]);
    } else {
      setSelectedTeams([...allNames]);
    }
  };

  const activeAction = TRIGGER_ACTIONS.find((a) => a.id === selectedPower) || TRIGGER_ACTIONS[1];
  const totalCost = selectedTeams.length * 10;
  const canAfford = currentVecnaScore >= totalCost && selectedTeams.length > 0;

  const handleExecute = () => {
    if (!canAfford) return;
    sfx("click");
    setShowConfirm(true);
  };

  const confirmExecution = () => {
    sfx("boom");
    setShowConfirm(false);
    onTriggerAction({
      ...activeAction,
      targetTeams: selectedTeams,
      totalCost,
    });
  };

  return (
    <div
      style={{
        background: "rgba(10, 3, 6, 0.95)",
        border: "1px solid rgba(255, 45, 58, 0.3)",
        borderRadius: "4px",
        padding: "16px 18px",
        display: "flex",
        flexDirection: "column",
        gap: "14px",
        height: "100%",
        position: "relative",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "8px" }}>
        <div>
          <div
            style={{
              fontFamily: "var(--font-title)",
              fontSize: "15px",
              letterSpacing: "0.2em",
              fontWeight: 900,
              color: "#ff2d3a",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            VECNA POWERS & SABOTAGE COCKPIT
          </div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              letterSpacing: "0.08em",
              color: "rgba(255, 180, 180, 0.6)",
              marginTop: "2px",
            }}
          >
            Authoritative Server Deductions · 10 PTS / Team Affected · Real-Time Sync
          </div>
        </div>

        {/* Current Score Badge */}
        <div
          style={{
            background: "rgba(0, 0, 0, 0.7)",
            border: "1px solid #ff2d3a",
            padding: "4px 10px",
            borderRadius: "3px",
            fontFamily: "var(--font-mono)",
            fontSize: "12px",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <span style={{ color: "rgba(255,180,180,0.6)" }}>BALANCE:</span>
          <span style={{ color: currentVecnaScore < 10 ? "#ff4d58" : "#00ffcc", fontWeight: "bold" }}>
            {currentVecnaScore} PTS
          </span>
        </div>
      </div>

      {/* Target Selection: Select Squads + Select All Button */}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <label
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              fontWeight: "bold",
              letterSpacing: "0.1em",
              color: "rgba(255, 200, 200, 0.9)",
            }}
          >
            TARGET SQUADS ({selectedTeams.length} SELECTED · {totalCost} PTS):
          </label>
          <button
            type="button"
            disabled={squads.length === 0}
            onClick={selectAllTeams}
            style={{
              background: squads.length > 0 && selectedTeams.length === squads.length ? "rgba(255, 45, 58, 0.3)" : "rgba(0, 0, 0, 0.6)",
              border: "1px solid #ff2d3a",
              color: squads.length === 0 ? "rgba(255,255,255,0.3)" : "#ffffff",
              padding: "2px 8px",
              borderRadius: "2px",
              fontFamily: "var(--font-mono)",
              fontSize: "10px",
              cursor: squads.length === 0 ? "not-allowed" : "pointer",
              letterSpacing: "0.08em",
            }}
          >
            {squads.length > 0 && selectedTeams.length === squads.length ? "DESELECT ALL" : "SELECT ALL TEAMS"}
          </button>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", maxHeight: "110px", overflowY: "auto" }}>
          {squads.length === 0 ? (
            <div style={{ color: "rgba(255, 180, 180, 0.6)", fontSize: "11px", fontStyle: "italic", padding: "8px 0" }}>
              [NO HAWKINS SQUADS CURRENTLY ONLINE — TARGETING RESTRICTED]
            </div>
          ) : (
            squads.map((sq) => {
              const isChecked = selectedTeams.includes(sq.name);
              return (
                <button
                  key={sq.id || sq.name}
                  type="button"
                  onClick={() => toggleTeam(sq.name)}
                  style={{
                    padding: "5px 10px",
                    background: isChecked ? "rgba(255, 45, 58, 0.3)" : "rgba(0, 0, 0, 0.6)",
                    border: isChecked ? "1.5px solid #ff2d3a" : "1px solid rgba(255, 255, 255, 0.2)",
                    color: isChecked ? "#ffffff" : "rgba(255, 255, 255, 0.6)",
                    borderRadius: "3px",
                    fontFamily: "var(--font-mono)",
                    fontSize: "11px",
                    fontWeight: isChecked ? "bold" : "normal",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <span>{isChecked ? "☑" : "☐"}</span>
                  <span>{sq.name}</span>
                  {sq.leader && <span style={{ fontSize: "9px", opacity: 0.6 }}>({sq.leader})</span>}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Power Selection Cards (LOCK LOCATION vs SYSTEM CORRUPTED) */}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <label
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "11px",
            fontWeight: "bold",
            letterSpacing: "0.1em",
            color: "rgba(255, 200, 200, 0.9)",
          }}
        >
          SELECT VECNA POWER:
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          {TRIGGER_ACTIONS.map((act) => {
            const isSelected = selectedPower === act.id;
            return (
              <button
                key={act.id}
                type="button"
                onClick={() => {
                  sfx("click");
                  setSelectedPower(act.id);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "12px",
                  background: isSelected ? "rgba(255, 45, 58, 0.28)" : "rgba(0, 0, 0, 0.7)",
                  border: isSelected ? "2px solid #ff2d3a" : "1px solid rgba(255, 45, 58, 0.3)",
                  borderRadius: "3px",
                  color: isSelected ? "#ffffff" : "rgba(255, 200, 200, 0.9)",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.15s ease",
                  boxShadow: isSelected ? "0 0 15px rgba(255, 45, 58, 0.4)" : "none",
                }}
              >
                <div style={{ color: "#ff2d3a", flexShrink: 0 }}>{act.icon}</div>
                <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "12px",
                      fontWeight: "bold",
                      letterSpacing: "0.06em",
                    }}
                  >
                    {act.label}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "9.5px",
                      color: "rgba(255, 160, 160, 0.65)",
                      letterSpacing: "0.04em",
                      marginTop: "2px",
                    }}
                  >
                    {act.sublabel}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Cost & Action Bar */}
      <div
        style={{
          background: "rgba(20, 4, 8, 0.8)",
          border: "1px solid rgba(255, 45, 58, 0.3)",
          borderRadius: "3px",
          padding: "10px 14px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "8px",
          marginTop: "auto",
        }}
      >
        <div>
          <div style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "rgba(255,180,180,0.8)" }}>
            TARGETS: <span style={{ color: "#ffffff", fontWeight: "bold" }}>{selectedTeams.length} SQUADS</span>
            {selectedPower === "LOCK" ? " · 120s STAGE RESTRAINT" : " · 80s 4-CIPHER CHALLENGE"}
          </div>
          <div style={{ fontSize: "12px", fontFamily: "var(--font-mono)", color: "#ff8a80", fontWeight: "bold", marginTop: "2px" }}>
            POWER CHARGE: <span style={{ color: "#ffffff" }}>{totalCost} PTS</span> (10 PTS / TEAM)
          </div>
        </div>

        <button
          type="button"
          onClick={handleExecute}
          disabled={!canAfford}
          style={{
            padding: "10px 20px",
            background: canAfford ? "#ff2d3a" : "rgba(100, 20, 25, 0.5)",
            border: "none",
            borderRadius: "3px",
            color: canAfford ? "#000000" : "rgba(255, 255, 255, 0.4)",
            fontFamily: "var(--font-mono)",
            fontSize: "12px",
            fontWeight: "bold",
            letterSpacing: "0.14em",
            cursor: canAfford ? "pointer" : "not-allowed",
            boxShadow: canAfford ? "0 0 16px rgba(255, 45, 58, 0.5)" : "none",
            transition: "all 0.15s ease",
          }}
        >
          {canAfford ? `ACTIVATE (-${totalCost} PTS)` : "INSUFFICIENT PTS / NO TARGETS"}
        </button>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(10, 2, 4, 0.94)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            zIndex: 100,
            borderRadius: "4px",
            textAlign: "center",
          }}
        >
          <div style={{ color: "#ff2d3a", fontFamily: "var(--font-title)", fontSize: "16px", fontWeight: 900, letterSpacing: "0.15em", marginBottom: "8px" }}>
            CONFIRM VECNA POWER ACTIVATION
          </div>
          <div style={{ color: "#ffffff", fontFamily: "var(--font-mono)", fontSize: "12px", lineHeight: 1.5, maxWidth: "380px", marginBottom: "16px" }}>
            Unleash <span style={{ color: "#ff4d58", fontWeight: "bold" }}>{activeAction.label}</span> on{" "}
            <span style={{ color: "#00ffcc", fontWeight: "bold" }}>{selectedTeams.length} squads</span>?
            <br />
            <span style={{ color: "#ff8a80" }}>Cost: {totalCost} PTS</span> will be authoritatively deducted from your score.
          </div>
          <div style={{ display: "flex", gap: "12px" }}>
            <button
              type="button"
              onClick={() => setShowConfirm(false)}
              style={{
                padding: "8px 16px",
                background: "rgba(255, 255, 255, 0.1)",
                border: "1px solid rgba(255, 255, 255, 0.3)",
                color: "#ffffff",
                fontFamily: "var(--font-mono)",
                fontSize: "11px",
                cursor: "pointer",
                borderRadius: "3px",
              }}
            >
              CANCEL
            </button>
            <button
              type="button"
              onClick={confirmExecution}
              style={{
                padding: "8px 18px",
                background: "#ff2d3a",
                border: "none",
                color: "#000000",
                fontFamily: "var(--font-mono)",
                fontSize: "11px",
                fontWeight: "bold",
                cursor: "pointer",
                borderRadius: "3px",
                boxShadow: "0 0 12px rgba(255, 45, 58, 0.6)",
              }}
            >
              CONFIRM (-{totalCost} PTS)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
