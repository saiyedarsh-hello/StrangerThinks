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

const AdminPage = dynamic(() => import("@/components/admin/AdminDashboard"), { ssr: false });
const VecnaPage = dynamic(() => import("@/components/vecna/VecnaDashboard"), { ssr: false });
const VecnaEntryScreen = dynamic(() => import("@/components/VecnaEntryScreen"), { ssr: false });

export default function Home() {
  const router = useRouter();
  const { s, hydrated, sessionVerified, cutscene, introSeen, setIntroSeen, session, logout } = useGame();
  const [vecnaIntroSeen, setVecnaIntroSeen] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("vecna_intro_seen") === "true";
    }
    return false;
  });

  // Reset Vecna intro on logout or cleared session
  useEffect(() => {
    if (!session && typeof window !== "undefined") {
      sessionStorage.removeItem("vecna_intro_seen");
      setVecnaIntroSeen(false);
    }
  }, [session]);

  // Allow direct viewing of landing page via query param (e.g. ?landing=1 or ?logout=1)
  const forceLanding =
    typeof window !== "undefined" &&
    (window.location.search.includes("landing=1") ||
      window.location.search.includes("force=1") ||
      window.location.search.includes("logout=1"));

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.search.includes("logout=1")) {
      logout();
    }
  }, [logout]);

  // Wait for the server to confirm the session role before rendering any
  // privileged dashboard. A locally edited session cannot promote a role.
  if (!hydrated || !sessionVerified) {
    return <LandingPage />;
  }

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
    if (!vecnaIntroSeen) {
      return (
        <VecnaEntryScreen
          onEnter={() => {
            if (typeof window !== "undefined") {
              sessionStorage.setItem("vecna_intro_seen", "true");
            }
            setVecnaIntroSeen(true);
          }}
        />
      );
    }
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
