import "./globals.css";
import type { Metadata } from "next";
import React from "react";
import ClientProviders from "@/components/ClientProviders";

export const metadata: Metadata = {
  title: "Reddit Stock Scanner",
  description: "Daily Reddit buzz + sentiment → day trading & swing ideas",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
