import Link from "next/link";
import { PlateButton } from "@/components/PlateButton";
import { PlateGraphic } from "@/components/PlateGraphic";
import { transactionPaths } from "@/lib/checklists";
import { OMV_DISCLOSURE } from "@/lib/services";

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pt-12 pb-10 sm:px-6 sm:pt-16">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-plate">
              Metairie’s public tag agency
            </p>
            <h1 className="mt-4 text-4xl sm:text-5xl lg:text-6xl">
              Skip the OMV line.
              <br />
              Keep your afternoon.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-fog">
              Title transfers, plates, registration, and notary — handled at the
              counter in minutes. Check in online, bring the right documents, and
              we’ll have you out the door.
            </p>
            <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <PlateButton href="/check-in" size="lg">
                Check in online
              </PlateButton>
              <Link
                href="/checklist"
                className="group inline-flex items-center gap-1.5 font-semibold text-ink underline-offset-4 transition-colors hover:text-plate hover:underline"
              >
                Not sure what to bring? Build your checklist
                <span
                  aria-hidden="true"
                  className="transition-transform group-hover:translate-x-0.5"
                >
                  →
                </span>
              </Link>
            </div>
          </div>

          <div className="mx-auto w-full max-w-md lg:max-w-none">
            <PlateGraphic className="w-full [filter:drop-shadow(0_18px_30px_rgba(20,33,61,0.16))]" />
          </div>
        </div>
      </section>

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
                Typical visit
              </dt>
              <dd className="mt-1 font-display text-4xl font-extrabold text-ink">
                ~22 min
              </dd>
              <dd className="mt-1 text-sm text-fog">
                A sample — until we measure it.
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

      {/* Services grid */}
      <section
        aria-labelledby="services-heading"
        className="mx-auto max-w-6xl px-4 py-14 sm:px-6"
      >
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 id="services-heading" className="text-3xl font-extrabold">
              What can we handle?
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
