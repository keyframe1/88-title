import type { Metadata } from "next";
import Link from "next/link";
import { transactionPaths } from "@/lib/checklists";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Title & Registration Services in Metairie, LA",
  description:
    "Everything 88 Title handles in Metairie: title transfers, new-to-Louisiana registrations, duplicate titles, inherited vehicles, renewals, plates, and notary. Learn how each one works.",
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
        Choose a transaction to learn how it works, what to bring, and the
        questions people ask most. When you are ready,{" "}
        <Link
          href="/checklist"
          className="font-semibold text-ink underline-offset-2 hover:text-plate hover:underline"
        >
          build your checklist
        </Link>{" "}
        and check in online.
      </p>

      <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {transactionPaths.map((path) => (
          <li key={path.slug}>
            <Link
              href={`/services/${path.slug}`}
              className="group flex h-full flex-col rounded-2xl border border-line bg-paper p-5 transition-colors hover:border-ink focus-visible:border-ink"
            >
              <span className="font-display text-lg font-extrabold text-ink">
                {path.label}
              </span>
              <span className="mt-1.5 flex-1 text-sm leading-relaxed text-fog">
                {path.blurb}
              </span>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-ink">
                Learn how it works
                <svg
                  aria-hidden="true"
                  viewBox="0 0 20 20"
                  className="h-4 w-4 text-fog transition-transform motion-safe:group-hover:translate-x-0.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    d="M7 4l6 6-6 6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
