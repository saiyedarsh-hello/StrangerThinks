"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function FullscreenEnforcer() {
  const pathname = usePathname() || "";

  useEffect(() => {
    // Never force or intercept clicks on admin dashboard or vecna tactical console
    if (pathname.startsWith("/admin") || pathname.startsWith("/vecna")) return;

    const enterFullscreen = (e: Event) => {
      if (typeof document === "undefined") return;
      if (window.location.pathname.startsWith("/admin") || window.location.pathname.startsWith("/vecna")) return;

      // Do NOT trigger or intercept clicks on buttons, inputs, links, or control elements
      const target = e.target as HTMLElement | null;
      if (target?.closest("button, input, select, textarea, [role='button'], a, [data-no-fullscreen]")) {
        return;
      }

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

    // Auto-enter fullscreen upon non-control interactions on immersive player view
    window.addEventListener("click", enterFullscreen, { passive: true });
    window.addEventListener("touchstart", enterFullscreen, { passive: true });
    window.addEventListener("keydown", enterFullscreen, { passive: true });

    return () => {
      window.removeEventListener("click", enterFullscreen);
      window.removeEventListener("touchstart", enterFullscreen);
      window.removeEventListener("keydown", enterFullscreen);
    };
  }, [pathname]);

  return null;
}

