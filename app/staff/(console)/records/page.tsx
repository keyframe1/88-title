import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getDealerContext } from "@/lib/dealers/dal";
import { recentRecords } from "@/lib/records/dal";
import { getTaxRates } from "@/lib/tax/dal";
import { buildRateBook } from "@/lib/tax/rates";
import type { RecordsSearchResult } from "@/lib/records/types";
import { SignOutButton } from "@/components/dealers/SignOutButton";
import { RecordsConsole } from "@/components/staff/RecordsConsole";
import { ConsolePage, ConsolePageHeader } from "@/components/console/ConsoleUI";

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
          <SignOutButton redirectTo="/staff/login" />
        </div>
      </div>
    );
  }

  // The search-first console opens on the most recently ADDED records (a small
  // "Recent" list, not the whole table); search is the way to reach anything
  // older. If the tables aren't there yet (migration not applied to this
  // environment), show a clear setup notice instead of a broken console.
  let recent: RecordsSearchResult | null = null;
  let loadError = false;
  try {
    recent = await recentRecords();
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

  // The console renders its own data-first header (title + promoted Add actions),
  // so the shared ConsolePageHeader is used only for the setup-notice fallback.
  if (loadError || !recent) {
    return (
      <ConsolePage>
        <ConsolePageHeader title={<>Customer &amp; vehicle records</>} />
        <div className="mt-6 rounded-2xl border border-line bg-white p-6">
          <h2 className="font-display text-lg font-extrabold text-ink">
            Records are not available yet
          </h2>
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-fog">
            The customers / vehicles tables could not be read. Apply migration
            20260623120000_customer_vehicle_records.sql to this environment, then
            reload.
          </p>
        </div>
      </ConsolePage>
    );
  }

  return (
    <ConsolePage>
      <RecordsConsole recent={recent} parishOptions={parishOptions} />
    </ConsolePage>
  );
}
