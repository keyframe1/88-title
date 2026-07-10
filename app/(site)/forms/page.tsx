import type { Metadata } from "next";
import { FormRow } from "@/components/FormRow";
import { pageMetadata } from "@/lib/seo";
import { getLocale, getUiText } from "@/lib/i18n/server";
import { getLocalizedPublicForms } from "@/lib/i18n/content/forms";
import { formFileSize } from "@/lib/forms/file-size";

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
      <p className="eyebrow">{ui.forms.eyebrow}</p>
      <h1 className="mt-3 h-page">{ui.forms.heading}</h1>
      <p className="mt-4 max-w-2xl lead">{ui.forms.intro}</p>

      <ul className="service-index mt-10">
        {forms.map((form) => (
          // The row's stable slug is the deep-link anchor (#dpsmv-1806);
          // scroll-mt keeps the heading clear of the fixed header on jump.
          <li key={form.slug} id={form.slug} className="scroll-mt-24">
            <FormRow
              form={form}
              // Real on-disk size for the chip; null falls back to pending.
              fileSize={form.file ? formFileSize(form.file) : null}
              downloadAria={ui.forms.downloadAria(form.number, form.title)}
              pendingLabel={ui.forms.pending}
              usedForLabel={ui.forms.usedFor}
            />
          </li>
        ))}
      </ul>

      {/* One counter-service line for the whole list — 88 Title can prepare and
          notarize documents in person — said once here, not per form. */}
      <p className="mt-8 text-sm text-fog">{ui.forms.closing}</p>
    </div>
  );
}
