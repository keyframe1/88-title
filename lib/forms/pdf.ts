/**
 * Pure PDF-manipulation for DPSMV form generation. Given the bytes of a real OMV
 * template and a field map, this sets the mapped AcroForm fields with pdf-lib and
 * returns the filled bytes; it also merges several filled forms for "print all".
 *
 * There is no filesystem or Supabase access here (the server-only fill.ts wrapper
 * reads the template bytes and calls in), so this module is pure enough to run in
 * a plain Node script - which is exactly how scripts/forms-selftest.mjs exercises
 * the real fill path (including the Bill of Sale "Year" split below) end to end.
 *
 * The templates are plain AcroForm PDFs (no XFA), so setting a field's value and
 * letting pdf-lib regenerate the appearance renders correctly in browsers and on
 * paper. We also set NeedAppearances so any viewer that prefers to regenerate
 * appearances itself still shows the values.
 */
import { PDFBool, PDFDocument, type PDFForm, PDFName } from "pdf-lib";
import { BILL_OF_SALE } from "./fields";
import type { FormFieldMap } from "./types";

/**
 * pdf-lib's appearance font is WinAnsi (Helvetica) and throws on characters it
 * cannot encode. Records are typically ASCII, but normalize defensively: replace
 * common smart punctuation, then drop anything outside Latin-1 so a stray glyph
 * never fails a whole form. (We also never emit em dashes per the brand rules.)
 */
export function toLatin1(value: string): string {
  return value
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/[^\x20-\xFF]/g, "");
}

/**
 * The Bill of Sale template (18538728.pdf) ships ONE AcroForm field named "Year"
 * wired to TWO blanks: the vehicle-description "Year:" line AND the execution-date
 * "Signed on this __ day of ______, year of ____" line. Because they share a
 * single field, setting it would stamp the model year onto the signing date too -
 * a false date on a notarized document - which is why the template could not be
 * filled as-is and the model year was previously left to be handwritten.
 *
 * We split the shared field so each blank is independent: the vehicle-description
 * widget becomes its own "Vehicle Year" field (mapping.ts fills it with the model
 * year, so BILL_OF_SALE.vehicleYear resolves) and the execution-date widget is
 * re-created blank under the original "Year" name (still signed/dated in person,
 * exactly as before). The split is done on the loaded document, never on the
 * template file, so the real OMV PDF on disk is left untouched.
 *
 * No-ops safely if the template ever changes (field missing, already single-
 * widget, or an unexpected layout): we never guess which widget is which.
 */
function splitBillOfSaleYear(doc: PDFDocument, form: PDFForm): void {
  let field;
  try {
    field = form.getTextField(BILL_OF_SALE.year); // "Year"
  } catch {
    return; // no such field on this template; nothing to split
  }

  const widgets = field.acroField.getWidgets();
  if (widgets.length < 2) return; // already single-purpose; leave as-is

  const pages = doc.getPages();
  const located = widgets.map((w) => {
    const rect = w.getRectangle();
    const pageRef = w.P();
    const page = pages.find((p) => p.ref === pageRef) ?? pages[0];
    return { rect, page };
  });

  // The vehicle-description "Year:" blank sits in the left column (small x); the
  // execution-date year sits far to the right on the "signed on this ..." line.
  const vehicle = located.find((l) => l.rect.x < 200);
  const exec = located.find((l) => l.rect.x >= 200);
  if (!vehicle || !exec) return; // unexpected layout: do not guess, leave as-is

  form.removeField(field);

  // Transparent, borderless widgets so nothing paints over the form's printed
  // underline (addToPage otherwise defaults to a white box with a black border).
  const style = {
    backgroundColor: undefined,
    borderColor: undefined,
    borderWidth: 0,
  } as const;

  const vehicleYear = form.createTextField(BILL_OF_SALE.vehicleYear);
  vehicleYear.addToPage(vehicle.page, {
    x: vehicle.rect.x,
    y: vehicle.rect.y,
    width: vehicle.rect.width,
    height: vehicle.rect.height,
    ...style,
  });

  const execYear = form.createTextField(BILL_OF_SALE.year);
  execYear.addToPage(exec.page, {
    x: exec.rect.x,
    y: exec.rect.y,
    width: exec.rect.width,
    height: exec.rect.height,
    ...style,
  });
}

/** Load one template's bytes, apply a field map, and return the filled PDF bytes. */
export async function fillPdf(
  templateBytes: Uint8Array,
  map: FormFieldMap,
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(templateBytes);
  const form = doc.getForm();

  // Template-specific preparation before we set any values (creates the fields
  // the map targets, e.g. the Bill of Sale "Vehicle Year").
  if (map.kind === "bill-of-sale") splitBillOfSaleYear(doc, form);

  let applied = 0;
  for (const [name, value] of Object.entries(map.text)) {
    const clean = toLatin1(value);
    if (!clean) continue;
    try {
      form.getTextField(name).setText(clean);
      applied += 1;
    } catch {
      // A field that isn't present/text on this template is skipped rather than
      // failing the whole document; mapping.ts only targets known fields.
    }
  }

  for (const name of map.checks) {
    try {
      form.getCheckBox(name).check();
    } catch {
      // Same tolerance for checkboxes.
    }
  }

  // Graceful fallback for a flat template. Many state PDFs ship with no fillable
  // AcroForm fields; if a form we meant to pre-fill matched NONE of its intended
  // fields, we still return the template - the blank, to be completed by hand -
  // rather than failing the request. Logged (form kind only, never any record
  // data) so a swapped or flattened template gets noticed. (The 1806 in
  // public/forms is a real AcroForm today, so this is defensive.)
  if (applied === 0 && Object.keys(map.text).length > 0) {
    console.warn(
      `forms: template "${map.kind}" exposed no fillable fields; serving the blank to be completed by hand.`,
    );
  }

  // Generate appearance streams now, and ask viewers to regenerate them too.
  form.updateFieldAppearances();
  form.acroForm.dict.set(PDFName.of("NeedAppearances"), PDFBool.True);

  return doc.save();
}

/** Merge several already-filled PDFs into one (for "print all"). */
export async function mergePdfs(parts: Uint8Array[]): Promise<Uint8Array> {
  if (parts.length === 1) return parts[0];
  const out = await PDFDocument.create();
  for (const part of parts) {
    const src = await PDFDocument.load(part);
    const pages = await out.copyPages(src, src.getPageIndices());
    pages.forEach((page) => out.addPage(page));
  }
  return out.save();
}
