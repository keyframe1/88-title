import type { Metadata } from "next";
import { FormRow } from "@/components/FormRow";
import { pageMetadata } from "@/lib/seo";
import { getLocale, getUiText } from "@/lib/i18n/server";
import { getLocalizedPublicForms } from "@/lib/i18n/content/forms";

/**
 * Public /forms page — the SEO asset for Louisiana OMV form-number searches
 * ("DPSMV 1806", "DPSMV 1606"). Each blank form is an editorial row with the form
 * number as real, indexable heading text and a link to the blank PDF.
 *
 * The HTML page is the indexable surface; the PDFs under /forms are noindexed in
 * next.config (X-Robots-Tag) so the state documents don't compete with this page
 * or become bare landing pages. No FAQ/explainer schema is emitted here yet —
 * that ships with the attorney-reviewed explainer copy (see lib/forms-library.ts).
 */
export async function generateMetadata(): Promise<Metadata> {
  const [locale, ui] = await Promise.all([getLocale(), getUiText()]);
  return pageMetadata({
    title: ui.meta.forms.title,
    description: ui.meta.forms.description,
    path: "/forms",
    locale,
  });
}

export default async function FormsPage() {
  const [locale, ui] = await Promise.all([getLocale(), getUiText()]);
  const forms = getLocalizedPublicForms(locale);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-plate">
        {ui.forms.eyebrow}
      </p>
      <h1 className="mt-3 text-4xl font-extrabold sm:text-5xl">
        {ui.forms.heading}
      </h1>
      <p className="mt-4 max-w-2xl text-lg leading-relaxed text-fog">
        {ui.forms.intro}
      </p>

      <ul className="service-index mt-10">
        {forms.map((form) => (
          // The row's stable slug is the deep-link anchor (#dpsmv-1806);
          // scroll-mt keeps the heading clear of the fixed header on jump.
          <li key={form.slug} id={form.slug} className="scroll-mt-24">
            <FormRow
              form={form}
              downloadLabel={ui.forms.download}
              downloadAria={ui.forms.downloadAria(form.number, form.title)}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
