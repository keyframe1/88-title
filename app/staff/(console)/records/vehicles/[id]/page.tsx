import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getDealerContext } from "@/lib/dealers/dal";
import { getVehicleDetail } from "@/lib/records/dal";
import type { VehicleDetail } from "@/lib/records/types";
import { SignOutButton } from "@/components/dealers/SignOutButton";
import { VehicleDetailView } from "@/components/staff/RecordDetail";
import { ConsolePage } from "@/components/console/ConsoleUI";

export const metadata: Metadata = {
  title: "Vehicle record",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function StaffVehicleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await getDealerContext();

  // Proxy optimistically guards /staff; this is the authoritative gate.
  if (!ctx) {
    redirect("/staff/login?redirectedFrom=/staff/records");
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
          <SignOutButton redirectTo="/staff/login" />
        </div>
      </div>
    );
  }

  const { id } = await params;

  // Load the hub view. A read failure means the records / transactions tables
  // aren't present in this environment (migration not applied); a null means the
  // record doesn't exist (or was deleted). Handle each with a clear notice.
  let detail: VehicleDetail | null = null;
  let loadError = false;
  try {
    detail = await getVehicleDetail(id);
  } catch (err) {
    console.error("Vehicle detail unavailable:", err);
    loadError = true;
  }

  if (loadError) {
    return (
      <ConsolePage>
        <RecordNotice
          title="Records are not available yet"
          body="The customers / vehicles tables could not be read. Apply migration 20260623120000_customer_vehicle_records.sql to this environment, then reload."
        />
      </ConsolePage>
    );
  }

  if (!detail) {
    return (
      <ConsolePage>
        <RecordNotice
          title="Vehicle not found"
          body="This record may have been deleted. It could still appear on past transactions with its link cleared."
        />
      </ConsolePage>
    );
  }

  return (
    <ConsolePage>
      <VehicleDetailView detail={detail} />
    </ConsolePage>
  );
}

/** A framed notice with a back link, for the not-found / not-available paths. */
function RecordNotice({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-6">
      <Link
        href="/staff/records"
        className="inline-flex items-center gap-1 text-sm font-semibold text-fog underline-offset-2 hover:text-plate hover:underline"
      >
        <span aria-hidden="true">&larr;</span> Records
      </Link>
      <h1 className="mt-4 font-display text-lg font-extrabold text-ink">
        {title}
      </h1>
      <p className="mt-2 max-w-prose text-sm leading-relaxed text-fog">{body}</p>
    </div>
  );
}
