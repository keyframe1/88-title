import type { Metadata } from "next";
import Link from "next/link";
import { PlateButton } from "@/components/PlateButton";
import { services } from "@/lib/services";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Clear menu pricing for 88 Title in Metairie. The $23 public tag fee is statutory and always shown as its own line. No personalized totals, no tax estimates.",
};

/** Whole-dollar display only, never a computed total. */
function formatUSD(amount: number): string {
  return `$${amount}`;
}

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-plate">
        Pricing
      </p>
      <h1 className="mt-3 text-4xl font-extrabold sm:text-5xl">
        Clear prices, up front
      </h1>
      <p className="mt-4 max-w-prose text-lg leading-relaxed text-fog">
        Pick the services you need. Each is its own line. The $23 public tag
        fee is set by the state and always shown separately. We never merge it
        into another amount or mark it up.
      </p>

      <ul className="mt-10 divide-y divide-line overflow-hidden rounded-2xl border border-line">
        {services.map((service) => (
          <li key={service.id} className={service.locked ? "bg-mist" : "bg-paper"}>
            <div className="flex items-baseline justify-between gap-4 p-5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-display text-lg font-extrabold text-ink">
                    {service.label}
                  </span>
                  {service.locked ? (
                    <span className="inline-flex items-center rounded-full border border-ink/20 bg-paper px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-ink">
                      Set by the state
                    </span>
                  ) : null}
                </div>
                {service.note ? (
                  <p className="mt-2 max-w-prose text-sm leading-relaxed text-fog">
                    {service.note}
                  </p>
                ) : null}
              </div>
              <div className="shrink-0 text-right">
                <span className="font-display text-2xl font-extrabold text-ink">
                  {formatUSD(service.amount)}
                </span>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-8 rounded-2xl border border-line bg-paper p-5 text-sm leading-relaxed text-fog">
        <p>
          <span className="font-semibold text-ink">No surprises.</span> The
          service fees are listed above. Your final total, including any state
          fees, is confirmed at the counter. We don’t estimate state tax or quote
          a personalized total online.
        </p>
      </div>

      <div className="mt-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        <PlateButton href="/check-in" size="lg">
          Check in online
        </PlateButton>
        <Link
          href="/checklist"
          className="font-semibold text-ink underline-offset-4 transition-colors hover:text-plate hover:underline"
        >
          See what to bring →
        </Link>
      </div>
    </div>
  );
}
