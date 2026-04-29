import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Natured Tranquility — Facility Booking",
  description:
    "Wellness facility management dashboard for booking karaoke, gym, yoga, and lounge sessions.",
};

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
        <div className="flex flex-1 w-full bg-white text-ink">
          <Sidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <Header />
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
