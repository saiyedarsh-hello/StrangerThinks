"use client";
import { useEffect } from "react";
import { getStoredSession } from "@/lib/config";

export default function FullscreenEnforcer() {
  useEffect(() => {
    const isUserAdmin = () => {
      if (typeof window === "undefined") return false;
      try {
        const session = getStoredSession();
        if (session?.role === "ADMIN") return true;
        if (
          localStorage.getItem("hawkins_admin_token") ||
          sessionStorage.getItem("hawkins_admin_token") ||
          sessionStorage.getItem("hawkins-protocol:operator")
        ) {
          return true;
        }
        if (window.location.pathname.startsWith("/admin")) {
          return true;
        }
      } catch {}
      return false;
    };

    const enterFullscreen = () => {
      if (typeof document === "undefined") return;
      // Do not force fullscreen for Admin
      if (isUserAdmin()) return;

      const doc = document as any;
      const isFs =
        doc.fullscreenElement ||
        doc.webkitFullscreenElement ||
        doc.mozFullScreenElement ||
        doc.msFullscreenElement;

      if (!isFs) {
        const docEl = document.documentElement as any;
        const requestFs =
          docEl.requestFullscreen ||
          docEl.webkitRequestFullscreen ||
          docEl.mozRequestFullScreen ||
          docEl.msRequestFullscreen;

        if (requestFs) {
          requestFs.call(docEl).catch(() => {});
        }
      }
    };

    // Auto-enter fullscreen upon user interactions anywhere across the application (except for Admin)
    window.addEventListener("click", enterFullscreen, { passive: true });
    window.addEventListener("touchstart", enterFullscreen, { passive: true });
    window.addEventListener("keydown", enterFullscreen, { passive: true });

    return () => {
      window.removeEventListener("click", enterFullscreen);
      window.removeEventListener("touchstart", enterFullscreen);
      window.removeEventListener("keydown", enterFullscreen);
    };
  }, []);

  return null;
}
