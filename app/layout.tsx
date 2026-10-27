import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LBMA — Base Camp",
  description: "Analyse et suivi des opportunités immobilières de la SCI familiale.",
  applicationName: "LBMA",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/logo.svg", apple: "/icon-192.png" },
  appleWebApp: { capable: true, title: "LBMA", statusBarStyle: "default" }
};
export const viewport: Viewport = { themeColor: "#141910" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="fr"><body>{children}</body></html>;
}
