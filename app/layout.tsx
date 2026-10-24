import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LBMA — Laboratoire immobilier",
  description: "Analyse et suivi des opportunités immobilières de la SCI familiale.",
  applicationName: "LBMA"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="fr"><body>{children}</body></html>;
}