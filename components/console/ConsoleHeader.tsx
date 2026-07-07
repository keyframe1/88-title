import Link from "next/link";
import { SignOutButton } from "@/components/dealers/SignOutButton";
import { ConsoleNav, type ConsoleNavLink } from "@/components/console/ConsoleNav";

/**
 * Lean back-office top bar shared by the staff console and the dealer portal.
 * Ink-navy so it reads as a working tool, not the marketing site: a small
 * "88 Title" mark with a section label, optional section tabs, and Sign out.
 * Deliberately carries none of the customer chrome (no What to bring / Services
 * / Fees / Check in, no map or hours footer).
 */
export function ConsoleHeader({
  brandHref,
  label,
  links,
  showSignOut = true,
  userName,
}: {
  brandHref: string;
  label: string;
  links?: ConsoleNavLink[];
  /** Off for pre-auth entry pages (login / password reset) — nothing to sign out of. */
  showSignOut?: boolean;
  /**
   * The signed-in user's display name, shown small + muted beside Sign out. Three
   * people share the staff console and the audit trail depends on the right
   * person being signed in, so it is always visible when provided.
   */
  userName?: string | null;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-ink-900 bg-ink text-white print:hidden">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
        <Link
          href={brandHref}
          className="flex items-center gap-2"
          aria-label={`88 Title ${label}`}
        >
          <span className="inline-flex h-7 w-8 items-center justify-center rounded-md border border-white/45 font-display text-sm font-extrabold tracking-wide text-white">
            88
          </span>
          <span className="font-display text-base font-extrabold tracking-tight text-white">
            Title <span className="font-bold text-white/55">{label}</span>
          </span>
        </Link>
        <div className="flex min-w-0 items-center gap-3">
          {userName ? (
            <span
              className="max-w-[9rem] truncate text-sm font-medium text-white/70"
              title={`Signed in as ${userName}`}
            >
              {userName}
            </span>
          ) : null}
          {showSignOut ? <SignOutButton /> : null}
        </div>
      </div>

      {links ? (
        <div className="mx-auto max-w-5xl px-2 sm:px-4">
          <ConsoleNav links={links} />
        </div>
      ) : null}
    </header>
  );
}
