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
import PauseOverlay from "@/components/PauseOverlay";
import SecurityGuard from "@/components/SecurityGuard";
import SecurityDisqualifiedScreen from "@/components/SecurityDisqualifiedScreen";
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

  const [isKicked, setIsKicked] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("hawkins_security_kicked") === "true";
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

  // If player was disqualified due to anti-cheat violation, show Disqualified screen
  if (isKicked && session?.role !== "ADMIN") {
    const kickReason =
      typeof window !== "undefined"
        ? sessionStorage.getItem("hawkins_kicked_reason") || undefined
        : undefined;
    return (
      <SecurityDisqualifiedScreen
        reason={kickReason}
        onAdminReset={() => setIsKicked(false)}
      />
    );
  }

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
        {s.isPaused && <PauseOverlay teamName={session.teamName || s.team?.name} />}
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
