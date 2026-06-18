import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PlateButton } from "@/components/PlateButton";
import { VisitTime } from "@/components/VisitTime";
import { JsonLd } from "@/components/seo/JsonLd";
import { transactionPaths } from "@/lib/checklists";
import { faqPageSchema, pageMetadata, serviceSchema } from "@/lib/seo";
import { getLocale, getUiText } from "@/lib/i18n/server";
import { getLocalizedPath } from "@/lib/i18n/content/checklists";
import {
  getLocalizedGuide,
  getLocalizedRelatedPaths,
} from "@/lib/i18n/content/guides";

export function generateStaticParams() {
  return transactionPaths.map((path) => ({ slug: path.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [locale, ui] = await Promise.all([getLocale(), getUiText()]);
  const path = getLocalizedPath(slug, locale);
  if (!path) {
    return { title: ui.meta.serviceNotFound };
  }
  const guide = getLocalizedGuide(slug, locale);
  return pageMetadata({
    title: guide?.metaTitle ?? ui.meta.serviceFallbackTitle(path.label),
    description:
      guide?.metaDescription ??
      ui.meta.serviceFallbackDescription(path.blurb, path.label),
    path: `/services/${path.slug}`,
    locale,
  });
}

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [locale, ui] = await Promise.all([getLocale(), getUiText()]);
  const path = getLocalizedPath(slug, locale);
  if (!path) {
    notFound();
  }
  const guide = getLocalizedGuide(slug, locale);
  const related = guide
    ? getLocalizedRelatedPaths(guide.related, locale)
    : [];

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      {/* Structured data is localized to match the rendered language. */}
      <JsonLd data={serviceSchema(path, guide?.metaDescription)} />
      {guide && guide.faqs.length > 0 ? (
        <JsonLd data={faqPageSchema(guide.faqs)} />
      ) : null}

      <Link
        href="/services"
        className="text-sm font-semibold text-fog underline-offset-2 transition-colors hover:text-plate hover:underline"
      >
        {ui.serviceDetail.backToAll}
      </Link>

      <p className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-plate">
        {guide?.eyebrow ?? path.label}
      </p>
      <h1 className="mt-3 text-4xl font-extrabold sm:text-5xl">
        {guide?.heading ?? path.label}
      </h1>

      {guide ? (
        guide.intro.map((paragraph, index) => (
          <p key={index} className="mt-4 text-lg leading-relaxed text-fog">
            {paragraph}
          </p>
        ))
      ) : (
        <p className="mt-4 text-lg leading-relaxed text-fog">{path.blurb}</p>
      )}

      {/* How it works ------------------------------------------------------ */}
      {guide && guide.steps.length > 0 ? (
        <section aria-labelledby="how-heading" className="mt-12">
          <h2 id="how-heading" className="text-2xl font-extrabold sm:text-3xl">
            {ui.serviceDetail.howItWorks}
          </h2>
          <ol className="mt-6 space-y-5">
            {guide.steps.map((step, index) => (
              <li key={step.title} className="flex gap-4">
                <span
                  aria-hidden="true"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink font-display text-base font-extrabold text-white"
                >
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <h3 className="font-display text-lg font-extrabold text-ink">
                    {step.title}
                  </h3>
                  <p className="mt-1 leading-relaxed text-fog">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {/* What to bring + handoff into the checklist tool ------------------- */}
      <section aria-labelledby="bring-heading" className="mt-12">
        <h2 id="bring-heading" className="text-2xl font-extrabold sm:text-3xl">
          {ui.serviceDetail.whatToBring}
        </h2>
        <p className="mt-2 text-fog">{ui.serviceDetail.whatToBringIntro}</p>

        <ul className="mt-6 space-y-3">
          {path.items.map((item) => (
            <li
              key={item.id}
              className="flex items-start gap-3 rounded-xl border border-line bg-paper p-4"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                className="mt-0.5 h-5 w-5 shrink-0 text-ink"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM13.7 8.3a1 1 0 00-1.4-1.4L9 10.2 7.7 8.9a1 1 0 10-1.4 1.4l2 2a1 1 0 001.4 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="min-w-0">
                <span className="block font-medium text-ink">{item.label}</span>
                {item.detail ? (
                  <span className="mt-0.5 block text-sm text-fog">
                    {item.detail}
                  </span>
                ) : null}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-6">
          <Link
            href={`/checklist?for=${path.slug}`}
            className="inline-flex items-center gap-2 rounded-xl border-2 border-ink bg-paper px-5 py-3 font-display text-base font-extrabold text-ink transition-colors hover:bg-mist focus-visible:bg-mist"
          >
            {ui.serviceDetail.buildChecklist}
            <svg
              aria-hidden="true"
              viewBox="0 0 20 20"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
            >
              <path
                d="M7 4l6 6-6 6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
        </div>

        <p className="mt-6 rounded-2xl border border-line bg-mist p-5 text-sm leading-relaxed text-fog">
          {ui.serviceDetail.guidanceDisclaimer}
        </p>
      </section>

      {/* FAQ --------------------------------------------------------------- */}
      {guide && guide.faqs.length > 0 ? (
        <section aria-labelledby="faq-heading" className="mt-12">
          <h2 id="faq-heading" className="text-2xl font-extrabold sm:text-3xl">
            {ui.serviceDetail.commonQuestions}
          </h2>
          <dl className="mt-6 space-y-4">
            {guide.faqs.map((faq) => (
              <div
                key={faq.question}
                className="rounded-2xl border border-line bg-paper p-5"
              >
                <dt className="font-display text-lg font-extrabold text-ink">
                  {faq.question}
                </dt>
                <dd className="mt-2 leading-relaxed text-fog">{faq.answer}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      {/* Fees pointer (no amounts here; the fees page is the one place) ---- */}
      <p className="mt-10 text-sm leading-relaxed text-fog">
        {ui.serviceDetail.feesBefore}
        <Link
          href="/pricing"
          className="font-semibold text-ink underline-offset-2 hover:text-plate hover:underline"
        >
          {ui.serviceDetail.feesLink}
        </Link>
        {ui.serviceDetail.feesAfter}
      </p>

      {/* Related transactions --------------------------------------------- */}
      {related.length > 0 ? (
        <section aria-labelledby="related-heading" className="mt-12">
          <h2
            id="related-heading"
            className="text-sm font-semibold uppercase tracking-[0.18em] text-plate"
          >
            {ui.serviceDetail.related}
          </h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {related.map((rel) => (
              <li key={rel.slug}>
                <Link
                  href={`/services/${rel.slug}`}
                  className="flex h-full flex-col rounded-2xl border border-line bg-paper p-4 transition-colors hover:border-ink focus-visible:border-ink"
                >
                  <span className="font-display text-base font-extrabold text-ink">
                    {rel.label}
                  </span>
                  <span className="mt-1 text-sm leading-relaxed text-fog">
                    {rel.blurb}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Primary CTA ------------------------------------------------------- */}
      <div className="mt-12">
        <PlateButton href="/check-in" size="lg">
          {ui.serviceDetail.checkIn}
        </PlateButton>
      </div>

      <div className="mt-12">
        <VisitTime />
      </div>
    </div>
  );
}
