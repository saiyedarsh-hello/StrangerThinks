import "./globals.css";
import type { Metadata, Viewport } from "next";
import { GameProvider } from "@/lib/store";
import Crt from "@/components/Crt";
import FullscreenEnforcer from "@/components/FullscreenEnforcer";

import GameModalHost from "@/components/GameModalHost";

export const metadata: Metadata = {
  title: "The Hawkins Protocol",
  description: "An immersive, story-driven coding adventure.",
};
export const viewport: Viewport = { themeColor: "#05080b" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="normal" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="preload"
          href="/fonts/benguiat-bold.ttf"
          as="font"
          type="font/ttf"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Libre+Caslon+Display&family=Playfair+Display:wght@900&family=Share+Tech+Mono&family=VT323&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning>
        <FullscreenEnforcer />
        <GameProvider>
          {children}
          <GameModalHost />
          <Crt />
        </GameProvider>
      </body>
    </html>
  );
}
