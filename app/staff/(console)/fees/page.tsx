import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getDealerContext } from "@/lib/dealers/dal";
import { getTaxRates } from "@/lib/tax/dal";
import { buildRateBook } from "@/lib/tax/rates";
import type { RateBook } from "@/lib/tax/types";
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

  // The rate book drives the whole tool. The state + baseline parish rates are
  // code-defined (lib/tax/rates.ts), so the calculator works even before the
  // tax_rates table is seeded; any additional parishes/districts staff configured
  // in the dashboard are merged in. `asOf` (today) resolves which dashboard rows
  // are in effect — the "rates as of" label the calculator shows is the static
  // RATES_VERIFIED constant, not today's date.
  const asOf = new Date().toISOString().slice(0, 10);
  let rateBook: RateBook;
  try {
    rateBook = buildRateBook(await getTaxRates(), asOf);
  } catch (err) {
    console.error("tax_rates table unavailable; using code baseline:", err);
    rateBook = buildRateBook([], asOf);
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

      <FeeTaxCalculator rateBook={rateBook} />
    </div>
  );
}
