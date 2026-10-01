import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@/components/analytics";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getSiteUrl } from "@/lib/site-url";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: "Career Platform",
  description: "Resume, projects, and contact details.",
};

type RootLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  const initialYear = new Date().getFullYear();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full bg-slate-50`}
    >
      <body className="min-h-full bg-slate-50 font-sans text-slate-950 antialiased">
        <div className="flex min-h-screen flex-col">
          <SiteHeader />
          <main id="main-content" className="flex flex-1">
            {children}
          </main>
          <SiteFooter initialYear={initialYear} />
        </div>
        <Analytics />
      </body>
    </html>
  );
}
