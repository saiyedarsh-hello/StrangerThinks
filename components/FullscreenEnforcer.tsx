"use client";
import { useEffect } from "react";

export default function FullscreenEnforcer() {
  useEffect(() => {
    const enterFullscreen = () => {
      if (typeof document === "undefined") return;

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

    // Auto-enter fullscreen upon user interactions anywhere across the application
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
