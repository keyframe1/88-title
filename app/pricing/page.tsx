import type { Metadata } from "next";
import { ServiceFeeCalculator } from "@/components/ServiceFeeCalculator";
import { OMV_DISCLOSURE } from "@/lib/services";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Service Fees in Metairie, LA",
  description:
    "Add up 88 Title’s service fees in Metairie. The $23 public tag fee is statutory and always shown as its own line. Service fees only, with no tax estimates and no personalized totals.",
  path: "/pricing",
});

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-plate">
        Service fees
      </p>
      <h1 className="mt-3 text-4xl font-extrabold sm:text-5xl">
        Add up your service fees
      </h1>
      <p className="mt-4 max-w-prose text-lg leading-relaxed text-fog">
        Pick the services you need and watch the subtotal of 88 Title’s service
        fees update as you go. The $23 public tag fee is set by the state and
        always shown on its own line, never merged in or marked up. State fees
        and taxes vary by vehicle and parish, so those are handled at the
        counter, not estimated here.
      </p>

      {/* The one statutory fee and the customer's OMV option, kept prominent.
          Relocated from the homepage so the fees page is its single home. */}
      <section
        aria-label="Public tag fee"
        className="mt-8 rounded-2xl border border-ink/15 bg-mist p-6 sm:p-7"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-7">
          <div className="flex items-baseline gap-3 sm:shrink-0">
            <span className="font-display text-4xl font-extrabold text-ink">
              $23
            </span>
            <span className="max-w-[12rem] text-sm font-semibold leading-snug text-ink">
              Public tag fee, shown as its own line, every time.
            </span>
          </div>
          <p className="text-sm leading-relaxed text-ink sm:border-l sm:border-line sm:pl-7">
            <span className="font-semibold">About the $23:</span>{" "}
            {OMV_DISCLOSURE}
          </p>
        </div>
      </section>

      <ServiceFeeCalculator />
    </div>
  );
}
