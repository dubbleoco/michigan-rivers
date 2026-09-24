import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Michigan Rivers — Live Conditions",
  description:
    "Real-time river flows, water temps, weather forecasts, and salmon & steelhead fishing predictions for West and Northern Michigan tributaries.",
  keywords: "steelhead, salmon, fishing, Michigan rivers, pere marquette, muskegon, manistee, river conditions, fly fishing",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Michigan Rivers",
  },
};

export const viewport: Viewport = {
  themeColor: "#1d4ed8",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-gray-950`}>{children}</body>
    </html>
  );
}
