import type { Metadata } from "next";
import { DocumentFinder } from "@/components/DocumentFinder";
import { VisitTime } from "@/components/VisitTime";

export const metadata: Metadata = {
  title: "What to bring",
  description:
    "Build your exact document checklist for a Louisiana title transfer, plates, registration, inherited vehicle, or notary — then check in at 88 Title in Metairie.",
};

export default function ChecklistPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-plate">
        Document checklist
      </p>
      <h1 className="mt-3 text-4xl font-extrabold sm:text-5xl">What to bring</h1>
      <p className="mt-4 text-lg leading-relaxed text-fog">
        Tell us what you’re here for and we’ll build your exact “what to bring”
        list. Check items off as you gather them — no account, nothing saved.
      </p>

      <div className="mt-10">
        <DocumentFinder />
      </div>

      <div className="mt-12">
        <VisitTime />
      </div>
    </div>
  );
}
