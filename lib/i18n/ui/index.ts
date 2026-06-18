/**
 * UI dictionary registry. Maps each locale to its translation set. Used by both
 * the server helper (lib/i18n/server.ts) and the client hook (lib/i18n/client).
 *
 * To add a language: create `./<code>.ts` exporting a `UiDictionary`, then add
 * it to the map below. The `Record<Locale, ...>` makes a missing entry a compile
 * error.
 */
import type { Locale } from "../config";
import { en, type UiDictionary } from "./en";
import { es } from "./es";
import { vi } from "./vi";

export type { UiDictionary };

const dictionaries: Record<Locale, UiDictionary> = { en, es, vi };

export function getUiDictionary(locale: Locale): UiDictionary {
  return dictionaries[locale];
}
