import Link from "next/link";
import { HomeHero } from "@/components/HomeHero";
import { PlateButton } from "@/components/PlateButton";
import { ServiceIcon } from "@/components/ServiceIcon";
import { LiveQueue } from "@/components/checkin/LiveQueue";
import { ReturningBanner } from "@/components/checkin/ReturningBanner";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { transactionPaths } from "@/lib/checklists";
import { OMV_DISCLOSURE } from "@/lib/services";

export default function HomePage() {
  return (
    <>
      {/* Resume an active check-in — collapses to nothing when there's none. */}
      <ReturningBanner className="mx-auto max-w-6xl px-4 pt-6 sm:px-6" />

      {/* Hero */}
      <HomeHero />

      {/* Fact bar */}
      <section aria-label="At a glance" className="border-y border-line bg-mist">
        <div className="mx-auto max-w-6xl px-4 py-9 sm:px-6">
          <dl className="grid gap-8 sm:grid-cols-3">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-fog">
                Public tag fee
              </dt>
              <dd className="mt-1 font-display text-4xl font-extrabold text-ink">
                $23
              </dd>
              <dd className="mt-1 text-sm text-fog">
                Shown as its own line, every time.
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-fog">
                The wait
              </dt>
              <dd className="mt-1 font-display text-4xl font-extrabold text-ink">
                Skip it
              </dd>
              <dd className="mt-1 text-sm text-fog">
                Check in online and hold your place from your phone.
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-fog">
                Average checklist
              </dt>
              <dd className="mt-1 font-display text-4xl font-extrabold text-ink">
                4 items
              </dd>
              <dd className="mt-1 text-sm text-fog">
                <Link
                  href="/checklist"
                  className="font-semibold text-ink underline underline-offset-4 hover:text-plate"
                >
                  Know before you go
                </Link>
              </dd>
            </div>
          </dl>
          <p className="mt-7 max-w-3xl text-xs leading-relaxed text-fog">
            <span className="font-semibold text-ink">About the $23:</span>{" "}
            {OMV_DISCLOSURE}
          </p>
        </div>
      </section>

      {/* Live queue */}
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
            Lobby view →
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
            All services →
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

      {/* Closing CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <div className="rounded-3xl bg-ink px-6 py-10 text-center sm:py-14">
          <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
            Ready when you are.
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-white/70">
            Check in online and bring the right documents. We’ll keep the line
            short and your afternoon yours.
          </p>
          <div className="mt-7 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <PlateButton href="/check-in" size="lg" variant="red">
              Check in online
            </PlateButton>
            <Link
              href="/checklist"
              className="font-semibold text-white underline-offset-4 hover:underline"
            >
              See what to bring →
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
