"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useGame } from "@/lib/store";
import IntroCutscene from "@/components/scenes/IntroCutscene";
import LandingPage from "@/components/LandingPage";
import StageView from "@/components/StageView";
import Ending from "@/components/Ending";
import ChapterCard from "@/components/ChapterCard";
import Hud, { Toast } from "@/components/Hud";
import SabotageOverlay from "@/components/SabotageOverlay";
import dynamic from "next/dynamic";

const AdminPage = dynamic(() => import("@/app/admin/page"), { ssr: false });
const VecnaPage = dynamic(() => import("@/app/vecna/page"), { ssr: false });

export default function Home() {
  const router = useRouter();
  const { s, hydrated, cutscene, introSeen, setIntroSeen, session } = useGame();

  if (!hydrated) {
    return <LandingPage />;
  }

  // Allow direct viewing of landing page via query param (e.g. ?landing=1)
  const forceLanding =
    typeof window !== "undefined" &&
    (window.location.search.includes("landing=1") || window.location.search.includes("force=1"));

  if (forceLanding) {
    return <LandingPage />;
  }

  // Without a valid authenticated session, render the shared landing page
  if (!session) {
    return <LandingPage />;
  }

  // 1. Authenticated Admin Session
  if (session.role === "ADMIN") {
    return <AdminPage />;
  }

  // 2. Authenticated Vecna Session
  if (session.role === "VECNA") {
    return <VecnaPage />;
  }

  // 3. Authenticated Hawkins Player Session
  if (session.role === "PLAYER") {
    if (!introSeen) {
      return <IntroCutscene onComplete={() => setIntroSeen(true)} />;
    }

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

  return <LandingPage />;
}
