import Link from "next/link";
import type { LocalizedTransactionPath } from "@/lib/i18n/content/checklists";
import { ServiceRowIllustration } from "@/components/ServiceRowIllustration";

/**
 * One transaction rendered as a full-width editorial row for the service index
 * (homepage + /services). No card frame: rows are separated by hairline rules
 * (see `.service-row` / `.service-index` in globals.css) and the service name is
 * the typographic feature of the section. The ENTIRE row is the link.
 *
 *   [ 01 ]  Title transfer                         [ illustration ]
 *           Buying or selling a used vehicle...
 *
 * On mobile the row stacks: the illustration moves above the text, left-aligned
 * and smaller. Hover / focus eases in a warm tint and replays the illustration's
 * one-shot accent (both handled in CSS). `index` drives the displayed number and
 * the per-row scroll-in stagger.
 */
export function ServiceRow({
  path,
  index,
}: {
  path: LocalizedTransactionPath;
  index: number;
}) {
  const number = String(index + 1).padStart(2, "0");

  return (
    <Link
      href={`/services/${path.slug}`}
      className="service-row group grid grid-cols-1 gap-4 px-3 py-6 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-start sm:gap-8 sm:px-4 sm:py-8"
    >
      <span className="order-2 font-display text-sm font-bold tabular-nums tracking-[0.2em] text-plate sm:order-none sm:pt-1.5">
        {number}
      </span>

      <span className="order-3 min-w-0 sm:order-none">
        <span className="block font-display text-2xl font-extrabold leading-[1.1] text-ink sm:text-3xl">
          {path.label}
        </span>
        <span className="mt-2 block text-sm leading-relaxed text-fog sm:text-base">
          {path.blurb}
        </span>
      </span>

      <span className="order-1 block aspect-[4/3] w-[116px] shrink-0 self-start sm:order-none sm:w-[176px] sm:self-center">
        <ServiceRowIllustration
          slug={path.slug}
          index={index}
          className="block h-full w-full"
        />
      </span>
    </Link>
  );
}
