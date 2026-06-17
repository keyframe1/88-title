import type { Metadata } from "next";
import { DocumentFinder } from "@/components/DocumentFinder";
import { VisitTime } from "@/components/VisitTime";
import { getTransactionPath } from "@/lib/checklists";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "What to Bring in Metairie, LA",
  description:
    "Build your exact document checklist for a Louisiana title transfer, plates, registration, inherited vehicle, or notary, then check in at 88 Title in Metairie.",
  path: "/checklist",
});

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

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-plate">
        Document checklist
      </p>
      <h1 className="mt-3 text-4xl font-extrabold sm:text-5xl">What to bring</h1>
      <p className="mt-4 text-lg leading-relaxed text-fog">
        Tell us what you’re here for and we’ll build your exact “what to bring”
        list. Check items off as you gather them. No account, nothing saved.
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
