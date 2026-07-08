import Link from "next/link";
import { PlateButton } from "@/components/PlateButton";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { getUiText } from "@/lib/i18n/server";

export async function SiteHeader() {
  const ui = await getUiText();

  // Services · Fees · Forms — one order, shared by the desktop bar, the mobile
  // row, and the footer. ("Fees" is this nav's label for /pricing.)
  const navLinks = [
    { href: "/services", label: ui.header.nav.services },
    { href: "/pricing", label: ui.header.nav.pricing },
    { href: "/forms", label: ui.header.nav.forms },
  ];

  const navLinkClass =
    "text-sm font-semibold text-ink transition-colors duration-150 hover:text-plate focus-visible:text-plate";

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2"
          aria-label={ui.header.homeAria}
        >
          <span className="inline-flex h-8 w-9 items-center justify-center rounded-md border-2 border-ink bg-ink font-display text-sm font-extrabold tracking-wide text-white">
            88
          </span>
          <span className="font-display text-lg font-extrabold tracking-tight text-ink">
            Title
          </span>
        </Link>

        {/* Desktop nav (inline). Removed from the a11y tree on mobile via
            display:none, so it never doubles the mobile-row landmark. */}
        <nav
          aria-label={ui.header.navAria}
          className="hidden items-center gap-7 sm:flex"
        >
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className={navLinkClass}>
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageSwitcher />
          <PlateButton href="/check-in" size="sm">
            {ui.header.checkIn}
          </PlateButton>
        </div>
      </div>

      {/* Mobile nav: the same three links in the same order, as a slim second
          row below sm. No JS, no menu toggle — the links are always reachable,
          and display:none above sm keeps a single nav landmark per viewport. */}
      <nav
        aria-label={ui.header.navAria}
        className="border-t border-line/70 sm:hidden"
      >
        <ul className="mx-auto flex max-w-6xl items-center justify-center gap-7 px-4 py-2.5">
          {navLinks.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className={navLinkClass}>
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
