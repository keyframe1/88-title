import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DocumentFinder } from "@/components/DocumentFinder";
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

      {/* Checklist-first: the interactive checklist is the hero, right under the
          title. It leads the page; the "how it works" education supports it
          below. The tickable items are immediately visible and the check-in CTA
          lives inside the tool. */}
      <section aria-labelledby="checklist-heading" className="mt-8">
        <h2
          id="checklist-heading"
          className="text-2xl font-extrabold sm:text-3xl"
        >
          {ui.serviceDetail.checklistHeading(path.label)}
        </h2>

        <div className="mt-6 rounded-2xl border border-line bg-mist/40 p-5 sm:p-7">
          <DocumentFinder slug={path.slug} />
        </div>

        <p className="mt-6 rounded-2xl border border-line bg-mist p-5 text-sm leading-relaxed text-fog">
          {ui.serviceDetail.guidanceDisclaimer}
        </p>
      </section>

      {/* How it works — supporting context, below the checklist. --------- */}
      {guide ? (
        <section aria-labelledby="how-heading" className="mt-12">
          <h2 id="how-heading" className="text-2xl font-extrabold sm:text-3xl">
            {ui.serviceDetail.howItWorks}
          </h2>

          {guide.intro.map((paragraph, index) => (
            <p key={index} className="mt-4 text-lg leading-relaxed text-fog">
              {paragraph}
            </p>
          ))}

          {guide.steps.length > 0 ? (
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
          ) : null}
        </section>
      ) : (
        <p className="mt-8 text-lg leading-relaxed text-fog">{path.blurb}</p>
      )}

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

      <div className="mt-12">
        <VisitTime />
      </div>
    </div>
  );
}
