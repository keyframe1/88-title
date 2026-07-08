import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getDealerContext } from "@/lib/dealers/dal";
import { SignOutButton } from "@/components/dealers/SignOutButton";
import { ConsolePage, ConsolePageHeader } from "@/components/console/ConsoleUI";

export const metadata: Metadata = {
  title: "Staff help",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * /staff/help — the single source of truth for how the 88 Title console works.
 *
 * A plain, readable training + lookup reference: a short "First day", then one
 * section per tab (Queue, Records, Transaction, Ledger), each task with a STABLE
 * anchor id so other console screens can deep-link straight to it (the "?"
 * affordances do exactly that; guidance lives here and only here). Static TSX,
 * no CMS, no data.
 *
 * Presentation is a scannable reference, not a text wall: an anchor-chip jump
 * bar, top-ruled section blocks with a red accent (echoing the header tab), a
 * shared step/bullet rhythm, aligned two-column control references (Defs), and
 * one consistent left-accent callout (Note). Heading order is semantic: the page
 * h1, an h2 per tab, an h3 per task, so anchors and screen readers both hold.
 *
 * Scope is deliberate: this covers the 88 Title app workflow only. Steps at the
 * OMV terminal, and OMV policy / eligibility / "requirements", are out of scope
 * by design — where a step would need OMV knowledge, we name the app action and
 * stop.
 *
 * English, like the rest of the staff console (the locale cookie is customer-site
 * only; see lib/i18n/config.ts).
 */
export default async function StaffHelpPage() {
  const ctx = await getDealerContext();

  // Proxy optimistically guards /staff; this is the authoritative gate.
  if (!ctx) {
    redirect("/staff/login?redirectedFrom=/staff/help");
  }

  // Authenticated but not staff (e.g. a dealer login). Explain, don't error.
  if (!ctx.isStaff) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center sm:py-20">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-plate">
          Staff console
        </p>
        <h1 className="mt-3 text-2xl font-extrabold">Staff access only</h1>
        <p className="mx-auto mt-3 max-w-sm leading-relaxed text-fog">
          This area is for 88 Title staff. Your login isn&rsquo;t a staff
          account.
        </p>
        <div className="mt-8 flex justify-center">
          <SignOutButton />
        </div>
      </div>
    );
  }

  return (
    <ConsolePage>
      <ConsolePageHeader
        title="Staff help"
        description="How the 88 Title console works: sign-in, the tabs, and the everyday how-do-I. This is the single reference; the small ? links around the console point back here."
      />

      {/* Scope note — the one callout treatment, reused for every caveat below. */}
      <Note className="mt-6">
        This guide covers the 88 Title console only. Steps at the OMV terminal,
        and OMV policy or requirements, are out of scope by design.
      </Note>

      {/* Jump bar — anchor chips, not a line of plain links. */}
      <nav aria-label="On this page" className="mt-6">
        <ul className="flex flex-wrap gap-2">
          {CONTENTS.map((entry) => (
            <li key={entry.anchor}>
              <Link
                href={`#${entry.anchor}`}
                className="inline-flex rounded-full border border-line bg-white px-3.5 py-1.5 text-sm font-semibold text-ink transition-colors hover:border-ink hover:text-plate"
              >
                {entry.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-10 space-y-10">
        {/* ---- First day -------------------------------------------------- */}
        <Section id="first-day" title="First day">
          <Steps>
            <li>
              Sign in at the staff login with your own email and password.
            </li>
            <li>
              Confirm your name shows at the top right of the console. That name
              is who the activity trail credits for everything you do, so make
              sure it is yours.
            </li>
            <li>
              The <strong className="text-ink">Queue</strong> is your home tab.
              It opens when you sign in and when you click the 88 Title mark.
            </li>
            <li>
              Everyone has their own login. Never share credentials or work under
              someone else&rsquo;s name.
            </li>
            <li>
              Sign out when you step away from the counter (Sign out, top right).
            </li>
          </Steps>
        </Section>

        {/* ---- Queue ------------------------------------------------------ */}
        <Section id="queue" title="Queue">
          <p className="text-sm leading-relaxed text-fog">
            The live line. The three tiles at the top count who is{" "}
            <strong className="text-ink">Serving</strong>,{" "}
            <strong className="text-ink">Waiting</strong> (and how many are in
            the lobby), and <strong className="text-ink">No-shows</strong>. New
            check-ins appear automatically.
          </p>

          <Task id="queue-arrivals" title="Arrivals and the lobby">
            <p className="text-sm leading-relaxed text-fog">
              A waiting customer shows{" "}
              <strong className="text-ink">On the way</strong> until they are
              marked arrived, then <strong className="text-ink">In lobby</strong>
              . Customers can mark themselves arrived; you can do it for them.
            </p>
            <Steps>
              <li>Find the customer&rsquo;s waiting row.</li>
              <li>
                Click <strong className="text-ink">Mark arrived</strong> to move
                them to In lobby.
              </li>
              <li>
                Click <strong className="text-ink">Call up</strong> to start
                serving them. If they have not been marked arrived, the console
                asks you to confirm first. Calling up sends their notification
                (email and push).
              </li>
            </Steps>
          </Task>

          <Task id="queue-serving" title="Serving a customer">
            <p className="text-sm leading-relaxed text-fog">
              Once a customer is Serving, their row shows these controls:
            </p>
            <Defs
              items={[
                ["Complete", "Finishes the visit and notifies the customer."],
                [
                  "Recall",
                  "Re-sends the same email and push. Use it if they did not hear the first call.",
                ],
                [
                  "Return to waiting",
                  "Puts them back in line with no notification.",
                ],
                ["No-show", "Moves them to the No-shows list."],
                [
                  "Start transaction",
                  "Opens the Transaction tab linked to this check-in, so a recorded transaction ties back to it.",
                ],
              ]}
            />
          </Task>

          <Task id="queue-checklist" title="The counter checklist">
            <p className="text-sm leading-relaxed text-fog">
              The serving row lists the transaction&rsquo;s what-to-bring items,
              each with a checkbox.
            </p>
            <Steps>
              <li>
                Tick each document as you confirm it in person; the count
                updates.
              </li>
              <li>
                Some items link a blank PDF. Open it to hand or print the form.
              </li>
            </Steps>
            <Note>
              Reference only. Nothing is blocked by the checklist; always confirm
              each document in person.
            </Note>
          </Task>

          <Task id="queue-no-show" title="No-shows">
            <p className="text-sm leading-relaxed text-fog">
              Customers you called up who did not appear collect in the No-shows
              list.
            </p>
            <Steps>
              <li>
                When they turn up, click{" "}
                <strong className="text-ink">Call again</strong>. It re-sends the
                same notification and returns them to Serving.
              </li>
              <li>
                <strong className="text-ink">Cancel</strong> removes them from
                the day&rsquo;s line.
              </li>
            </Steps>
          </Task>
        </Section>

        {/* ---- Records ---------------------------------------------------- */}
        <Section id="records" title="Records">
          <p className="text-sm leading-relaxed text-fog">
            Saved customers and vehicles. Enter someone once and reuse them on
            the Transaction tab. Everything here is staff-only.
          </p>

          <Task id="records-search" title="Find a record">
            <p className="text-sm leading-relaxed text-fog">
              The console opens on your most recent records.
            </p>
            <Steps>
              <li>
                Type a name or VIN in the search box; results replace the recent
                list as you type.
              </li>
              <li>Clear the box to return to the recent list.</li>
            </Steps>
          </Task>

          <Task id="records-add" title="Add a customer or vehicle">
            <Steps>
              <li>
                Click <strong className="text-ink">+ Add customer</strong> or{" "}
                <strong className="text-ink">+ Add vehicle</strong>.
              </li>
              <li>Fill the form and Save.</li>
            </Steps>
            <Note>
              Adds match and reuse: a customer is reused when the name and email
              or phone match, a vehicle when the VIN matches. The same person or
              car is never duplicated.
            </Note>
          </Task>

          <Task id="records-decode-vin" title="Decode a VIN">
            <Steps>
              <li>In the add or edit vehicle form, type the VIN.</li>
              <li>
                Click <strong className="text-ink">Decode VIN</strong> to fill
                year, make, model, and body from the VIN. Edit any field by hand
                afterward. If the lookup fails, enter the details manually.
              </li>
            </Steps>
          </Task>

          <Task id="records-edit-delete" title="Edit or delete">
            <Steps>
              <li>
                On any row, click <strong className="text-ink">Edit</strong> to
                change it, or <strong className="text-ink">Delete</strong> to
                remove it. Delete asks you to confirm.
              </li>
            </Steps>
            <Note>
              Editing updates the record in place, so fixing a typo never makes a
              duplicate. Deleting a record unlinks it from any check-in or
              transaction rather than breaking them.
            </Note>
          </Task>

          <Task id="records-copy" title="Copy a value">
            <p className="text-sm leading-relaxed text-fog">
              Fields like VIN, email, and phone have a small copy icon; click it
              to copy the value. A phone number is also a tap-to-call link.
            </p>
          </Task>
        </Section>

        {/* ---- Transaction (Fees + Forms, merged) ------------------------ */}
        <Section id="transaction" title="Transaction">
          <p className="text-sm leading-relaxed text-fog">
            One tab for a whole counter transaction. Pick the customer and
            vehicle once at the top; that selection drives both the fee &amp; tax
            calculator (<strong className="text-ink">Step 1</strong>) and the
            OMV documents (<strong className="text-ink">Step 2</strong>).
          </p>

          <Task id="fees-calculator" title="The fee & tax calculator">
            <p className="text-sm leading-relaxed text-fog">
              Step 1. An internal counter estimate. Tax is based on the
              buyer&rsquo;s parish of residence, not 88 Title&rsquo;s location.
            </p>
            <Steps>
              <li>
                Optional: under{" "}
                <strong className="text-ink">Customer &amp; vehicle</strong> at
                the top, search a customer (this sets their parish) or a vehicle.
              </li>
              <li>Pick the buyer&rsquo;s parish of residence.</li>
              <li>
                Enter the vehicle figures (selling price, trade-in, rebate).
              </li>
              <li>Check any 88 Title service fees on this transaction.</li>
              <li>
                The right panel shows the itemized breakdown and the total
                collected at the counter.
              </li>
            </Steps>
            <Note>
              The statutory $23 tag fee is always its own discrete line, never
              merged.
            </Note>
          </Task>

          <Task id="recording-a-transaction" title="Recording a transaction">
            <p className="text-sm leading-relaxed text-fog">
              This saves the figures shown to the day&rsquo;s ledger. It lives in
              the <strong className="text-ink">Fees &amp; tax</strong> section;
              after generating documents, a reminder points you back here.
            </p>
            <Steps>
              <li>Choose the service type (and add an optional note).</li>
              <li>
                Click <strong className="text-ink">Record</strong>. The amounts
                are frozen exactly as shown.
              </li>
              <li>
                A confirmation shows the transaction&rsquo;s short id and a link
                to view it in the ledger.
              </li>
            </Steps>
            <Note>
              The statutory $23 is always included in a recorded transaction.
            </Note>
          </Task>

          <Task id="forms-documents" title="Generating documents">
            <p className="text-sm leading-relaxed text-fog">
              Step 2. Fill print-ready OMV forms from the customer and vehicle
              selected above.
            </p>
            <Steps>
              <li>
                Use the <strong className="text-ink">Customer &amp; vehicle</strong>{" "}
                selection at the top (the customer is the buyer / owner / donee).
                It is shared with the fee calculator.
              </li>
              <li>
                If it is a gift, tick{" "}
                <strong className="text-ink">This is a gift (donation)</strong>.
                That swaps the Bill of Sale for an Act of Donation; the Vehicle
                Application generates either way.
              </li>
              <li>Add the other party&rsquo;s name and the figures.</li>
              <li>
                Under{" "}
                <strong className="text-ink">Documents to generate</strong>,
                check the ones you need. The Vehicle Application and the transfer
                document (Bill of Sale, or Act of Donation for a gift) are
                pre-checked; add{" "}
                <strong className="text-ink">
                  Permission to Process (1806)
                </strong>{" "}
                if you need it.
              </li>
              <li>
                Choose <strong className="text-ink">Open to print</strong> or{" "}
                <strong className="text-ink">Download</strong>, then click{" "}
                <strong className="text-ink">Generate selected</strong>. The
                checked documents come out together in one file.
              </li>
            </Steps>
            <Note>
              To put it on the day&rsquo;s ledger, record it in the Fees &amp;
              tax section above. See{" "}
              <Link
                href="#recording-a-transaction"
                className="font-semibold text-ink underline underline-offset-2 hover:text-plate"
              >
                Recording a transaction
              </Link>
              .
            </Note>
          </Task>

          <Task
            id="forms-blank-by-design"
            title="Fields left blank on purpose"
          >
            <p className="text-sm leading-relaxed text-fog">
              Some fields on the generated forms are left blank on purpose:
            </p>
            <Bullets>
              <li>
                All signature, witness, and notary blocks. These are signed in
                person.
              </li>
              <li>
                The <strong className="text-ink">Make</strong> field on the
                Vehicle Application. The template has no fillable Make field, so
                handwrite it. (It is filled on the Bill of Sale / Donation.)
              </li>
              <li>
                The OMV fee grid (Title Fee, Handling Fee, License Fee, and
                totals). The office computes those; only Tax Value and Tax are
                filled.
              </li>
              <li>
                The statutory <strong className="text-ink">$23</strong> public
                tag fee. It stays its own discrete line in the{" "}
                <Link
                  href="/staff/transaction"
                  className="font-semibold text-ink underline underline-offset-2 hover:text-plate"
                >
                  Fees &amp; tax section
                </Link>
                , never merged onto these forms.
              </li>
              <li>
                On the{" "}
                <strong className="text-ink">
                  Permission to Process (1806)
                </strong>
                : the owner and vehicle pre-fill, but the{" "}
                <strong className="text-ink">person you authorize</strong> and
                the <strong className="text-ink">transaction type</strong> are
                completed by hand. The 1806 authorizes a specific person for a
                specific action, so that is a decision, not a merge.
              </li>
            </Bullets>
          </Task>
        </Section>

        {/* ---- Ledger ---------------------------------------------------- */}
        <Section id="ledger" title="Ledger">
          <Task id="transactions-ledger" title="The day's ledger">
            <p className="text-sm leading-relaxed text-fog">
              The tab opens on today&rsquo;s ledger. Use the{" "}
              <strong className="text-ink">Day</strong> picker to view another
              day.
            </p>
            <Bullets>
              <li>
                The tiles show total collected, 88 Title revenue, the
                pass-through to state / parish, and the transaction count.
              </li>
              <li>
                Each row has the time, a short id, customer, service, the
                amounts, who processed it, and its status.
              </li>
              <li>
                <strong className="text-ink">History</strong> on a row shows its
                append-only trail (recorded, voided) with who and when.
              </li>
            </Bullets>
          </Task>

          <Task id="voiding" title="Voiding a transaction">
            <Steps>
              <li>
                On the row, click <strong className="text-ink">Void</strong>.
              </li>
              <li>Enter a reason for the void (required).</li>
              <li>
                Click <strong className="text-ink">Confirm void</strong>.
              </li>
            </Steps>
            <Note>
              A voided transaction stays on the ledger, struck through, with its
              reason. Voiding is recorded in the activity trail; it does not
              delete anything.
            </Note>
          </Task>

          <Task id="transactions-csv" title="Export a CSV">
            <p className="text-sm leading-relaxed text-fog">
              Click <strong className="text-ink">Export CSV</strong> to download
              the selected day&rsquo;s rows as a spreadsheet file.
            </p>
          </Task>

          <Task
            id="transactions-report"
            title="Print the reconciliation report"
          >
            <p className="text-sm leading-relaxed text-fog">
              Click <strong className="text-ink">Print report</strong> to open
              the monochrome reconciliation report for the selected day and print
              it. It separates 88 Title revenue from the state / parish and
              statutory pass-through, and carries a &ldquo;Prepared by&rdquo; line
              with your name.
            </p>
          </Task>

          <Task id="activity-log" title="The activity log">
            <p className="text-sm leading-relaxed text-fog">
              Switch to the <strong className="text-ink">Activity</strong> view
              for the append-only trail of who did what, newest first.
            </p>
            <Steps>
              <li>Filter by entity type if you want.</li>
              <li>Page through with Newer / Older.</li>
            </Steps>
            <Note>
              This view is read-only. The ledger is the exportable record; the
              activity trail is the history.
            </Note>
          </Task>
        </Section>
      </div>
    </ConsolePage>
  );
}

/** Contents entries — kept in sync with the top-level Section ids below. */
const CONTENTS: { anchor: string; label: string }[] = [
  { anchor: "first-day", label: "First day" },
  { anchor: "queue", label: "Queue" },
  { anchor: "records", label: "Records" },
  { anchor: "transaction", label: "Transaction" },
  { anchor: "ledger", label: "Ledger" },
];

/**
 * A top-level tab section: a hairline top rule, an anchored h2, and a short
 * plate-red accent (echoing the header's active-tab underline) so each tab reads
 * as its own block. scroll-mt clears the sticky console header on a jump.
 */
function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className="scroll-mt-32 border-t border-line pt-10"
    >
      <h2
        id={id}
        className="font-display text-2xl font-extrabold text-ink sm:text-[1.75rem]"
      >
        {title}
      </h2>
      <span aria-hidden className="mt-2.5 block h-[3px] w-8 rounded-full bg-plate" />
      <div className="mt-6 space-y-8">{children}</div>
    </section>
  );
}

/** An anchored task within a section: an h3 the "?" affordances deep-link to. */
function Task({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div id={id} className="scroll-mt-32">
      <h3 className="font-display text-lg font-extrabold text-ink">{title}</h3>
      <div className="mt-2.5 space-y-3">{children}</div>
    </div>
  );
}

/** A numbered step list, styled once with breathing room between steps. */
function Steps({ children }: { children: ReactNode }) {
  return (
    <ol className="list-decimal space-y-2.5 pl-5 text-sm leading-relaxed text-ink marker:font-semibold marker:text-fog">
      {children}
    </ol>
  );
}

/** A bulleted list sharing the Steps rhythm, for non-sequential points. */
function Bullets({ children }: { children: ReactNode }) {
  return (
    <ul className="list-disc space-y-2.5 pl-5 text-sm leading-relaxed text-fog marker:text-fog/50">
      {children}
    </ul>
  );
}

/**
 * A term/definition reference for control names (Complete, Recall, …): a framed,
 * hairline-ruled table with the term column aligned, so enumerated controls read
 * as a proper two-column reference. Stacks on a phone, aligns from sm up.
 */
function Defs({ items }: { items: [string, string][] }) {
  return (
    <dl className="overflow-hidden rounded-lg border border-line text-sm leading-relaxed">
      {items.map(([term, def], i) => (
        <div
          key={term}
          className={`px-4 py-3 sm:flex sm:gap-4 ${
            i > 0 ? "border-t border-line" : ""
          }`}
        >
          <dt className="font-semibold text-ink sm:w-44 sm:shrink-0">{term}</dt>
          <dd className="mt-0.5 text-fog sm:mt-0">{def}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * The one callout treatment — a plate-red left accent on a tinted surface —
 * reused for the scope note and every task caveat, replacing the old ad-hoc
 * boxes. Optional className lets a caller set outer spacing (the scope note).
 */
function Note({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-r-md border-l-2 border-plate bg-mist/70 px-4 py-3 text-sm leading-relaxed text-fog ${
        className ?? ""
      }`}
    >
      {children}
    </div>
  );
}
