import Link from "next/link";
import { PlateButton } from "@/components/PlateButton";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { getUiText } from "@/lib/i18n/server";

export async function SiteHeader() {
  const ui = await getUiText();

  const navLinks = [
    { href: "/checklist", label: ui.header.nav.checklist },
    { href: "/services", label: ui.header.nav.services },
    { href: "/pricing", label: ui.header.nav.pricing },
  ];

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

        <nav aria-label={ui.header.navAria} className="hidden items-center gap-7 sm:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-semibold text-ink transition-colors hover:text-plate"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageSwitcher />
          <PlateButton href="/check-in" className="text-sm">
            {ui.header.checkIn}
          </PlateButton>
        </div>
      </div>
    </header>
  );
}
