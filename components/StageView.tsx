"use client";
import React, { useState } from "react";
import { useGame } from "@/lib/store";
import VecnaCutscene from "./VecnaCutscene";
import ChapterManager, { ChapterId } from "./chapters/ChapterManager";
import InvestigationBoard from "./InvestigationBoard";

export default function StageView() {
  const { vecnaCutscene, dismissVecnaCutscene, setActiveChapterId, viewMode, setViewMode } = useGame();

  const handleSelectChapter = (chapterId: number) => {
    if (chapterId >= 1 && chapterId <= 7) {
      setActiveChapterId(chapterId as ChapterId);
    }
    setViewMode("location");
  };

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
