"use client";
import React, { useState } from "react";
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
    sublabel: "Scramble challenge screen",
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
    sublabel: "Lock teams for 120s (Access Denied)",
    costPerTeam: 10,
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
  },
];

const AVAILABLE_TEAMS = [
  "Null Pointers",
  "Stack Smashers",
  "Rift Runners",
  "Byte Byters",
  "Signal Seekers",
  "Hellfire Club",
];

interface VecnaTriggerPanelProps {
  selectedLocation: string;
  onSelectLocation: (locId: string) => void;
  onTriggerAction: (action: TriggerAction) => void;
  activeActionId?: string | null;
  currentVecnaScore?: number;
  teams?: string[];
}

export default function VecnaTriggerPanel({
  selectedLocation,
  onSelectLocation,
  onTriggerAction,
  activeActionId,
  currentVecnaScore = 0,
  teams = AVAILABLE_TEAMS,
}: VecnaTriggerPanelProps) {
  const activeTeamList = teams && teams.length > 0 ? teams : AVAILABLE_TEAMS;
  const [selectedTeams, setSelectedTeams] = useState<string[]>(() => [activeTeamList[0] || "Null Pointers"]);
  const [selectedPower, setSelectedPower] = useState<TriggerActionKind>("LOCK");

  const toggleTeam = (tm: string) => {
    sfx("click");
    setSelectedTeams((prev) =>
      prev.includes(tm) ? prev.filter((t) => t !== tm) : [...prev, tm]
    );
  };

  const selectAllTeams = () => {
    sfx("click");
    if (selectedTeams.length === activeTeamList.length) {
      setSelectedTeams([]);
    } else {
      setSelectedTeams([...activeTeamList]);
    }
  };

  const activeAction = TRIGGER_ACTIONS.find((a) => a.id === selectedPower) || TRIGGER_ACTIONS[1];
  const totalCost = selectedTeams.length * 10;
  const canAfford = selectedTeams.length > 0;

  const handleExecute = () => {
    if (!canAfford) return;
    sfx("boom");
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
            Target specific teams · 10 PTS charged per target · 120s Lockout
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
            fontSize: "11px",
            color: "#ff8a80",
            letterSpacing: "0.1em",
          }}
        >
          AVAILABLE: <span style={{ color: "#ffffff", fontWeight: "bold" }}>{currentVecnaScore} PTS</span>
        </div>
      </div>

      {/* Target Location Dropdown */}
      <div>
        <label style={{ fontSize: "10.5px", fontFamily: "var(--font-mono)", color: "rgba(255,180,180,0.8)", letterSpacing: "0.12em" }}>
          LOCATION SECTOR:
        </label>
        <select
          value={selectedLocation}
          onChange={(e) => {
            sfx("click");
            onSelectLocation(e.target.value);
          }}
          style={{
            width: "100%",
            marginTop: "4px",
            padding: "8px 12px",
            background: "rgba(0, 0, 0, 0.8)",
            border: "1px solid rgba(255, 45, 58, 0.4)",
            borderRadius: "3px",
            color: "#ffffff",
            fontFamily: "var(--font-mono)",
            fontSize: "12px",
            letterSpacing: "0.08em",
            outline: "none",
            cursor: "pointer",
          }}
        >
          <option value="all">ALL LOCATIONS (BROADCAST SECTOR)</option>
          {MAP_LOCATIONS.map((loc) => (
            <option key={loc.id} value={loc.id}>
              {loc.name}
            </option>
          ))}
        </select>
      </div>

      {/* Team Selection Section (Checkboxes / Chips) */}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "rgba(255,200,200,0.9)", fontWeight: "bold", letterSpacing: "0.1em" }}>
            SELECT TARGET TEAMS (10 PTS EACH):
          </span>
          <button
            type="button"
            onClick={selectAllTeams}
            style={{
              background: "transparent",
              border: "none",
              color: "#ff2d3a",
              fontFamily: "var(--font-mono)",
              fontSize: "10.5px",
              cursor: "pointer",
              letterSpacing: "0.08em",
              textDecoration: "underline",
            }}
          >
            {selectedTeams.length === activeTeamList.length ? "DESELECT ALL" : "SELECT ALL"}
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "6px" }}>
          {activeTeamList.map((tm) => {
            const isChecked = selectedTeams.includes(tm);
            return (
              <button
                key={tm}
                type="button"
                onClick={() => toggleTeam(tm)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 8px",
                  background: isChecked ? "rgba(255, 45, 58, 0.25)" : "rgba(0, 0, 0, 0.5)",
                  border: isChecked ? "1.5px solid #ff2d3a" : "1px solid rgba(255, 255, 255, 0.15)",
                  borderRadius: "3px",
                  color: isChecked ? "#ffffff" : "rgba(255, 255, 255, 0.6)",
                  fontFamily: "var(--font-mono)",
                  fontSize: "10.5px",
                  fontWeight: isChecked ? "bold" : "normal",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.12s ease",
                }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "12px",
                    height: "12px",
                    borderRadius: "2px",
                    border: `1px solid ${isChecked ? "#ff2d3a" : "rgba(255,255,255,0.4)"}`,
                    background: isChecked ? "#ff2d3a" : "transparent",
                    color: "#000",
                    fontSize: "9px",
                    fontWeight: 900,
                  }}
                >
                  {isChecked ? "✓" : ""}
                </span>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {tm}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Power Selection: 2 Available Powers */}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <span style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "rgba(255,200,200,0.9)", fontWeight: "bold", letterSpacing: "0.1em" }}>
          CHOOSE POWER:
        </span>
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

      {/* Cost & Confirmation Summary */}
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
        }}
      >
        <div>
          <div style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "rgba(255,180,180,0.8)" }}>
            TARGETS: <span style={{ color: "#ffffff", fontWeight: "bold" }}>{selectedTeams.length} TEAMS</span>
            {selectedPower === "LOCK" && " · DURATION: 120s (2 MIN)"}
          </div>
          <div style={{ fontSize: "12px", fontFamily: "var(--font-mono)", color: "#ff8a80", fontWeight: "bold", marginTop: "2px" }}>
            TOTAL COST: <span style={{ color: "#ffffff" }}>{totalCost} PTS</span> (10 PTS / TEAM)
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
          {selectedTeams.length === 0 ? "SELECT TARGET TEAM" : `ACTIVATE (-${totalCost} PTS)`}
        </button>
      </div>
    </div>
  );
}
