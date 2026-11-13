import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { SetupNotice } from "@/components/SetupNotice";
import { VercelInsights } from "@/components/VercelInsights";
import { ConnectionNotice } from "@/components/ConnectionNotice";
import { Toaster } from "@/components/Toast";
import { isConfigured } from "@/lib/env";
import { BRAND } from "@/lib/brand";
import { getViewer } from "@/lib/queries";
import { sans, serif } from "./fonts";

export const metadata: Metadata = {
  title: { default: `${BRAND.name}: ${BRAND.tagline}`, template: `%s · ${BRAND.name}` },
  description: BRAND.description,
  applicationName: BRAND.name,
  openGraph: { title: BRAND.name, description: BRAND.tagline, siteName: BRAND.name, type: "website" },
};

export const viewport: Viewport = { themeColor: "#F6F1E7", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const viewer = isConfigured ? await getViewer() : null;
  return (
    // data-scroll-behavior: Next.js 16 no longer turns off our smooth scrolling during page changes
    // unless asked; with it, a new page starts at the top instantly while in-page scrolling stays smooth.
    <html lang="en" data-scroll-behavior="smooth" className={`${serif.variable} ${sans.variable}`}>
      <body className="flex min-h-screen flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-[3px] focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-semibold"
        >
          Skip to content
        </a>
        <Header viewer={viewer} />
        <ConnectionNotice />
        <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">{isConfigured ? children : <SetupNotice />}</main>
        <BottomNav role={viewer?.profile.role ?? null} handle={viewer?.profile.handle ?? null} />
        <Toaster />
        {/* Production only: preview deployments share the same monthly allowance. */}
        {process.env.VERCEL_ENV === "production" && <VercelInsights />}
      </body>
    </html>
  );
}
