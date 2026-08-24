import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Thotic Venue Editor",
  description: "Production-grade 2D Venue Editor — Spatial SDK foundation"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
