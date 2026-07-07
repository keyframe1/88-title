import type { Metadata } from "next";
import Link from "next/link";
import { Stamp } from "@/components/Stamp";
import { getLocale, getUiText } from "@/lib/i18n/server";

/**
 * The branded 404. This is the global not-found (unmatched URLs render it inside
 * the root layout, outside the customer chrome), so it stands on its own: the
 * 88 Title stamp mark as the brand signature, then copy that points people back
 * to the counter.
 *
 * The stamp here is deliberately STATIC (no `animate`) — the one-shot "stamp
 * down" is reserved for the two customer completion moments (check-in success
 * and a fully-ticked checklist). On 404 the mark is pure branding.
 *
 * Localized from the persisted locale so EN/ES/VI stay intact even off the main
 * chrome; `lang` on the wrapper keeps assistive tech honest under the root
 * <html lang="en">.
 */
export async function generateMetadata(): Promise<Metadata> {
  const ui = await getUiText();
  return {
    title: ui.meta.notFound.title,
    description: ui.meta.notFound.description,
    robots: { index: false, follow: false },
  };
}

export default async function NotFound() {
  const [locale, ui] = await Promise.all([getLocale(), getUiText()]);
  const nf = ui.notFound;

  return (
    <main
      lang={locale}
      className="flex flex-1 flex-col items-center justify-center bg-haze px-4 py-20 text-center"
    >
      <Stamp label={nf.stamp} decorative className="h-28 w-28 sm:h-32 sm:w-32" />

      <p className="mt-8 eyebrow">{nf.eyebrow}</p>
      <h1 className="mt-3 h-page">{nf.title}</h1>
      <p className="mt-4 max-w-md lead">{nf.body}</p>

      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
        <Link href="/" className="plate-btn text-sm">
          {nf.home}
        </Link>
        <Link href="/check-in" className="plate-btn plate-btn--red text-sm">
          {nf.checkIn}
        </Link>
      </div>
    </main>
  );
}
