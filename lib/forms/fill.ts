import "server-only";

/**
 * Server-only PDF filling. Loads a real OMV template from /public, sets the
 * mapped AcroForm fields with pdf-lib, and returns the filled bytes. Also merges
 * several filled forms into one document for "print all".
 *
 * The templates are plain AcroForm PDFs (no XFA), so setting a field's value and
 * letting pdf-lib regenerate the appearance renders correctly in browsers and on
 * paper. We also set NeedAppearances so any viewer that prefers to regenerate
 * appearances itself still shows the values.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFBool, PDFDocument, PDFName } from "pdf-lib";
import { FORM_TEMPLATES, type DpsmvFormKind } from "./fields";
import type { FormFieldMap } from "./types";

/** Absolute path to a template under /public. */
function templatePath(kind: DpsmvFormKind): string {
  return path.join(process.cwd(), "public", FORM_TEMPLATES[kind].file);
}

/**
 * pdf-lib's appearance font is WinAnsi (Helvetica) and throws on characters it
 * cannot encode. Records are typically ASCII, but normalize defensively: replace
 * common smart punctuation, then drop anything outside Latin-1 so a stray glyph
 * never fails a whole form. (We also never emit em dashes per the brand rules.)
 */
function toLatin1(value: string): string {
  return value
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/[^\x20-\xFF]/g, "");
}

/** Load one template and apply a field map, returning the filled PDF bytes. */
export async function fillForm(map: FormFieldMap): Promise<Uint8Array> {
  const bytes = await readFile(templatePath(map.kind));
  const doc = await PDFDocument.load(bytes);
  const form = doc.getForm();

  for (const [name, value] of Object.entries(map.text)) {
    const clean = toLatin1(value);
    if (!clean) continue;
    try {
      form.getTextField(name).setText(clean);
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
