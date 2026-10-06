import "./globals.css";
import type { Metadata, Viewport } from "next";
import { GameProvider } from "@/lib/store";
import Crt from "@/components/Crt";

export const metadata: Metadata = {
  title: "The Hawkins Protocol",
  description: "An immersive, story-driven coding adventure.",
};
export const viewport: Viewport = { themeColor: "#05080b" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="normal">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Libre+Caslon+Display&family=Playfair+Display:wght@900&family=Share+Tech+Mono&family=VT323&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <GameProvider>
          {children}
          <Crt />
        </GameProvider>
      </body>
    </html>
  );
}
