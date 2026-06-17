import type { Metadata } from "next";
import Link from "next/link";
import { transactionPaths } from "@/lib/checklists";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Everything 88 Title handles in Metairie — title transfers, new-to-Louisiana registrations, duplicate titles, inherited vehicles, renewals, plates, and notary.",
};

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
        {transactionPaths.map((path) => (
          <li key={path.slug}>
            <Link
              href={`/services/${path.slug}`}
              className="group flex h-full flex-col rounded-2xl border border-line bg-paper p-5 transition-colors hover:border-ink"
            >
              <span className="font-display text-lg font-extrabold text-ink">
                {path.label}
              </span>
              <span className="mt-1.5 flex-1 text-sm leading-relaxed text-fog">
                {path.blurb}
              </span>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-ink">
                What to bring
                <span
                  aria-hidden="true"
                  className="transition-transform group-hover:translate-x-0.5"
                >
                  →
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
