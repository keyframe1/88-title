import type { Metadata } from "next";
import Link from "next/link";
import { PlateButton } from "@/components/PlateButton";
import { VisitTime } from "@/components/VisitTime";

export const metadata: Metadata = {
  title: "Check in",
  description:
    "Online check-in for 88 Title in Metairie is launching soon. See what to expect and build your document checklist before you visit.",
};

export default function CheckInPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-plate">
        Check in
      </p>
      <h1 className="mt-3 text-4xl font-extrabold sm:text-5xl">
        Check in online
      </h1>

      <div className="mt-8 rounded-2xl border-2 border-ink bg-mist p-6 sm:p-8">
        <span className="inline-flex items-center rounded-full bg-ink px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
          Coming soon
        </span>
        <h2 className="mt-4 text-2xl font-extrabold">
          The online queue is launching soon
        </h2>
        <p className="mt-3 leading-relaxed text-fog">
          We’re building a live queue so you can grab a spot from your phone and
          walk in right when it’s your turn. It isn’t live just yet — but you can
          get ready now so your visit is quick.
        </p>
        <div className="mt-6 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <PlateButton href="/checklist" size="lg">
            Build your checklist
          </PlateButton>
          <Link
            href="/pricing"
            className="font-semibold text-ink underline-offset-4 transition-colors hover:text-plate hover:underline"
          >
            See pricing →
          </Link>
        </div>
      </div>

      <div className="mt-12">
        <VisitTime />
      </div>
    </div>
  );
}
