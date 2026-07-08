/**
 * The 88 Title monogram — geometry source of truth.
 *
 * The mark is a custom-drawn double-8, not typed characters: each 8 is built
 * from two rounded-rectangle lobes (the stamped-plate stencil language the
 * brand already speaks) whose overlap produces the figure-8 waist, with the
 * counters punched as rounded windows. The top lobe is set slightly narrower
 * than the bottom (classic numeral optics: it keeps the digit from looking
 * top-heavy), horizontal strokes are drawn a touch thinner than verticals
 * (horizontals read heavier at equal weight), and the pair is kerned tight so
 * the two 8s read as one monogram. By happy accident of the proportions the
 * full mark measures exactly 88 x 64 units.
 *
 * Everything renders from a single `<path>`: outer contours wind clockwise,
 * counters counterclockwise, so a plain nonzero fill produces the holes. Pure
 * TS (no JSX) so the icon-generation script can import the same outlines the
 * React component renders — one geometry, every surface.
 */

const H = 64; // mark height
const BOT_W = 42; // bottom lobe width
const TOP_W = 39; // top lobe width (optically narrower)
const TOP_H = 30; // top lobe height
const BOT_Y = 28; // bottom lobe top edge (2-unit overlap creates the waist)
const SX = 9; // vertical stroke weight
const SY = 8.2; // horizontal stroke weight (optically thinner)
const R_OUT = 13; // lobe corner radius
const R_TOP = 4.5; // top counter radius
const R_BOT = 5.5; // bottom counter radius
const GAP = 4; // kern between the two 8s
const DX = BOT_W + GAP; // second-8 offset (46)

export const BRAND_MARK_WIDTH = DX + BOT_W; // 88
export const BRAND_MARK_HEIGHT = H; // 64
export const BRAND_MARK_VIEWBOX = `0 0 ${BRAND_MARK_WIDTH} ${BRAND_MARK_HEIGHT}`;

/** Rounded-rectangle subpath. `hole` winds it counterclockwise so it punches
    a counter out of the surrounding clockwise contour under nonzero fill. */
function lobe(
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  hole = false,
): string {
  if (hole) {
    return (
      `M ${x + r} ${y} A ${r} ${r} 0 0 0 ${x} ${y + r} V ${y + h - r} ` +
      `A ${r} ${r} 0 0 0 ${x + r} ${y + h} H ${x + w - r} ` +
      `A ${r} ${r} 0 0 0 ${x + w} ${y + h - r} V ${y + r} ` +
      `A ${r} ${r} 0 0 0 ${x + w - r} ${y} Z`
    );
  }
  return (
    `M ${x + r} ${y} H ${x + w - r} A ${r} ${r} 0 0 1 ${x + w} ${y + r} ` +
    `V ${y + h - r} A ${r} ${r} 0 0 1 ${x + w - r} ${y + h} H ${x + r} ` +
    `A ${r} ${r} 0 0 1 ${x} ${y + h - r} V ${y + r} ` +
    `A ${r} ${r} 0 0 1 ${x + r} ${y} Z`
  );
}

/** One 8 with its left edge at `x0`: two lobes, two counters. */
function eight(x0: number): string {
  const topX = x0 + (BOT_W - TOP_W) / 2; // top lobe centered over the bottom
  return [
    lobe(topX, 0, TOP_W, TOP_H, R_OUT),
    lobe(x0, BOT_Y, BOT_W, H - BOT_Y, R_OUT),
    lobe(topX + SX, SY, TOP_W - 2 * SX, TOP_H - 2 * SY, R_TOP, true),
    lobe(x0 + SX, BOT_Y + SY, BOT_W - 2 * SX, H - BOT_Y - 2 * SY, R_BOT, true),
  ].join(" ");
}

/** The full monogram as one path (`fill-rule` nonzero, the SVG default). */
export const BRAND_MARK_PATH = `${eight(0)} ${eight(DX)}`;
