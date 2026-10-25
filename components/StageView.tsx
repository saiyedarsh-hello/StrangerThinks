"use client";
import React, { useState, useEffect } from "react";
import { useGame } from "@/lib/store";
import { sfx } from "@/lib/audio";
import { subscribe } from "@/lib/realtime";
import VecnaCutscene from "./VecnaCutscene";
import ChapterManager, { ChapterId } from "./chapters/ChapterManager";
import InvestigationBoard from "./InvestigationBoard";
import EventStandby from "./EventStandby";

export default function StageView() {
  const { vecnaCutscene, dismissVecnaCutscene, activeChapterId, setActiveChapterId, viewMode, setViewMode, isLocationLocked, say } = useGame();
  const [eventStatus, setEventStatus] = useState<string>("active");

  useEffect(() => {
    let active = true;
    const fetchStatus = async () => {
      try {
        const res = await fetch(`/api/admin/event/state?_t=${Date.now()}`);
        const data = await res.json();
        if (active && data.success && data.eventState) {
          setEventStatus(data.eventState.status || "active");
        }
      } catch {}
    };
    fetchStatus();

    const unsub = subscribe((m: any) => {
      if (m.type === "event_state" && m.status) {
        setEventStatus(m.status);
      }
      if (m.type === "event_reset") {
        setEventStatus("active");
      }
      if (m.type === "event_ended") {
        setEventStatus("ended");
      }
    });

    return () => {
      active = false;
      unsub();
    };
  }, []);

  const handleSelectChapter = (chapterId: number) => {
    if (isLocationLocked && chapterId !== activeChapterId) {
      sfx("err");
      say("VECNA INTERFERENCE — LOCATION LOCKED · Stage movement restricted.");
      return;
    }
    if (chapterId >= 1 && chapterId <= 7) {
      setActiveChapterId(chapterId as ChapterId);
    }
    setViewMode("location");
  };

  if (eventStatus === "not_started" || eventStatus === "ended") {
    return <EventStandby onEventStarted={() => setEventStatus("active")} />;
  }

  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      {/* Vecna Arrival Cutscene Takeover */}
      {vecnaCutscene && <VecnaCutscene onDismiss={dismissVecnaCutscene} />}

      {/* Main Game Mode: Investigation Board (Default) or Active Chapter Console */}
      {viewMode === "board" ? (
        <InvestigationBoard onSelectChapter={handleSelectChapter} />
      ) : (
        <ChapterManager onBackToBoard={() => setViewMode("board")} />
      )}
    </div>
  );
}
