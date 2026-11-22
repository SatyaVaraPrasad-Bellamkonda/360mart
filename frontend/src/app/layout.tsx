import type { Metadata } from "next";
import { Suspense } from "react";
import { Plus_Jakarta_Sans } from "next/font/google";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { BackendCallConsole } from "@/components/dev/BackendCallConsole";
import { ConsentGate } from "@/components/legal/ConsentGate";
import { LocationHost } from "@/components/location/LocationHost";
import { LocationNotice } from "@/components/location/LocationNotice";
import { SiteFooter } from "@/components/SiteFooter";
import { Toaster } from "@/components/Toaster";
import { SiteHeader } from "@/components/SiteHeader";
import { mapConfig } from "@/lib/maps/config";
import { SITE } from "@/lib/site";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: SITE.title,
    template: `%s | ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  openGraph: {
    type: "website",
    siteName: SITE.name,
    locale: SITE.locale,
    url: "/",
    title: SITE.title,
    description: SITE.description,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE.title,
    description: SITE.description,
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-IN" className={`${jakarta.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <AuthProvider>
          <SiteHeader />
          <Suspense fallback={null}>
            <LocationNotice />
          </Suspense>
          <main className="flex-1">{children}</main>
          <SiteFooter />
          <Toaster />
          <ConsentGate />
          {/* The one "Deliver to" sheet + the first-visit rule (reads the URL, so it has its own boundary). */}
          <Suspense fallback={null}>
            <LocationHost map={mapConfig()} />
          </Suspense>
          {process.env.NODE_ENV === "development" && <BackendCallConsole />}
        </AuthProvider>
      </body>
    </html>
  );
}
