import type { Metadata } from "next";
import Link from "next/link";
import { ServiceIcon } from "@/components/ServiceIcon";
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
              className="service-card flex h-full flex-col rounded-2xl border border-line bg-paper p-5 transition duration-200 hover:border-ink hover:shadow-[0_16px_30px_-18px_rgba(20,33,61,0.5)] focus-visible:border-ink motion-safe:hover:-translate-y-1 motion-safe:focus-visible:-translate-y-1"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-mist">
                <ServiceIcon slug={path.slug} className="h-[26px] w-[26px]" />
              </span>
              <span className="mt-4 font-display text-lg font-extrabold text-ink">
                {path.label}
              </span>
              <span className="mt-1.5 flex-1 text-sm leading-relaxed text-fog">
                {path.blurb}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
