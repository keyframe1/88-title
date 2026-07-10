/**
 * Real, on-disk size of a published blank form PDF, formatted for the file chip
 * on the /forms index ("PDF · 89 KB"). The size is read from the actual file
 * under /public, never hand-entered, so a chip can never drift from the real
 * download. The form PDFs are bundled into the /forms route on Vercel via
 * `outputFileTracingIncludes` in next.config, so the read works at runtime too.
 *
 * Server-only: it touches the filesystem (the `node:fs` import keeps it off any
 * client bundle). Sizes are memoized per path — the files are immutable within a
 * deploy, so each is stat-ed at most once.
 */
import { statSync } from "node:fs";
import path from "node:path";

const cache = new Map<string, string>();

/** Bytes → a compact human label: "89 KB" under a megabyte, else "1.2 MB". */
function format(bytes: number): string {
  const MB = 1024 * 1024;
  if (bytes >= MB) return `${(bytes / MB).toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

/**
 * Formatted size for a public file path (e.g. "/forms/bill-of-sale.pdf"), or
 * `null` if the file is missing (a pending/not-yet-published blank) so the row
 * can fall back to its pending state instead of showing a wrong or empty chip.
 */
export function formFileSize(publicPath: string): string | null {
  const cached = cache.get(publicPath);
  if (cached !== undefined) return cached;
  try {
    const abs = path.join(process.cwd(), "public", publicPath);
    const size = format(statSync(abs).size);
    cache.set(publicPath, size);
    return size;
  } catch {
    return null;
  }
}
