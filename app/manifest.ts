import type { MetadataRoute } from "next";

/**
 * PWA web app manifest. Next.js serves this at /manifest.webmanifest and injects
 * the <link rel="manifest"> automatically (no manual tag needed in layout.tsx).
 *
 * Icons reference the files already in /public (see public/README.md) — they are
 * NOT regenerated here. theme_color matches the brand ink navy used by the
 * <meta name="theme-color"> in app/layout.tsx; background_color is the paper
 * white the splash screen flashes before the app paints.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "88 Title",
    short_name: "88 Title",
    description:
      "Metairie's public tag agency. Check in online, see the live line, and get notified the moment you're up.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    theme_color: "#14213D",
    background_color: "#FAFAF8",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
