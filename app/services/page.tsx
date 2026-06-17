import type { Metadata } from "next";
import Link from "next/link";
import { transactionPaths } from "@/lib/checklists";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Title & Registration Services in Metairie, LA",
  description:
    "Everything 88 Title handles in Metairie: title transfers, new-to-Louisiana registrations, duplicate titles, inherited vehicles, renewals, plates, and notary.",
  path: "/services",
});

export default function ServicesPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-plate">
        Services
      </p>
      <h1 className="mt-3 text-4xl font-extrabold sm:text-5xl">What we handle</h1>
      <p className="mt-4 max-w-2xl text-lg leading-relaxed text-fog">
        Choose a transaction to see exactly what to bring and how it works. Every
        path is built to get you in and out without a second trip.
      </p>

      <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {transactionPaths.map((path) => {
          const count = path.items.length;
          return (
            <li key={path.slug}>
              <Link
                href={`/services/${path.slug}`}
                className="flex h-full flex-col rounded-2xl border border-line bg-paper p-5 transition-colors hover:border-ink focus-visible:border-ink"
              >
                <span className="font-display text-lg font-extrabold text-ink">
                  {path.label}
                </span>
                <span className="mt-1.5 flex-1 text-sm leading-relaxed text-fog">
                  {path.blurb}
                </span>
                <span className="mt-4 text-sm text-fog">
                  <span className="font-semibold text-ink">{count}</span>{" "}
                  {count === 1 ? "item" : "items"} to bring
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
