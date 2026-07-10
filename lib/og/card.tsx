import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { BRAND_MARK_PATH, BRAND_MARK_VIEWBOX } from "@/lib/brand-mark";

/**
 * The shared social-card generator behind both the Open Graph and Twitter image
 * routes. It lives OUTSIDE the app/ tree on purpose: the two route files
 * (app/opengraph-image.tsx, app/twitter-image.tsx) each import and re-emit it
 * with their own default + config exports. Re-exporting one route file's default
 * from the other stops Next from registering the first route's <head> tags
 * (og:image silently vanishes while twitter:image survives), so they must be
 * two independent route modules that share this plain helper instead.
 *
 * One 1200x630 card, built from the brand system so a shared 88title.com link
 * looks like the site: ink navy field, the faint diagonal-rule "paper" texture,
 * the drawn 88 monogram large as a watermark, the wordmark lockup, the promise
 * line in Overpass, and the plate-red pinstripe the footer signs every page with.
 */

export const OG_ALT =
  "88 Title — Metairie's public tag agency. Skip the line. Keep your afternoon.";
export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

const INK = "#14213d";
const PAPER = "#ffffff";
const PLATE = "#c8102e";

/** Build the ImageResponse. Node runtime (the routes' default) so we can read
    the Overpass font files and render the display type as the real face. */
export async function renderBrandCard(): Promise<ImageResponse> {
  const [overpassBold, overpassExtraBold] = await Promise.all([
    readFile(join(process.cwd(), "assets/fonts/Overpass-Bold.ttf")),
    readFile(join(process.cwd(), "assets/fonts/Overpass-ExtraBold.ttf")),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          position: "relative",
          background: INK,
          fontFamily: "Overpass",
          overflow: "hidden",
        }}
      >
        {/* Faint diagonal-rule paper texture, the marketing-surface signature. */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            backgroundImage:
              "repeating-linear-gradient(135deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 22px)",
          }}
        />

        {/* The 88 mark, large, paper as a watermark bleeding off the right edge.
            Inline SVG (Satori renders it natively) so the drawn geometry stays
            crisp at any scale. */}
        <svg
          width={760}
          height={553}
          viewBox={BRAND_MARK_VIEWBOX}
          style={{ position: "absolute", right: -140, top: 40, opacity: 0.05 }}
        >
          <path d={BRAND_MARK_PATH} fill={PAPER} />
        </svg>

        {/* Top: the wordmark lockup. */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            padding: "70px 80px 0",
          }}
        >
          <svg width={72} height={52} viewBox={BRAND_MARK_VIEWBOX}>
            <path d={BRAND_MARK_PATH} fill={PAPER} />
          </svg>
          <div
            style={{
              display: "flex",
              fontSize: 40,
              fontWeight: 800,
              letterSpacing: "-0.01em",
              color: PAPER,
            }}
          >
            88 Title
          </div>
        </div>

        {/* Middle: the promise line, the one loud statement. */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            padding: "0 80px",
            marginTop: -30,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 88,
              fontWeight: 800,
              lineHeight: 1.02,
              letterSpacing: "-0.02em",
              color: PAPER,
            }}
          >
            Skip the line.
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 88,
              fontWeight: 800,
              lineHeight: 1.02,
              letterSpacing: "-0.02em",
              color: PAPER,
            }}
          >
            Keep your afternoon.
          </div>
        </div>

        {/* Bottom: the descriptor, then the plate-red pinstripe seam. */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: 30,
              fontWeight: 700,
              letterSpacing: "0.01em",
              color: "rgba(255,255,255,0.68)",
              padding: "0 80px 64px",
            }}
          >
            Metairie&apos;s public tag agency
          </div>
          <div style={{ display: "flex", height: 12, background: PLATE }} />
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [
        { name: "Overpass", data: overpassBold, style: "normal", weight: 700 },
        {
          name: "Overpass",
          data: overpassExtraBold,
          style: "normal",
          weight: 800,
        },
      ],
    },
  );
}
