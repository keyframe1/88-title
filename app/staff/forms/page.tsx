import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getDealerContext } from "@/lib/dealers/dal";
import { getCustomerPicks, getVehiclePicks } from "@/lib/records/dal";
import { getTaxRates } from "@/lib/tax/dal";
import { buildRateBook } from "@/lib/tax/rates";
import type { RateBook } from "@/lib/tax/types";
import type { CustomerSummary, VehicleSummary } from "@/lib/records/types";
import { SignOutButton } from "@/components/dealers/SignOutButton";
import { FormsConsole } from "@/components/staff/FormsConsole";

export const metadata: Metadata = {
  title: "DPSMV forms",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function StaffFormsPage({
  searchParams,
}: {
  searchParams: Promise<{ customer?: string; vehicle?: string }>;
}) {
  const ctx = await getDealerContext();

  // Proxy optimistically guards /staff; this is the authoritative gate.
  if (!ctx) {
    redirect("/staff/login?redirectedFrom=/staff/forms");
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

  const { customer: customerId, vehicle: vehicleId } = await searchParams;
  const today = new Date().toISOString().slice(0, 10);

  // Saved records feed the pickers. If the records tables aren't present yet
  // (migration not applied to this environment), show a clear setup notice.
  let customers: CustomerSummary[] = [];
  let vehicles: VehicleSummary[] = [];
  let recordsError = false;
  try {
    [customers, vehicles] = await Promise.all([
      getCustomerPicks(),
      getVehiclePicks(),
    ]);
  } catch (err) {
    console.error("Customer/vehicle records unavailable:", err);
    recordsError = true;
  }

  // The rate book powers the read-only tax preview and the parish list. Best
  // effort: forms still generate without it (zero tax line).
  let rateBook: RateBook | null = null;
  try {
    const rows = await getTaxRates();
    const asOf = new Date().toISOString().slice(0, 10);
    rateBook = buildRateBook(rows, asOf);
  } catch (err) {
    console.error("Tax rates unavailable:", err);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-12">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-plate">
            Staff console
          </p>
          <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">
            DPSMV forms
          </h1>
          <p className="mt-1 max-w-2xl text-fog">
            Generate print-ready OMV forms from a saved customer and vehicle. The
            Vehicle Application, plus a Bill of Sale or (for a gift) an Act of
            Donation. Staff only.
          </p>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm font-semibold text-fog">
            <Link
              href="/staff/records"
              className="underline-offset-2 hover:text-plate hover:underline"
            >
              &larr; Records
            </Link>
            <Link
              href="/staff/fees"
              className="underline-offset-2 hover:text-plate hover:underline"
            >
              Fee &amp; tax calculator &rarr;
            </Link>
          </div>
        </div>
        <SignOutButton />
      </header>

      {recordsError ? (
        <div className="mt-8 rounded-2xl border border-dashed border-line bg-mist/60 p-6">
          <h2 className="font-display text-lg font-extrabold text-ink">
            Records are not available yet
          </h2>
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-fog">
            The customers / vehicles tables could not be read. Apply migration
            20260623120000_customer_vehicle_records.sql to this environment, then
            reload.
          </p>
        </div>
      ) : (
        <FormsConsole
          customers={customers}
          vehicles={vehicles}
          rateBook={rateBook}
          today={today}
          initialCustomerId={customerId ?? ""}
          initialVehicleId={vehicleId ?? ""}
        />
      )}
    </div>
  );
}
