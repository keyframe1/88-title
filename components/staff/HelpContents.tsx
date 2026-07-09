"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The staff-help table of contents: the one interactive island on an otherwise
 * static reference page. Two presentations of the same anchor list, driven by one
 * scroll-spy:
 *
 *   - Desktop (lg+): a sticky vertical rail beside the article. The section the
 *     reader is in is marked with a plate-red rule + ink text.
 *   - Narrow: the rail collapses to a sticky top "On this page" jump menu (a
 *     native <details> disclosure) that names the current section and closes on
 *     select.
 *
 * Scroll-spy is an IntersectionObserver over the section elements (by id), biased
 * toward the top of the viewport so the active entry flips as a heading crosses
 * under the console header. Both are print-hidden; the article carries the print
 * output.
 */

export type HelpTocEntry = { anchor: string; label: string };

export function HelpContents({ entries }: { entries: HelpTocEntry[] }) {
  const [active, setActive] = useState<string>(entries[0]?.anchor ?? "");
  const [menuOpen, setMenuOpen] = useState(false);
  const detailsRef = useRef<HTMLDetailsElement>(null);

  // Scroll-spy: watch every section, keep the set that is currently in the top
  // band of the viewport, and mark the first one in document order as active.
  useEffect(() => {
    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (records) => {
        for (const record of records) {
          if (record.isIntersecting) visible.add(record.target.id);
          else visible.delete(record.target.id);
        }
        const current = entries.find((entry) => visible.has(entry.anchor));
        if (current) setActive(current.anchor);
      },
      // Clear the sticky console header at the top, and only count a section as
      // active until its heading has scrolled into roughly the top third.
      { rootMargin: "-112px 0px -66% 0px", threshold: 0 },
    );

    const observed = entries
      .map((entry) => document.getElementById(entry.anchor))
      .filter((el): el is HTMLElement => el !== null);
    observed.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [entries]);

  const activeLabel =
    entries.find((entry) => entry.anchor === active)?.label ?? "Contents";

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <>
      {/* Narrow: sticky top jump menu (native disclosure). */}
      <details
        ref={detailsRef}
        open={menuOpen}
        onToggle={(event) => setMenuOpen(event.currentTarget.open)}
        className="sticky top-[5.5rem] z-30 -mx-4 border-b border-line bg-paper/95 px-4 py-2.5 backdrop-blur supports-[backdrop-filter]:bg-paper/80 print:hidden lg:hidden"
      >
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg border border-line bg-white px-3.5 py-2 text-sm font-semibold text-ink [&::-webkit-details-marker]:hidden">
          <span className="flex min-w-0 items-center gap-2">
            <span className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-plate">
              On this page
            </span>
            <span className="truncate text-fog">{activeLabel}</span>
          </span>
          <span
            aria-hidden
            className={`text-fog transition-transform ${menuOpen ? "rotate-180" : ""}`}
          >
            ▾
          </span>
        </summary>
        <ul className="mt-2 space-y-0.5">
          {entries.map((entry) => {
            const on = entry.anchor === active;
            return (
              <li key={entry.anchor}>
                <a
                  href={`#${entry.anchor}`}
                  onClick={closeMenu}
                  aria-current={on ? "location" : undefined}
                  className={`block rounded-lg px-3 py-2 text-sm transition-colors ${
                    on
                      ? "bg-mist font-semibold text-ink"
                      : "font-medium text-fog hover:bg-mist hover:text-ink"
                  }`}
                >
                  {entry.label}
                </a>
              </li>
            );
          })}
        </ul>
      </details>

      {/* Desktop: sticky vertical rail. */}
      <nav
        aria-label="On this page"
        className="hidden lg:sticky lg:top-28 lg:block lg:self-start print:lg:hidden"
      >
        <p className="mb-3 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-plate">
          On this page
        </p>
        <ul className="space-y-0.5 border-l border-line">
          {entries.map((entry) => {
            const on = entry.anchor === active;
            return (
              <li key={entry.anchor}>
                <a
                  href={`#${entry.anchor}`}
                  aria-current={on ? "location" : undefined}
                  className={`-ml-px block border-l-2 py-1.5 pl-4 text-sm transition-colors ${
                    on
                      ? "border-plate font-semibold text-ink"
                      : "border-transparent font-medium text-fog hover:border-line hover:text-ink"
                  }`}
                >
                  {entry.label}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
