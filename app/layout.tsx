import type { Metadata } from "next";
import type { ReactNode } from "react";
import { connection } from "next/server";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { PreferencesProvider } from "./components/PreferencesProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Business OS",
  description: "Business management platform",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  await connection();

  return (
    <html
      lang="en"
      data-theme="light"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col"><PreferencesProvider>{children}</PreferencesProvider></body>
    </html>
  );
}
