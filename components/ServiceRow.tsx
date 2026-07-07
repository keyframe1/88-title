import Link from "next/link";
import type { LocalizedTransactionPath } from "@/lib/i18n/content/checklists";
import { ServiceRowIllustration } from "@/components/ServiceRowIllustration";

/**
 * One transaction rendered as a full-width editorial row for the service index
 * (homepage + /services). No card frame, no index number: rows are separated by
 * hairline rules (see `.service-row` / `.service-index` in globals.css) and the
 * service name is the typographic feature of the section. The ENTIRE row is the
 * link.
 *
 *   Title transfer                                 [ illustration ]
 *   Buying or selling a used vehicle...
 *
 * The grid is deliberately NOT uniform: the illustration alternates side down the
 * list, its scale varies slightly per row (data-scale, sized in CSS with the box
 * reserved from first paint so there is no layout shift), and the row's vertical
 * alignment shifts subtly, so the index reads editorial rather than tabular.
 *
 * On mobile the row stacks: the illustration sits above the text, left-aligned
 * and one calm size. Hover / focus lifts the whole row a hair and replays the
 * illustration's one-shot accent (both handled in CSS, static under reduced
 * motion). `index` drives the variation, the illustration side, and the per-row
 * scroll-in stagger.
 */

/** Illustration scale per row (maps to `.svc-row-illus[data-scale]` in CSS). */
const ILLUS_SCALE = ["m", "l", "s", "m", "l", "s", "m"] as const;
/** Row cross-axis alignment per row, kept subtle so it never reads as a table. */
const ROW_ALIGN = [
  "sm:items-center",
  "sm:items-start",
  "sm:items-end",
  "sm:items-start",
  "sm:items-center",
  "sm:items-end",
  "sm:items-center",
] as const;

export function ServiceRow({
  path,
  index,
}: {
  path: LocalizedTransactionPath;
  index: number;
}) {
  // Alternate the illustration side down the list. DOM order is always
  // illustration-then-text, so flex-row-reverse floats it to the right.
  const illusOnLeft = index % 2 === 1;
  const scale = ILLUS_SCALE[index % ILLUS_SCALE.length];
  const align = ROW_ALIGN[index % ROW_ALIGN.length];

  return (
    <Link
      href={`/services/${path.slug}`}
      className={[
        "service-row group flex flex-col gap-4 px-3 py-6 sm:gap-8 sm:px-4 sm:py-8",
        illusOnLeft ? "sm:flex-row" : "sm:flex-row-reverse",
        align,
      ].join(" ")}
    >
      <span data-scale={scale} className="svc-row-illus shrink-0">
        <ServiceRowIllustration
          slug={path.slug}
          index={index}
          className="block h-full w-full"
        />
      </span>

      <span className="min-w-0 sm:flex-1">
        <span className="block font-display text-2xl font-extrabold leading-[1.1] text-ink sm:text-3xl">
          {path.label}
        </span>
        <span className="mt-2 block text-sm leading-relaxed text-fog sm:text-base">
          {path.blurb}
        </span>
      </span>
    </Link>
  );
}
