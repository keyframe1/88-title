import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getDealerContext } from "@/lib/dealers/dal";
import { getTaxRates } from "@/lib/tax/dal";
import { buildRateBook } from "@/lib/tax/rates";
import type { RateBook } from "@/lib/tax/types";
import { getCustomerPicks, getVehiclePicks } from "@/lib/records/dal";
import type { CustomerSummary, VehicleSummary } from "@/lib/records/types";
import { SignOutButton } from "@/components/dealers/SignOutButton";
import { FeeTaxCalculator } from "@/components/staff/FeeTaxCalculator";

export const metadata: Metadata = {
  title: "Fee & tax calculator",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function StaffFeesPage() {
  const ctx = await getDealerContext();

  // Proxy optimistically guards /staff; this is the authoritative gate.
  if (!ctx) {
    redirect("/staff/login?redirectedFrom=/staff/fees");
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

  // The rate book drives the whole tool. If the tax_rates table isn't there yet
  // (migration not applied to this environment), show a clear setup notice
  // instead of a broken calculator.
  let rateBook: RateBook | null = null;
  let loadError = false;
  try {
    const rows = await getTaxRates();
    const asOf = new Date().toISOString().slice(0, 10);
    rateBook = buildRateBook(rows, asOf);
  } catch (err) {
    console.error("Tax rates unavailable:", err);
    loadError = true;
  }

  // Saved records feed the calculator's "pull from records" picker. Best effort:
  // if the records tables aren't present yet, the picker is simply omitted.
  let customers: CustomerSummary[] = [];
  let vehicles: VehicleSummary[] = [];
  try {
    [customers, vehicles] = await Promise.all([
      getCustomerPicks(),
      getVehiclePicks(),
    ]);
  } catch (err) {
    console.error("Customer/vehicle records unavailable:", err);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <header className="border-b border-line pb-5">
        <h1 className="text-2xl font-extrabold sm:text-3xl">
          Fee &amp; tax calculator
        </h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-fog">
          Domicile-based estimate for the counter. Enter the buyer&rsquo;s parish
          and the vehicle figures for an itemized breakdown. Staff only.
        </p>
      </header>

      {loadError || !rateBook ? (
        <div className="mt-6 rounded-2xl border border-dashed border-line bg-mist/60 p-6">
          <h2 className="font-display text-lg font-extrabold text-ink">
            Tax rates are not available yet
          </h2>
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-fog">
            The tax_rates table could not be read. Apply migration
            20260622120000_tax_rates.sql to this environment, then reload. The
            migration seeds the state (4.45%) and Jefferson Parish (4.75%) rates.
          </p>
        </div>
      ) : (
        <FeeTaxCalculator
          rateBook={rateBook}
          customers={customers}
          vehicles={vehicles}
        />
      )}
    </div>
  );
}
