import { OG_ALT, OG_SIZE, OG_CONTENT_TYPE, renderBrandCard } from "@/lib/og/card";

// The Twitter/X card reuses the exact same generator as the Open Graph route,
// but as its own independent route module (see the note in lib/og/card.tsx on
// why the two routes must not re-export each other).
export const alt = OG_ALT;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderBrandCard();
}
