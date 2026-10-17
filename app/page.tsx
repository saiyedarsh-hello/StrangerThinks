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
  const { s, hydrated, introSeen, setIntroSeen, session } = useGame();
  const [showVecnaChosen, setShowVecnaChosen] = useState(false);
  const [hasEntered, setHasEntered] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const entered = sessionStorage.getItem("hawkins_entered") === "true";
      setHasEntered(entered);
    }
  }, []);

  // Sync if loginPlayer was triggered
  useEffect(() => {
    if (s.phase === "play" && session?.role === "PLAYER") {
      setHasEntered(true);
    }
  }, [s.phase, session]);

  // Route Guard: If logged in as Vecna and user has entered
  useEffect(() => {
    if (hydrated && session && session.role === "VECNA" && hasEntered) {
      setShowVecnaChosen(true);
    }
  }, [hydrated, session, hasEntered]);

  // Always start with the normal Stranger Things intro page & login unless explicitly entered
  if (!hydrated || !hasEntered) {
    return (
      <LandingPage
        onEnterVecna={() => {
          if (typeof window !== "undefined") {
            sessionStorage.setItem("hawkins_entered", "true");
          }
          setHasEntered(true);
          setShowVecnaChosen(true);
        }}
      />
    );
  }

  // Vecna Entry Screen when user has Vecna role and has entered
  if (showVecnaChosen || (session && session.role === "VECNA")) {
    return <VecnaEntryScreen onEnter={() => router.push("/vecna")} />;
  }

  // Without a valid player session, show the Landing Page
  if (!session || session.role !== "PLAYER") {
    return (
      <LandingPage
        onEnterVecna={() => {
          if (typeof window !== "undefined") {
            sessionStorage.setItem("hawkins_entered", "true");
          }
          setHasEntered(true);
          setShowVecnaChosen(true);
        }}
      />
    );
  }

  // Initial Cinematic Typewriter Intro for authenticated Player
  if (!introSeen) {
    return <IntroCutscene onComplete={() => setIntroSeen(true)} />;
  }

  // Authenticated Player game
  return (
    <>
      {s.stage === "ending" ? <Ending /> : <StageView />}
      <Hud />
      <ChapterCard />
      <Toast />
    </>
  );
}
