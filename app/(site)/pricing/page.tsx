import type { Metadata } from "next";
import { ServiceFeeCalculator } from "@/components/ServiceFeeCalculator";
import { pageMetadata } from "@/lib/seo";
import { getLocale, getUiText } from "@/lib/i18n/server";
import { getOmvDisclosure } from "@/lib/i18n/content/fees";

export async function generateMetadata(): Promise<Metadata> {
  const [locale, ui] = await Promise.all([getLocale(), getUiText()]);
  return pageMetadata({
    title: ui.meta.pricing.title,
    description: ui.meta.pricing.description,
    path: "/pricing",
    locale,
  });
}

export default async function PricingPage() {
  const [locale, ui] = await Promise.all([getLocale(), getUiText()]);
  const disclosure = getOmvDisclosure(locale);

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="eyebrow">{ui.pricing.eyebrow}</p>
      <h1 className="mt-3 h-page">{ui.pricing.heading}</h1>
      <p className="mt-4 max-w-prose lead">{ui.pricing.intro}</p>

      {/* The one statutory fee and the customer's OMV option, kept prominent.
          Relocated from the homepage so the fees page is its single home. */}
      <section
        aria-label={ui.pricing.tagFeeAria}
        className="mt-8 rounded-2xl border border-ink/15 bg-mist p-6 sm:p-7"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-7">
          <div className="flex items-baseline gap-3 sm:shrink-0">
            <span className="font-display text-4xl font-extrabold text-ink tabular-nums">
              $23
            </span>
            <span className="max-w-[12rem] text-sm font-semibold leading-snug text-ink">
              {ui.pricing.tagFeeLine}
            </span>
          </div>
          <p className="text-sm leading-relaxed text-ink sm:border-l sm:border-line sm:pl-7">
            <span className="font-semibold">{ui.pricing.tagFeeAbout}</span>{" "}
            {disclosure}
          </p>
        </div>
      </section>

      <ServiceFeeCalculator />
    </div>
  );
}
