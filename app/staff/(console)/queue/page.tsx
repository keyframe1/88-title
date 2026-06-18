import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getDealerContext } from "@/lib/dealers/dal";
import { getStaffQueue } from "@/lib/checkin/dal";
import { getOmvReference } from "@/lib/omv/dal";
import type { OmvReferenceRow } from "@/lib/omv/types";
import { SignOutButton } from "@/components/dealers/SignOutButton";
import { StaffQueue } from "@/components/checkin/StaffQueue";
import { OmvReference } from "@/components/staff/OmvReference";

export const metadata: Metadata = {
  title: "Queue console",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function StaffQueuePage() {
  const ctx = await getDealerContext();

  // Proxy optimistically guards /staff; this is the authoritative gate.
  if (!ctx) {
    redirect("/staff/login?redirectedFrom=/staff/queue");
  }

  // Authenticated but not staff (e.g. a dealer login). Explain, don't error.
  if (!ctx.isStaff) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center sm:py-20">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-plate">
          Staff console
        </p>
        <h1 className="mt-3 text-2xl font-extrabold">Staff access only</h1>
        <p className="mx-auto mt-3 max-w-sm leading-relaxed text-fog">
          This area is for 88 Title staff. Your login isn&rsquo;t a staff
          account.
        </p>
        <div className="mt-8 flex justify-center">
          <SignOutButton />
        </div>
      </div>
    );
  }

  const initial = await getStaffQueue();

  // The OMV reference is a back-office cheat sheet, not the queue's critical
  // path. If its table isn't there yet (e.g. the migration hasn't been applied
  // to this environment), keep the queue working and just omit the section.
  let omvReference: OmvReferenceRow[] | null = null;
  try {
    omvReference = await getOmvReference();
  } catch (err) {
    console.error("OMV reference unavailable:", err);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <header className="border-b border-line pb-5">
        <h1 className="text-2xl font-extrabold sm:text-3xl">Check-in queue</h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-fog">
          Call customers up and mark them complete. Status changes notify them by
          email and push.
        </p>
      </header>

      <div className="mt-6">
        <StaffQueue initial={initial} />
      </div>

      {omvReference ? <OmvReference rows={omvReference} /> : null}
    </div>
  );
}
