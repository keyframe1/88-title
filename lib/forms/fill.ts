import "server-only";

/**
 * Server-only filesystem boundary for PDF filling. Loads a real OMV template from
 * /public and hands its bytes to the pure filler in ./pdf. Kept separate so the
 * pure PDF logic (which has no fs/Supabase access) stays testable in a plain Node
 * script while this fs-touching wrapper never reaches the client bundle.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { FORM_TEMPLATES, type DpsmvFormKind } from "./fields";
import { fillPdf, mergePdfs } from "./pdf";
import type { FormFieldMap } from "./types";

/** Absolute path to a template under /public. */
function templatePath(kind: DpsmvFormKind): string {
  return path.join(process.cwd(), "public", FORM_TEMPLATES[kind].file);
}

/** Load one template and apply a field map, returning the filled PDF bytes. */
export async function fillForm(map: FormFieldMap): Promise<Uint8Array> {
  const bytes = await readFile(templatePath(map.kind));
  return fillPdf(bytes, map);
}

export { mergePdfs };
