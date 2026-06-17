import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getDealerContext, listDealerTransactions } from "@/lib/dealers/dal";
import { NewTransactionForm } from "@/components/dealers/NewTransactionForm";
import { SignOutButton } from "@/components/dealers/SignOutButton";
import { TransactionList } from "@/components/dealers/TransactionList";

export const metadata: Metadata = {
  title: "Dealer dashboard",
  robots: { index: false, follow: false },
};

// Reads the session cookie, so it always renders per-request.
export const dynamic = "force-dynamic";

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
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-plate">
          Dealer portal
        </p>
        <h1 className="mt-3 text-2xl font-extrabold">
          {ctx.isStaff ? "You're signed in as staff" : "Account not linked yet"}
        </h1>
        <p className="mx-auto mt-3 max-w-sm leading-relaxed text-fog">
          {ctx.isStaff
            ? "You can manage the live check-in queue from the staff console."
            : "This login isn't linked to a dealership yet. Contact 88 Title and we'll finish setting up your account."}
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {ctx.isStaff ? (
            <Link href="/staff/queue" className="plate-btn text-sm">
              Open the queue console
            </Link>
          ) : null}
          <SignOutButton />
        </div>
      </div>
    );
  }

  const dealer = ctx.dealer;
  const transactions = await listDealerTransactions(dealer.id);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-plate">
            Dealer portal
          </p>
          <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">
            {dealer.dealership_name}
          </h1>
          <p className="mt-1 text-fog">
            {transactions.length === 0
              ? "Welcome. File your first transaction to get started."
              : `Welcome back. You have ${transactions.length} transaction${transactions.length === 1 ? "" : "s"} on file.`}
          </p>
        </div>
        <SignOutButton />
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <section
          aria-labelledby="transactions-heading"
          className="lg:col-span-2"
        >
          <h2
            id="transactions-heading"
            className="mb-4 text-lg font-extrabold text-ink"
          >
            Your transactions
          </h2>
          <TransactionList transactions={transactions} />
        </section>

        <aside aria-labelledby="new-transaction-heading">
          <div className="rounded-2xl border-2 border-ink bg-white p-5 sm:p-6 lg:sticky lg:top-24">
            <h2
              id="new-transaction-heading"
              className="text-lg font-extrabold text-ink"
            >
              File a new transaction
            </h2>
            <p className="mt-1 mb-4 text-sm leading-relaxed text-fog">
              Tell us what you&rsquo;re bringing in. Fields are flexible while we
              finalize the dealer workflow.
            </p>
            <NewTransactionForm />
          </div>
        </aside>
      </div>
    </div>
  );
}
