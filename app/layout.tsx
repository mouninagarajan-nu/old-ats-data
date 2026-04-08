import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { Search, Users, Briefcase, LayoutDashboard } from "lucide-react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NuHire ATS",
  description: "NuLogic Applicant Tracking System",
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
      <body className="min-h-full flex">
        {/* Sidebar */}
        <aside className="w-64 bg-card border-r border-border flex flex-col fixed h-full">
          <div className="p-6 border-b border-border">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">Nu</span>
              </div>
              <span className="font-semibold text-lg">NuHire ATS</span>
            </Link>
          </div>
          <nav className="flex-1 p-4 space-y-1">
            <NavLink href="/" icon={<LayoutDashboard size={18} />} label="Dashboard" />
            <NavLink href="/candidates" icon={<Users size={18} />} label="Candidates" />
            <NavLink href="/jobs" icon={<Briefcase size={18} />} label="Jobs" />
            <NavLink href="/search" icon={<Search size={18} />} label="Search" />
          </nav>
          <div className="p-4 border-t border-border text-xs text-muted-foreground">
            NuLogic Technology Inc.
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 ml-64 min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}

function NavLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
    >
      {icon}
      {label}
    </Link>
  );
}
