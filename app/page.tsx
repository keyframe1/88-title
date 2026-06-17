import type { Metadata } from "next";
import Link from "next/link";
import { HomeHero } from "@/components/HomeHero";
import { ServiceIcon } from "@/components/ServiceIcon";
import { LiveQueue } from "@/components/checkin/LiveQueue";
import { ReturningBanner } from "@/components/checkin/ReturningBanner";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { transactionPaths } from "@/lib/checklists";
import { OMV_DISCLOSURE } from "@/lib/services";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "88 Title | Public Tag Agency in Metairie, LA",
  description:
    "Skip the OMV line. 88 Title handles Louisiana title transfers, plates, registration, and notary at the counter in Metairie. Check in online and bring the right documents.",
  path: "/",
  absoluteTitle: true,
});

export default function HomePage() {
  return (
    <>
      {/* Resume an active check-in — collapses to nothing when there's none. */}
      <ReturningBanner className="mx-auto max-w-6xl px-4 pt-6 sm:px-6" />

      {/* Hero */}
      <HomeHero />

      {/* Public tag fee: the one compliance fact, kept slim and quiet. Shares the
          hero's #FAFAF8 paper (bg-haze) with no top border so the traffic band
          resolves into it seamlessly. */}
      <section aria-label="Public tag fee" className="border-b border-line bg-haze">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 sm:flex-row sm:items-center sm:gap-6 sm:px-6">
          <div className="flex items-baseline gap-3">
            <span className="font-display text-3xl font-extrabold text-ink">
              $23
            </span>
            <span className="text-sm font-semibold text-ink">
              Public tag fee, shown as its own line, every time.
            </span>
          </div>
          <p className="text-xs leading-relaxed text-fog sm:border-l sm:border-line sm:pl-6">
            <span className="font-semibold text-ink">About the $23:</span>{" "}
            {OMV_DISCLOSURE}
          </p>
        </div>
      </section>

      {/* Live queue — the differentiator. */}
      <section
        aria-labelledby="live-heading"
        className="mx-auto max-w-6xl px-4 pt-14 sm:px-6"
      >
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 id="live-heading" className="text-3xl font-extrabold">
              The line, live
            </h2>
            <p className="mt-2 max-w-xl text-fog">
              See how busy we are right now. Check in from your phone and
              we&rsquo;ll notify you when you&rsquo;re up.
            </p>
          </div>
          <Link
            href="/lobby"
            className="hidden shrink-0 text-sm font-semibold text-ink transition-colors hover:text-plate sm:inline"
          >
            Lobby view
          </Link>
        </div>
        <div className="mt-6">
          <InstallPrompt placement="home" />
        </div>
        <div className="mt-4">
          <LiveQueue variant="compact" />
        </div>
      </section>

      {/* Services grid */}
      <section
        aria-labelledby="services-heading"
        className="mx-auto max-w-6xl px-4 py-14 sm:px-6"
      >
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 id="services-heading" className="text-3xl font-extrabold">
              What do you need done?
            </h2>
            <p className="mt-2 max-w-xl text-fog">
              Pick a transaction to see exactly what to bring and how it works.
            </p>
          </div>
          <Link
            href="/services"
            className="hidden shrink-0 text-sm font-semibold text-ink transition-colors hover:text-plate sm:inline"
          >
            All services
          </Link>
        </div>

        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {transactionPaths.map((path) => {
            const count = path.items.length;
            return (
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
                  <span className="mt-4 text-sm text-fog">
                    <span className="font-semibold text-ink">{count}</span>{" "}
                    {count === 1 ? "item" : "items"} to bring
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}
