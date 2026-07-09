// @ts-check
/**
 * Minimal, dependency-free module-resolution hook so a plain `node` process can
 * run the project's TypeScript directly (Node 22.18+/24 strips the types itself;
 * it just will not resolve the extensionless relative imports the source uses,
 * e.g. `import { X } from "./fields"`). We only add extension resolution:
 *
 *   - `./x` / `../x` with no extension  -> try `./x.ts`
 *   - `@/x` (the project's path alias)   -> `<root>/x` (then the .ts rule)
 *
 * Type-only imports (`import type ...`) are erased by Node before resolution, so
 * the alias rule is only a safety net; today every `@/` import in the forms
 * modules is type-only. Used exclusively by scripts/forms-selftest.mjs.
 */
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(fileURLToPath(import.meta.url), "../..");

/** @type {(spec: string, ctx: { parentURL?: string }, next: Function) => unknown} */
export async function resolve(specifier, context, next) {
  let spec = specifier;

  // Project alias: "@/lib/x" -> absolute file URL under the repo root.
  if (spec.startsWith("@/")) {
    spec = pathToFileURL(path.join(ROOT, spec.slice(2))).href;
  }

  const hasExt = /\.[mc]?[jt]s$/.test(spec);
  const isRelative =
    spec.startsWith("./") || spec.startsWith("../") || spec.startsWith("file:");

  if (isRelative && !hasExt) {
    try {
      const base = context.parentURL ?? pathToFileURL(`${process.cwd()}/`).href;
      const resolved = new URL(spec, base);
      if (existsSync(`${fileURLToPath(resolved)}.ts`)) {
        return next(`${spec}.ts`, context);
      }
    } catch {
      // fall through to default resolution
    }
  }

  return next(spec, context);
}
