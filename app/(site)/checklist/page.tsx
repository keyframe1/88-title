import type { Metadata } from "next";
import { DocumentFinder } from "@/components/DocumentFinder";
import { VisitTime } from "@/components/VisitTime";
import { getTransactionPath } from "@/lib/checklists";
import { pageMetadata } from "@/lib/seo";
import { getLocale, getUiText } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const [locale, ui] = await Promise.all([getLocale(), getUiText()]);
  return pageMetadata({
    title: ui.meta.checklist.title,
    description: ui.meta.checklist.description,
    path: "/checklist",
    locale,
  });
}

export default async function ChecklistPage({
  searchParams,
}: {
  searchParams: Promise<{ for?: string }>;
}) {
  // A deep service page can hand us a transaction via /checklist?for=<slug>.
  // Validate it against the known paths before preselecting.
  const { for: forSlug } = await searchParams;
  const initialSlug =
    forSlug && getTransactionPath(forSlug) ? forSlug : undefined;

  const ui = await getUiText();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-plate">
        {ui.checklist.eyebrow}
      </p>
      <h1 className="mt-3 text-4xl font-extrabold sm:text-5xl">
        {ui.checklist.heading}
      </h1>
      <p className="mt-4 text-lg leading-relaxed text-fog">
        {ui.checklist.intro}
      </p>

      <div className="mt-10">
        <DocumentFinder initialSlug={initialSlug} />
      </div>

      <div className="mt-12">
        <VisitTime />
      </div>
    </div>
  );
}
