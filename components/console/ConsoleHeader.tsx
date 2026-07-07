import Link from "next/link";
import { SignOutButton } from "@/components/dealers/SignOutButton";
import { ConsoleNav, type ConsoleNavLink } from "@/components/console/ConsoleNav";

/**
 * Lean back-office top bar shared by the staff console and the dealer portal.
 * Ink-navy so it reads as a working tool, not the marketing site.
 *
 * The lockup is deliberately two parts: the "88" plate badge + "Title" at brand
 * weight, then a clearly separated console designator ("Staff" / "Dealer") set
 * apart by a hairline divider and tracked-out caps, so it reads as
 * [88 Title] [STAFF], never "TitleStaff". The right cluster groups Help (a quiet
 * link) then the identity + Sign out as one unit, the signed-in name paired with
 * a small brand-colored initials avatar. Carries none of the customer chrome.
 */

/** Two-letter initials for the identity avatar (first + last word, else first two letters). */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  const first = parts[0];
  const last = parts.length > 1 ? parts[parts.length - 1] : "";
  const second = last ? last.charAt(0) : first.charAt(1);
  return (first.charAt(0) + second).toUpperCase();
}

export function ConsoleHeader({
  brandHref,
  label,
  links,
  showSignOut = true,
  userName,
  helpHref,
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
  /**
   * Optional path to the section's Help reference, shown as a quiet link ahead of
   * the identity. Set by the staff console (/staff/help); the dealer portal leaves
   * it off, so this stays a staff-only affordance.
   */
  helpHref?: string;
}) {
  const initials = userName ? getInitials(userName) : "";
  // The hairline between Help and the identity only earns its place when both sides exist.
  const showDivider = Boolean(helpHref) && (Boolean(userName) || showSignOut);

  return (
    <header className="sticky top-0 z-40 border-b border-ink-700 bg-ink text-white shadow-[0_6px_16px_-10px_rgba(8,15,32,0.85)] print:hidden">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
        {/* Wordmark lockup: [88] Title | DESIGNATOR */}
        <Link
          href={brandHref}
          className="group flex items-center gap-2.5"
          aria-label={`88 Title ${label}`}
        >
          <span className="inline-flex h-7 w-8 items-center justify-center rounded-md border border-white/45 font-display text-sm font-extrabold tracking-wide text-white transition-colors group-hover:border-white/70">
            88
          </span>
          <span className="font-display text-base font-extrabold tracking-tight text-white">
            Title
          </span>
          <span aria-hidden className="h-4 w-px bg-white/25" />
          <span className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-white/60">
            {label}
          </span>
        </Link>

        {/* Right cluster: Help  |  (avatar) name · Sign out */}
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          {helpHref ? (
            <Link
              href={helpHref}
              className="text-sm font-medium text-white/55 transition-colors hover:text-white"
            >
              Help
            </Link>
          ) : null}
          {showDivider ? (
            <span aria-hidden className="h-5 w-px bg-white/15" />
          ) : null}
          <div className="flex min-w-0 items-center gap-2.5">
            {userName ? (
              <span
                className="flex min-w-0 items-center gap-2"
                title={`Signed in as ${userName}`}
              >
                <span
                  aria-hidden
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-plate text-[0.625rem] font-bold leading-none text-white"
                >
                  {initials}
                </span>
                <span
                  aria-hidden
                  className="hidden max-w-[9rem] truncate text-sm font-medium text-white/80 sm:block"
                >
                  {userName}
                </span>
                <span className="sr-only">Signed in as {userName}</span>
              </span>
            ) : null}
            {showSignOut ? <SignOutButton /> : null}
          </div>
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
