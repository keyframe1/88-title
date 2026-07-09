import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getDealerContext, listDealerTransactions } from "@/lib/dealers/dal";
import { NewTransactionForm } from "@/components/dealers/NewTransactionForm";
import { SignOutButton } from "@/components/dealers/SignOutButton";
import { DealerBoard } from "@/components/dealers/DealerBoard";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import {
  ConsolePage,
  ConsolePageHeader,
  ConsolePanel,
} from "@/components/console/ConsoleUI";

export const metadata: Metadata = {
  title: "Dealer dashboard",
  robots: { index: false, follow: false },
};

// Reads the session cookie, so it always renders per-request.
export const dynamic = "force-dynamic";

/** The filing form panel, shared by the empty and populated layouts. */
function FilePanel({ className }: { className?: string }) {
  return (
    <ConsolePanel className={className}>
      <h2 className="font-display text-lg font-extrabold text-ink sm:text-xl">
        File a new transaction
      </h2>
      <p className="mt-1 mb-4 text-sm leading-relaxed text-fog">
        Stock number and VIN help us match your deal fast. Decode the VIN to
        auto-fill the vehicle.
      </p>
      <NewTransactionForm />
    </ConsolePanel>
  );
}

export default async function DealerDashboardPage() {
  const ctx = await getDealerContext();

  // Proxy already guards this route; re-check here as the authoritative gate.
  if (!ctx) {
    redirect("/dealers/login");
  }

  // Authenticated, but this login isn't tied to a dealership (e.g. a staff
  // account, or a not-yet-linked user). Don't error — explain and offer sign-out.
  if (!ctx.dealer) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center sm:py-20">
        <p className="eyebrow">Dealer portal</p>
        <h1 className="mt-3 h-page">
          {ctx.isStaff ? "You're signed in as staff" : "Account not linked yet"}
        </h1>
        <p className="mx-auto mt-3 max-w-sm leading-relaxed text-fog">
          {ctx.isStaff
            ? "You can manage the live check-in queue from the staff console."
            : "This login isn't linked to a dealership yet. Contact 88 Title and we'll finish setting up your account."}
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {ctx.isStaff ? (
            <Link href="/staff/queue" className="btn btn--primary btn--sm">
              Open the queue console
            </Link>
          ) : null}
          <SignOutButton redirectTo="/dealers/login" />
        </div>
      </div>
    );
  }

  const dealer = ctx.dealer;
  const transactions = await listDealerTransactions(dealer.id);
  const activeCount = transactions.filter(
    (tx) => tx.status !== "picked_up",
  ).length;
  const hasTransactions = transactions.length > 0;

  return (
    <ConsolePage>
      <ConsolePageHeader
        eyebrow="Dealer portal"
        title={dealer.dealership_name}
        description={
          hasTransactions
            ? `${activeCount} active transaction${activeCount === 1 ? "" : "s"} on your board.`
            : "Welcome. File your first transaction to get started."
        }
      />

      <div className="mt-6">
        <InstallPrompt placement="dealer" />
      </div>

      {hasTransactions ? (
        // Populated: the board leads; filing gets a roomier sidebar (a 3:2 split,
        // not 2:1, so the form never reads as a cramped afterthought).
        <div className="mt-8 grid gap-6 lg:grid-cols-5">
          <section aria-labelledby="board-heading" className="lg:col-span-3">
            <h2
              id="board-heading"
              className="mb-4 font-display text-lg font-extrabold text-ink sm:text-xl"
            >
              Your transactions
            </h2>
            <DealerBoard transactions={transactions} />
          </section>

          <aside
            id="file-transaction"
            aria-labelledby="new-transaction-heading"
            className="lg:col-span-2 lg:scroll-mt-24"
          >
            <div className="lg:sticky lg:top-24">
              <h2 id="new-transaction-heading" className="sr-only">
                File a new transaction
              </h2>
              <FilePanel />
            </div>
          </aside>
        </div>
      ) : (
        // Empty: file-first. The form leads, with a short "what happens next".
        <div className="mt-8 grid gap-6 lg:grid-cols-5">
          <section
            id="file-transaction"
            aria-labelledby="new-transaction-heading"
            className="lg:col-span-3"
          >
            <h2 id="new-transaction-heading" className="sr-only">
              File a new transaction
            </h2>
            <FilePanel />
          </section>

          <aside aria-labelledby="how-heading" className="lg:col-span-2">
            <ConsolePanel className="bg-mist/50">
              <h2
                id="how-heading"
                className="font-display text-lg font-extrabold text-ink"
              >
                What happens next
              </h2>
              <ol className="mt-4 space-y-4 text-sm leading-relaxed text-fog">
                <li>
                  <span className="font-semibold text-ink">
                    You file it here.
                  </span>{" "}
                  It lands on your board as &ldquo;Submitted&rdquo; right away.
                </li>
                <li>
                  <span className="font-semibold text-ink">
                    We move it along.
                  </span>{" "}
                  Watch it step from received to in progress to ready for pickup.
                </li>
                <li>
                  <span className="font-semibold text-ink">
                    You pick it up.
                  </span>{" "}
                  A ready transaction turns green here so you know the moment
                  it&rsquo;s done.
                </li>
              </ol>
            </ConsolePanel>
          </aside>
        </div>
      )}
    </ConsolePage>
  );
}
