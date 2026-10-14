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
  title: "Galina Express — Cross-Border E-Commerce Enabler in Iraq",
  description:
    "Galina Express connects merchants from Türkiye, China, the GCC & Europe to 45 million Iraqi consumers — integrated air & road freight, customs, escrow payments and last-mile delivery under one roof.",
  keywords: [
    "Galina Express",
    "logistics",
    "Iraq",
    "cross-border e-commerce",
    "freight",
    "air cargo",
    "last-mile delivery",
    "customs clearance",
    "escrow payments",
    "GRAND Guarantee",
  ],
  authors: [{ name: "Galina Express" }],
  openGraph: {
    title: "Galina Express — Connecting Global Sellers to Local Buyers",
    description:
      "Integrated cross-border logistics, flexible payments and digital trust for the Iraqi market. Track shipments live, get instant quotes, ship in 48 hours.",
    siteName: "Galina Express",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Galina Express — Cross-Border E-Commerce Enabler in Iraq",
    description:
      "Integrated freight, customs, escrow payments and last-mile delivery between Türkiye, China, the GCC, Europe and Iraq.",
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
