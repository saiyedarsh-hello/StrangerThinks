"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useGame } from "@/lib/store";
import IntroCutscene from "@/components/scenes/IntroCutscene";
import LandingPage from "@/components/LandingPage";
import VecnaEntryScreen from "@/components/VecnaEntryScreen";
import StageView from "@/components/StageView";
import Ending from "@/components/Ending";
import ChapterCard from "@/components/ChapterCard";
import Hud, { Toast } from "@/components/Hud";
import SabotageOverlay from "@/components/SabotageOverlay";

export default function Home() {
  const router = useRouter();
  const { s, hydrated, cutscene, introSeen, setIntroSeen, session } = useGame();
  const [showVecnaChosen, setShowVecnaChosen] = useState(false);

  // Route Guard: If already logged in as Vecna and visiting "/", show Vecna Entry or redirect to /vecna
  useEffect(() => {
    if (hydrated && session && session.role === "VECNA") {
      setShowVecnaChosen(true);
    }
  }, [hydrated, session]);

  if (!hydrated) {
    return <div style={{ minHeight: "100vh", background: "#000" }} />;
  }

  // Vecna Entry Screen (Image 2) when user has Vecna role
  if (showVecnaChosen || (session && session.role === "VECNA")) {
    return <VecnaEntryScreen onEnter={() => router.push("/vecna")} />;
  }

  // Allow direct viewing of landing page via query param (e.g. ?landing=1)
  const forceLanding =
    typeof window !== "undefined" &&
    (window.location.search.includes("landing=1") || window.location.search.includes("force=1"));

  if (forceLanding) {
    return <LandingPage onEnterVecna={() => setShowVecnaChosen(true)} />;
  }

  // Without a valid player session, show the Image 1 Landing Page
  if (!session || session.role !== "PLAYER") {
    return <LandingPage onEnterVecna={() => setShowVecnaChosen(true)} />;
  }

  // Initial Cinematic Typewriter Intro for authenticated Player
  if (!introSeen) {
    return <IntroCutscene onComplete={() => setIntroSeen(true)} />;
  }

  // Authenticated Player game
  return (
    <>
      {!cutscene && (s.stage === "ending" ? <Ending /> : <StageView />)}
      <Hud />
      <SabotageOverlay />
      <ChapterCard />
      <Toast />
    </>
  );
}
