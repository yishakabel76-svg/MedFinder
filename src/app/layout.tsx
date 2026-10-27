import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "MedFinder — Find medicine availability in Addis Ababa",
  description: "Search sample medicine availability near you in Addis Ababa. Check stock freshness, contact pharmacies, and get directions.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
