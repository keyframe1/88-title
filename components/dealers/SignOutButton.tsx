import { signOut } from "@/lib/dealers/actions";

/**
 * Sign-out control. A plain form posting to the signOut server action (no
 * client JS required).
 *
 * Two tones, one action:
 *  - default: the flat ghost button (ink text) for LIGHT surfaces, i.e. the
 *    "staff access only" / "account not linked" fallback screens and the dealer
 *    dashboard body.
 *  - `onInk`: for the DARK ink-navy console header, where a ghost button's ink
 *    text would be navy-on-navy (invisible). There it renders as a legible
 *    hairline-bordered control that reads clearly against the bar. Sign out is
 *    counter-hygiene critical on the shared machine, so it must never disappear.
 */
export function SignOutButton({ onInk = false }: { onInk?: boolean } = {}) {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className={
          onInk
            ? "inline-flex items-center rounded-lg border border-white/25 px-3 py-1.5 text-sm font-medium text-white/85 transition-colors hover:border-white/50 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            : "btn btn--ghost btn--sm"
        }
      >
        Sign out
      </button>
    </form>
  );
}
