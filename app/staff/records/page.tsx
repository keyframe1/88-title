import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getDealerContext } from "@/lib/dealers/dal";
import { searchRecords } from "@/lib/records/dal";
import { getTaxRates } from "@/lib/tax/dal";
import { buildRateBook } from "@/lib/tax/rates";
import type { RecordsSearchResult } from "@/lib/records/types";
import { SignOutButton } from "@/components/dealers/SignOutButton";
import { RecordsConsole } from "@/components/staff/RecordsConsole";

export const metadata: Metadata = {
  title: "Customer & vehicle records",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function StaffRecordsPage() {
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
          <SignOutButton />
        </div>
      </div>
    );
  }

  // Initial list (most recently touched) drives the console. If the tables
  // aren't there yet (migration not applied to this environment), show a clear
  // setup notice instead of a broken console.
  let initial: RecordsSearchResult | null = null;
  let loadError = false;
  try {
    initial = await searchRecords("");
  } catch (err) {
    console.error("Customer/vehicle records unavailable:", err);
    loadError = true;
  }

  // Parish names from the tax rate book feed the customer form's parish field, so
  // a stored domicile matches a jurisdiction the fee engine can price. Best
  // effort: if the tax table isn't present, the field is just free text.
  let parishOptions: string[] = [];
  try {
    const rows = await getTaxRates();
    const asOf = new Date().toISOString().slice(0, 10);
    parishOptions = buildRateBook(rows, asOf).parishes.map((p) => p.name);
  } catch {
    parishOptions = [];
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-12">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-plate">
            Staff console
          </p>
          <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">
            Customer &amp; vehicle records
          </h1>
          <p className="mt-1 max-w-2xl text-fog">
            Enter a customer or vehicle once, reuse it everywhere. A stored parish
            feeds the fee calculator; stored vehicle details feed the forms. Staff
            only.
          </p>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm font-semibold text-fog">
            <Link
              href="/staff/queue"
              className="underline-offset-2 hover:text-plate hover:underline"
            >
              &larr; Queue
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

      {loadError || !initial ? (
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
        <RecordsConsole initial={initial} parishOptions={parishOptions} />
      )}
    </div>
  );
}
