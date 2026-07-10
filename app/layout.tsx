import type { Metadata, Viewport } from "next";
import { Overpass, Inter } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegistrar } from "@/components/pwa/ServiceWorkerRegistrar";
import { SOCIAL_CARD } from "@/lib/seo";

// Display face: Overpass (a Highway-Gothic-derived grotesque, fitting for a tag
// agency). Variable font, so every weight 600–900 the display system uses is one
// file; next/font emits a size-adjusted fallback automatically, so swapping in
// the web font causes no layout shift. Body stays Inter, unchanged.
const overpass = Overpass({
  subsets: ["latin"],
  variable: "--font-overpass",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// The canonical production origin. Env can override it for previews, but the
// fallback is the real domain (never localhost) so social/OG URLs always
// resolve absolute even when the env var is absent at build time.
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://88title.com";

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
    // Explicit (not file-auto): this openGraph object would otherwise replace
    // the file-injected image and drop og:image site-wide. See SOCIAL_CARD.
    images: [SOCIAL_CARD],
  },
  // Large-image card. Same generated art, served from the dedicated
  // /twitter-image route; declared explicitly for the same replace-not-merge
  // reason as openGraph above.
  twitter: {
    card: "summary_large_image",
    title: "88 Title | Public Tag Agency in Metairie, LA",
    description:
      "Skip the OMV line. Check in online, bring the right documents, and keep your afternoon.",
    images: [{ ...SOCIAL_CARD, url: "/twitter-image" }],
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
    <html lang="en" className={`${overpass.variable} ${inter.variable}`}>
      <body className="flex min-h-dvh flex-col antialiased">
        <ServiceWorkerRegistrar />
        {/* Each section supplies its own chrome: the customer site (header +
            footer) lives in app/(site), the staff console and dealer portal in
            their own group layouts. */}
        {children}
      </body>
    </html>
  );
}
