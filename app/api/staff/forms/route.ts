import { NextResponse, type NextRequest } from "next/server";
import { getDealerContext } from "@/lib/dealers/dal";
import { generateForms } from "@/lib/forms/generate";
import type { DpsmvFormKind } from "@/lib/forms/fields";
import type { FormGenRequest } from "@/lib/forms/types";

/**
 * POST /api/staff/forms - generate filled DPSMV PDFs from saved records + the
 * fee engine. Staff-only: identity is re-resolved here (getDealerContext) on top
 * of the database's is_staff() RLS, the same trust boundary the records and tax
 * actions use. Returns a single application/pdf (one form, or the merged packet
 * for "print all").
 */
export const dynamic = "force-dynamic";

const FORM_KINDS: readonly DpsmvFormKind[] = [
  "vehicle-application",
  "bill-of-sale",
  "act-of-donation",
];

/** Read a string property defensively, defaulting to "". */
function str(obj: Record<string, unknown>, key: string): string {
  const v = obj[key];
  return typeof v === "string" ? v : "";
}

/** Parse and validate the JSON body into a FormGenRequest, or null if invalid. */
function parseBody(json: unknown): FormGenRequest | null {
  if (typeof json !== "object" || json === null) return null;
  const obj = json as Record<string, unknown>;

  const rawForms = obj.forms;
  if (!Array.isArray(rawForms)) return null;
  const forms = rawForms.filter((f): f is DpsmvFormKind =>
    (FORM_KINDS as readonly string[]).includes(f as string),
  );

  const customerId = str(obj, "customerId").trim();
  const vehicleId = str(obj, "vehicleId").trim();
  if (!customerId || !vehicleId) return null;

  return {
    forms,
    customerId,
    vehicleId,
    gift: obj.gift === true,
    counterpartyName: str(obj, "counterpartyName"),
    relationship: str(obj, "relationship"),
    executionParish: str(obj, "executionParish"),
    amount: str(obj, "amount"),
    tradeIn: str(obj, "tradeIn"),
    rebate: str(obj, "rebate"),
    tradeVin: str(obj, "tradeVin"),
    date: str(obj, "date"),
    lienholderName: str(obj, "lienholderName"),
    lienholderAddress: str(obj, "lienholderAddress"),
    lienholderCityStateZip: str(obj, "lienholderCityStateZip"),
  };
}

export async function POST(request: NextRequest) {
  const ctx = await getDealerContext();
  if (!ctx) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  if (!ctx.isStaff) {
    return NextResponse.json(
      { error: "Only staff can generate forms." },
      { status: 403 },
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const req = parseBody(json);
  if (!req) {
    return NextResponse.json(
      { error: "Pick a customer, a vehicle, and at least one form." },
      { status: 400 },
    );
  }

  const result = await generateForms(req);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return new NextResponse(Buffer.from(result.data.bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${result.data.filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
