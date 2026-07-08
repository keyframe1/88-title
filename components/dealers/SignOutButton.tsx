import { signOut } from "@/lib/dealers/actions";

/**
 * Sign-out control. A plain form posting to the signOut server action — no
 * client JS required.
 */
export function SignOutButton() {
  return (
    <form action={signOut}>
      <button type="submit" className="btn btn--ghost btn--sm">
        Sign out
      </button>
    </form>
  );
}
