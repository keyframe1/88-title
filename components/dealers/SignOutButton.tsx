import { signOut } from "@/lib/dealers/actions";

/**
 * Sign-out control. A plain form posting to the signOut server action — no
 * client JS required.
 */
export function SignOutButton() {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className="rounded-lg border border-line bg-white px-3.5 py-2 text-sm font-semibold text-ink transition-colors hover:border-ink hover:text-plate"
      >
        Sign out
      </button>
    </form>
  );
}
