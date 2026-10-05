"use client";
import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useGame } from "@/lib/store";
import IntroCutscene from "@/components/scenes/IntroCutscene";
import LoginScreen from "@/components/LoginScreen";
import StageView from "@/components/StageView";
import Ending from "@/components/Ending";
import ChapterCard from "@/components/ChapterCard";
import Hud, { SoundToggle, Toast } from "@/components/Hud";
import SabotageOverlay from "@/components/SabotageOverlay";

export default function Home() {
  const router = useRouter();
  const { s, hydrated, cutscene, introSeen, setIntroSeen, session } = useGame();

  // Route Guard: If logged in as Vecna and visiting "/", redirect immediately to /vecna
  useEffect(() => {
    if (hydrated && session && session.role === "VECNA") {
      router.replace("/vecna");
    }
  }, [hydrated, session, router]);

  if (!hydrated) {
    return <div style={{ minHeight: "100vh", background: "#000" }} />;
  }

  // A logged-in Vecna user is redirected to /vecna
  if (session && session.role === "VECNA") {
    return <div style={{ minHeight: "100vh", background: "#050102" }} />;
  }

  // Without a valid player session, show the unified login screen
  if (!session || session.role !== "PLAYER") {
    return <LoginScreen />;
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
