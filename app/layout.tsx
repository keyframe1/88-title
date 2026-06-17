import type { Metadata, Viewport } from "next";
import { Archivo, Inter } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ServiceWorkerRegistrar } from "@/components/pwa/ServiceWorkerRegistrar";

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

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "88 Title | Public Tag Agency in Metairie, LA",
    template: "%s | 88 Title",
  },
  description:
    "Skip the OMV line. 88 Title handles Louisiana title transfers, plates, registration, and notary at the counter in Metairie. Check in online and bring the right documents.",
  applicationName: "88 Title",
  // PWA: when installed on iOS, run standalone with our title and a light status
  // bar (paper-white app background). The web app manifest (app/manifest.ts) and
  // its <link> are injected automatically by Next.js.
  appleWebApp: {
    capable: true,
    title: "88 Title",
    statusBarStyle: "default",
  },
  icons: {
    // All icons live in /public (single source of truth the PWA manifest pass
    // will reuse). Modern browsers prefer the SVG; the .ico is multi-res
    // (16/32/48) for legacy browsers and carries sizes:"any" so SVG-capable
    // browsers skip downloading it; the 32px PNG is a crisp non-SVG fallback.
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon-32.png", type: "image/png", sizes: "32x32" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  openGraph: {
    title: "88 Title | Public Tag Agency in Metairie, LA",
    description:
      "Skip the OMV line. Check in online, bring the right documents, and keep your afternoon.",
    url: "/",
    siteName: "88 Title",
    locale: "en_US",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#14213d",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${archivo.variable} ${inter.variable}`}>
      <body className="flex min-h-dvh flex-col antialiased">
        <ServiceWorkerRegistrar />
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
