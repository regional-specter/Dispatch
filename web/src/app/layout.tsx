import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Dispatch — Air Freight Intelligence",
  description: "Predict engine failures, forecast flight delays, and optimize cargo operations.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="min-h-full flex flex-col antialiased">
        <header className="border-b border-[#E8EAED] bg-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-lg font-semibold text-[#111827]">Dispatch</span>
              <span className="rounded-full bg-[#EFF6FF] px-2 py-0.5 text-xs font-medium text-[#2563EB]">Beta</span>
            </Link>
            <nav className="flex items-center gap-6 text-sm text-[#6B7280]">
              <Link href="/" className="hover:text-[#111827]">Dashboard</Link>
              <Link href="/delays" className="hover:text-[#111827]">Delays</Link>
              <Link href="/engines" className="hover:text-[#111827]">Engines</Link>
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-[#E8EAED] bg-white">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-6 py-4 text-xs text-[#6B7280]">
            <span>Dispatch · Air freight ML dashboard</span>
            <span>Data: BTS 2024 demo · NASA C-MAPSS demo</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
