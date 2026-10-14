import type { Metadata, Viewport } from "next";
import { Archivo, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

// Self-hosted via next/font — zero runtime requests to Google, so the page
// can never hang on external font CDNs.
const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "The Bid Box Challenge — Agentic AI for Africa Innovation Challenge",
  description:
    "Build an agent that reads a public tender end to end — sorts the bids, ticks off the documents, checks each bidder, compares prices and writes the report, every finding cited. Then it stops: the committee decides. Prize: a ticket to the MCP Conference in Nairobi.",
  keywords: [
    "Bid Box Challenge",
    "Agentic AI for Africa",
    "MCP",
    "Model Context Protocol",
    "Open Contracting",
    "OCDS",
    "public procurement",
    "AI challenge",
    "Nairobi",
  ],
  authors: [{ name: "The Bid Box Challenge" }],
  openGraph: {
    title: "The Bid Box Challenge — Agentic AI for Africa",
    description:
      "Twenty-six days of committee work in twenty minutes of agent work — with every finding cited, and a hard stop before the award. Prize: a ticket to the MCP Conference, Nairobi.",
    siteName: "The Bid Box Challenge",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "The Bid Box Challenge — Agentic AI for Africa",
    description:
      "Agents prepare the file, committees award the tender. Build an MCP-powered procurement agent for Africa.",
  },
};

export const viewport: Viewport = {
  themeColor: "#d92616",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${archivo.variable} ${inter.variable} ${jetbrains.variable} font-body antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
