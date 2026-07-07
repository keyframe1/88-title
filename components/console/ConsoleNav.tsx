"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type ConsoleNavLink = { href: string; label: string };

/**
 * Console section tabs (Queue / Records / Fees / Forms). A Client Component so
 * it can read the current pathname and mark the active tab — the rest of the
 * console header stays a Server Component. Scrolls horizontally on a phone.
 */
export function ConsoleNav({ links }: { links: ConsoleNavLink[] }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Console sections"
      className="flex gap-1 overflow-x-auto border-b border-white/10"
    >
      {links.map((link) => {
        const active =
          pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`-mb-px whitespace-nowrap rounded-t-md border-b-2 px-3.5 py-3 text-sm font-semibold transition-colors ${
              active
                ? "border-plate text-white"
                : "border-transparent text-white/65 hover:bg-white/5 hover:text-white"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
