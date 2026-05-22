import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { getBrandingSettings } from "@/src/lib/branding";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export function generateMetadata(): Metadata {
  const branding = getBrandingSettings();

  return {
    title: `${branding.brandName} — Facility Booking`,
    description: branding.brandDescription.replace(/\s+/g, " "),
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans bg-white text-ink">
        {children}
      </body>
    </html>
  );
}
