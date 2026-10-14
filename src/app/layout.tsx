import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
