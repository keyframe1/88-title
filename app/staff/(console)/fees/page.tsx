import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getDealerContext } from "@/lib/dealers/dal";
import { getCheckinById } from "@/lib/checkin/dal";
import { getCustomerById, getVehicleById } from "@/lib/records/dal";
import { getTaxRates } from "@/lib/tax/dal";
import { buildRateBook } from "@/lib/tax/rates";
import type { RateBook } from "@/lib/tax/types";
import type {
  Customer,
  CustomerSummary,
  Vehicle,
  VehicleSummary,
} from "@/lib/records/types";
import { SignOutButton } from "@/components/dealers/SignOutButton";
import {
  FeeTaxCalculator,
  type LinkedCheckin,
} from "@/components/staff/FeeTaxCalculator";
import { ConsolePage, ConsolePageHeader } from "@/components/console/ConsoleUI";

export const metadata: Metadata = {
  title: "Fee & tax calculator",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/** The safe customer projection the picker uses, from a full record. */
function toCustomerSummary(c: Customer): CustomerSummary {
  return {
    id: c.id,
    full_name: c.full_name,
    phone: c.phone,
    email: c.email,
    parish: c.parish,
    city: c.city,
    id_type: c.id_type,
    id_last4: c.id_last4,
    updated_at: c.updated_at,
  };
}

/** The safe vehicle projection the picker uses, from a full record. */
function toVehicleSummary(v: Vehicle): VehicleSummary {
  return {
    id: v.id,
    vin: v.vin,
    year: v.year,
    make: v.make,
    model: v.model,
    body_style: v.body_style,
    color: v.color,
    updated_at: v.updated_at,
  };
}

export default async function StaffFeesPage({
  searchParams,
}: {
  searchParams: Promise<{ checkin?: string; customer?: string; vehicle?: string }>;
}) {
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

  // The queue -> fees handoff: "Start transaction" on a served check-in opens
  // this page with ?checkin=<id>. Resolve the check-in (staff-only) and pre-select
  // its already-linked customer/vehicle records, so a recorded transaction ties
  // back to the check-in. Best effort: the calculator works fine without it.
  const {
    checkin: checkinId,
    customer: customerId,
    vehicle: vehicleId,
  } = await searchParams;
  let linkedCheckin: LinkedCheckin | null = null;
  if (checkinId) {
    try {
      const checkin = await getCheckinById(checkinId);
      if (checkin) {
        let customer: CustomerSummary | null = null;
        let vehicle: VehicleSummary | null = null;
        if (checkin.customer_id) {
          const c = await getCustomerById(checkin.customer_id);
          if (c) customer = toCustomerSummary(c);
        }
        if (checkin.vehicle_id) {
          const v = await getVehicleById(checkin.vehicle_id);
          if (v) vehicle = toVehicleSummary(v);
        }
        linkedCheckin = {
          id: checkin.id,
          serviceType: checkin.service_type,
          ticketCode: checkin.ticket_code,
          customer,
          vehicle,
        };
      }
    } catch (err) {
      console.error("Linked check-in unavailable:", err);
    }
  }

  // The records -> fees handoff: "Start transaction" on a customer or vehicle
  // detail opens this page with ?customer=<id> / ?vehicle=<id>. This is the same
  // pre-selection seam as the check-in handoff, generalized to a bare record. A
  // linked check-in already carries its own records, so it wins; this fills the
  // pickers only when we did not arrive from the queue. Best effort throughout.
  let initialCustomer: CustomerSummary | null = null;
  let initialVehicle: VehicleSummary | null = null;
  if (!linkedCheckin && customerId) {
    try {
      const c = await getCustomerById(customerId);
      if (c) initialCustomer = toCustomerSummary(c);
    } catch (err) {
      console.error("Pre-selected customer unavailable:", err);
    }
  }
  if (!linkedCheckin && vehicleId) {
    try {
      const v = await getVehicleById(vehicleId);
      if (v) initialVehicle = toVehicleSummary(v);
    } catch (err) {
      console.error("Pre-selected vehicle unavailable:", err);
    }
  }

  return (
    <ConsolePage>
      <ConsolePageHeader title={<>Fee &amp; tax calculator</>} />

      <FeeTaxCalculator
        rateBook={rateBook}
        linkedCheckin={linkedCheckin}
        initialCustomer={initialCustomer}
        initialVehicle={initialVehicle}
      />
    </ConsolePage>
  );
}
