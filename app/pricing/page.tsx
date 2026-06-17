import type { Metadata } from "next";
import { ServiceFeeCalculator } from "@/components/ServiceFeeCalculator";

export const metadata: Metadata = {
  title: "Service fee calculator",
  description:
    "Add up 88 Title’s service fees in Metairie. The $23 public tag fee is statutory and always shown as its own line. Service fees only — no tax estimates, no personalized totals.",
};

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
        always shown on its own line — we never merge it in or mark it up. State
        fees and taxes vary by vehicle and parish, so those are handled at the
        counter, not estimated here.
      </p>

      <ServiceFeeCalculator />
    </div>
  );
}
