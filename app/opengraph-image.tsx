import { OG_ALT, OG_SIZE, OG_CONTENT_TYPE, renderBrandCard } from "@/lib/og/card";

// The Open Graph card. A standalone route module (it does not re-export the
// twitter route, or vice versa) so Next reliably injects og:image; the shared
// generator lives in lib/og/card.tsx.
export const alt = OG_ALT;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderBrandCard();
}
