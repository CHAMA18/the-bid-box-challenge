import type { Metadata } from "next";
import { Newsreader, Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

// Self-hosted via next/font — zero runtime requests to Google, so the page
// can never hang on external font CDNs.
const newsreader = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-newsreader",
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
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
    "Build an agentic AI that evaluates public tenders. Governance track: Health, Finance, Digital Economy & Future of Work. MCP + open-weights, OCDS across 9 African nations. Submissions close 15th October.",
  keywords: [
    "The Bid Box Challenge",
    "Agentic AI",
    "Africa",
    "MCP",
    "Model Context Protocol",
    "OCDS",
    "public procurement",
    "open-weights",
    "hackathon",
  ],
  authors: [{ name: "Agentic AI for Africa Innovation Challenge" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "The Bid Box Challenge — Agentic AI for Africa",
    description:
      "Agentic AI that evaluates public tenders. Live agent simulation, judging rubric, prizes & Nairobi Summit accelerator.",
    siteName: "The Bid Box Challenge",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "The Bid Box Challenge — Agentic AI for Africa",
    description:
      "Build an agentic AI that evaluates public tenders. MCP + open-weights. Submissions close 15th October.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${newsreader.variable} ${jakarta.variable} ${jetbrains.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
