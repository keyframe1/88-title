import Link from "next/link";
import type { LocalizedTransactionPath } from "@/lib/i18n/content/checklists";
import { ServiceIcon } from "@/components/ServiceIcon";
import { ServiceIllustration } from "@/components/ServiceIllustration";

/**
 * Which transactions get the illustrated header this pass. Kept here (a server
 * module) rather than in the client illustration module so it stays a real Set
 * across the RSC boundary. The rest fall back to the compact ServiceIcon.
 */
const ILLUSTRATED_SLUGS = new Set<string>([
  "title-transfer",
  "new-to-louisiana",
  "registration-renewal",
]);

/**
 * One transaction card for the service grid (homepage + /services). Two layouts
 * that read as one family:
 *
 *  - illustrated: a wide (~3:1) two-tone header illustration whose accent plays
 *    once on scroll-into-view, then the label + blurb below;
 *  - compact: the small ServiceIcon chip whose gesture plays on hover/focus.
 *
 * ILLUSTRATED_SLUGS decides which layout a slug gets. Both share the same card
 * frame, hover lift, and focus ring, so a mixed grid still lines up.
 */
const CARD =
  "service-card flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-paper transition duration-200 hover:border-ink hover:shadow-[0_16px_30px_-18px_rgba(20,33,61,0.5)] focus-visible:border-ink motion-safe:hover:-translate-y-1 motion-safe:focus-visible:-translate-y-1";

export function ServiceCard({ path }: { path: LocalizedTransactionPath }) {
  const illustrated = ILLUSTRATED_SLUGS.has(path.slug);

  return (
    <Link href={`/services/${path.slug}`} className={CARD}>
      {illustrated ? (
        <div className="aspect-[3/1] w-full border-b border-line bg-mist">
          <ServiceIllustration slug={path.slug} className="block h-full w-full" />
        </div>
      ) : null}

      <div className={`flex flex-1 flex-col ${illustrated ? "p-5 pt-4" : "p-5"}`}>
        {illustrated ? null : (
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-mist">
            <ServiceIcon slug={path.slug} className="h-[26px] w-[26px]" />
          </span>
        )}
        <span
          className={`font-display text-lg font-extrabold text-ink ${
            illustrated ? "" : "mt-4"
          }`}
        >
          {path.label}
        </span>
        <span className="mt-1.5 flex-1 text-sm leading-relaxed text-fog">
          {path.blurb}
        </span>
      </div>
    </Link>
  );
}
