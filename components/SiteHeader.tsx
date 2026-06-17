import Link from "next/link";
import { PlateButton } from "@/components/PlateButton";

const NAV_LINKS = [
  { href: "/checklist", label: "What to bring" },
  { href: "/pricing", label: "Pricing" },
  { href: "/services", label: "Services" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2"
          aria-label="88 Title home"
        >
          <span className="inline-flex h-8 w-9 items-center justify-center rounded-md border-2 border-ink bg-ink font-display text-sm font-extrabold tracking-wide text-white">
            88
          </span>
          <span className="font-display text-lg font-extrabold tracking-tight text-ink">
            Title
          </span>
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-7 sm:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-semibold text-ink transition-colors hover:text-plate"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <PlateButton href="/check-in" className="text-sm">
          Check in
        </PlateButton>
      </div>
    </header>
  );
}
