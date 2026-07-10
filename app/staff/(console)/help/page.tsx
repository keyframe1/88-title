import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getDealerContext } from "@/lib/dealers/dal";
import { SignOutButton } from "@/components/dealers/SignOutButton";
import { HelpContents, type HelpTocEntry } from "@/components/staff/HelpContents";
import { Pelican } from "@/components/brand/Pelican";

export const metadata: Metadata = {
  title: "Staff help",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * /staff/help: the single source of truth for how the 88 Title console works.
 *
 * A plain, readable training + lookup reference: "First day" and "Your first
 * week", then one section per tab (Queue, Records, Transaction, Dealers, Ledger).
 * Every task carries a STABLE anchor id so the console's quiet "?" affordances can
 * deep-link straight to it (guidance lives here and only here). Static TSX, one
 * small client island for the table of contents; no CMS, no data.
 *
 * Layout is the console's own language: Overpass headings, Inter body, paper
 * surface, navy text, plate-red used sparingly, and reserved, in its loudest
 * form, for the callouts that warn a step emails a dealer or customer. A sticky
 * left rail (HelpContents) tracks the reader's place and collapses to a top jump
 * menu on a phone. Heading order is semantic: the page h1, an h2 per section, an
 * h3 per task, so anchors and screen readers both hold. Prints as a clean
 * single-column reference (the rail and jump menu drop out).
 *
 * Scope is deliberate: this covers the 88 Title app workflow only. Steps at the
 * OMV terminal, and OMV policy / eligibility / "requirements", are out of scope by
 * design; where a step would need OMV knowledge, we name the app action and stop.
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
          <SignOutButton redirectTo="/staff/login" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* Page header. Remy stands at rest here (embosser at his feet, no
          entrance), the staff console's quiet mascot beside the title. */}
      <header className="border-b border-line pb-6">
        <div className="flex items-center gap-4">
          <Pelican pose="rest" size={72} className="shrink-0" />
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-plate">
              Staff reference
            </p>
            <h1 className="mt-2 font-display text-3xl font-extrabold text-ink sm:text-4xl">
              Staff help
            </h1>
          </div>
        </div>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-fog">
          How the 88 Title console works: sign-in, the tabs, and the everyday
          how-do-I. This is the single reference; the small ? links around the
          console point back here.
        </p>
      </header>

      {/* Two-column: sticky rail + article. The rail collapses to a top jump
          menu below lg (HelpContents renders both, print-hidden). */}
      <div className="mt-8 lg:grid lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-12">
        <HelpContents entries={CONTENTS} />

        <article className="min-w-0 space-y-12">
          {/* Scope note: the one callout treatment, reused for every caveat. */}
          <Note>
            This guide covers the 88 Title console only. Steps at the OMV
            terminal, and OMV policy or requirements, are out of scope by design.
          </Note>

          {/* ---- First day ------------------------------------------------ */}
          <Section id="first-day" title="First day">
            <Steps>
              <li>
                Sign in at the staff login with your own email and password.
              </li>
              <li>
                Confirm your name shows at the top right of the console. That
                name is who the activity trail credits for everything you do, so
                make sure it is yours.
              </li>
              <li>
                The <B>Queue</B> is your home tab. It opens when you sign in and
                when you click the 88 Title mark.
              </li>
              <li>
                Everyone has their own login. Never share credentials or work
                under someone else&rsquo;s name.
              </li>
              <li>
                Sign out when you step away from the counter (Sign out, top
                right).
              </li>
            </Steps>
          </Section>

          {/* ---- Your first week ------------------------------------------ */}
          <Section id="first-week" title="Your first week">
            <p className="text-sm leading-relaxed text-fog">
              A sensible order to learn the console. Take the tabs one at a time;
              each builds on the last.
            </p>
            <Bullets>
              <li>
                <B>Shadow the Queue</B> for a shift. Watch check-ins arrive, get
                marked in the lobby, called up, and completed. Learn the three
                tiles and the serving controls before you drive it yourself.
              </li>
              <li>
                <B>Get comfortable in Records.</B> Open a customer, open a
                vehicle, follow the links between them, and read a record&rsquo;s
                history. This is where the customer graph lives.
              </li>
              <li>
                <B>Run a full Transaction</B> with a real checklist: pick the
                customer and vehicle once, work the fee &amp; tax figures,
                generate the documents, then record it to the ledger.
              </li>
              <li>
                <B>Take on Dealers</B>, and learn the rule that matters:
                internal moves are instant, but marking a deal{" "}
                <B>ready for pickup</B> or flagging one <B>emails the dealer</B>,
                so the console asks you to confirm first.
              </li>
              <li>
                <B>Close a day on the Ledger.</B> Read the day&rsquo;s tiles,
                export the CSV, and print the end-of-day reconciliation report.
              </li>
            </Bullets>
          </Section>

          {/* ---- Queue ---------------------------------------------------- */}
          <Section id="queue" title="Queue">
            <p className="text-sm leading-relaxed text-fog">
              The live line. The three tiles at the top count who is{" "}
              <B>Serving</B>, <B>Waiting</B> (and how many are in the lobby), and{" "}
              <B>No-shows</B>. New check-ins appear automatically.
            </p>

            <Task id="queue-arrivals" title="Arrivals and the lobby">
              <p className="text-sm leading-relaxed text-fog">
                A waiting customer shows <B>On the way</B> until they are marked
                arrived, then <B>In lobby</B>. Customers can mark themselves
                arrived; you can do it for them.
              </p>
              <Steps>
                <li>Find the customer&rsquo;s waiting row.</li>
                <li>
                  Click <B>Mark arrived</B> to move them to In lobby.
                </li>
                <li>
                  Click <B>Call up</B> to start serving them. If they have not
                  been marked arrived, the console asks you to confirm first.
                  Calling up sends their notification (email and push).
                </li>
                <li>
                  <B>Cancel</B> removes a waiting customer from the day&rsquo;s
                  line. It asks you to confirm by name, and sends no
                  notification.
                </li>
              </Steps>
            </Task>

            <Task id="queue-serving" title="Serving a customer">
              <p className="text-sm leading-relaxed text-fog">
                Once a customer is Serving, their row shows these controls:
              </p>
              <Defs
                items={[
                  [
                    "Complete",
                    "Finishes the visit. No notification is sent. You can undo it from the toast.",
                  ],
                  [
                    "Recall",
                    "Re-sends the same email and push. Use it if they did not hear the first call.",
                  ],
                  [
                    "Return to waiting",
                    "Puts them back in line with no notification.",
                  ],
                  ["No-show", "Moves them to the No-shows list. No notification."],
                  [
                    "Start transaction",
                    "Opens the Transaction tab linked to this check-in, so a recorded transaction ties back to it.",
                  ],
                ]}
              />
            </Task>

            <Task id="queue-checklist" title="The counter checklist">
              <p className="text-sm leading-relaxed text-fog">
                The serving row lists the transaction&rsquo;s what-to-bring
                items, each with a checkbox, and a running{" "}
                <B>N of M confirmed</B> count.
              </p>
              <Steps>
                <li>
                  Tick each document as you confirm it in person; the count
                  updates and the item strikes through.
                </li>
                <li>
                  Some items link a blank PDF. Open it to hand or print the form.
                </li>
              </Steps>
              <Note>
                Reference only. Nothing is blocked by the checklist; always
                confirm each document in person.
              </Note>
            </Task>

            <Task id="queue-no-show" title="No-shows">
              <p className="text-sm leading-relaxed text-fog">
                Customers you called up who did not appear collect in the
                No-shows list.
              </p>
              <Steps>
                <li>
                  When they turn up, click <B>Call again</B>. It re-sends the
                  same notification and returns them to Serving.
                </li>
                <li>
                  <B>Cancel</B> removes them from the day&rsquo;s line (it asks
                  you to confirm by name).
                </li>
              </Steps>
            </Task>
          </Section>

          {/* ---- Records -------------------------------------------------- */}
          <Section id="records" title="Records">
            <p className="text-sm leading-relaxed text-fog">
              Saved customers and vehicles, and the links between them. Enter
              someone once and reuse them on the Transaction tab. A switcher at
              the top moves between <B>Customers</B>, <B>Vehicles</B>, and{" "}
              <B>Renewals</B>. Everything here is staff-only.
            </p>

            <Task id="records-find" title="Find a record">
              <p className="text-sm leading-relaxed text-fog">
                Customers and Vehicles open on your most recent records; the
                search is scoped to the switcher&rsquo;s current view.
              </p>
              <Steps>
                <li>
                  Pick <B>Customers</B> or <B>Vehicles</B> in the switcher. Each
                  chip shows a count.
                </li>
                <li>
                  Type a name, email, phone, or VIN in the search box; results
                  replace the recent list as you type.
                </li>
                <li>Clear the box to return to the recent list.</li>
              </Steps>
            </Task>

            <Task id="records-add" title="Add a customer or vehicle">
              <Steps>
                <li>
                  Click <B>+ Add customer</B> or <B>+ Add vehicle</B> at the top
                  right.
                </li>
                <li>Fill the form and Save.</li>
                <li>
                  In a vehicle form, type the VIN and click <B>Decode VIN</B> to
                  fill year, make, model, and body. Edit any field by hand
                  afterward; if the lookup fails, enter the details manually.
                </li>
              </Steps>
              <Note>
                Adds match and reuse: a customer is reused when the name and email
                or phone match, a vehicle when the VIN matches. The same person or
                car is never duplicated.
              </Note>
            </Task>

            <Task id="records-panel" title="Open a record">
              <p className="text-sm leading-relaxed text-fog">
                Click any row to open its detail panel on the right. The panel is
                where the connected picture lives: contact, links, history, and
                the Edit / Delete actions.
              </p>
              <Bullets>
                <li>
                  <B>Contact.</B> Email and phone each have a copy icon; the phone
                  also has a <B>Call</B> button and is a tap-to-call link.
                </li>
                <li>
                  A vehicle panel shows the <B>VIN</B> with its own Copy button.
                </li>
                <li>
                  <B>History</B> lists the record&rsquo;s recent transactions with
                  status; <B>View all</B> expands the rest.
                </li>
                <li>
                  Cross-links open in place: clicking a linked vehicle from a
                  customer swaps the panel to that vehicle, and back. The × always
                  closes.
                </li>
              </Bullets>
            </Task>

            <Task id="records-links" title="Linked vehicles and customers">
              <p className="text-sm leading-relaxed text-fog">
                A customer panel lists <B>Linked vehicles</B>; a vehicle panel
                lists <B>Linked customers</B>. Two kinds of link show here.
              </p>
              <Bullets>
                <li>
                  <B>Staff-made links</B> carry an unlink <B>×</B>. Click it to
                  remove the link (a confirm follows). Only the link goes; both
                  records are kept.
                </li>
                <li>
                  <B>Via transaction</B> rows are derived from a shared
                  transaction. They cannot be unlinked (you cannot un-happen a
                  transaction), so they carry no ×.
                </li>
              </Bullets>
              <Steps>
                <li>
                  Click <B>+ Link vehicle</B> (or <B>+ Link customer</B>) to open
                  the picker.
                </li>
                <li>
                  Search for the record and pick it, or click{" "}
                  <B>+ New vehicle / + New customer</B> to create one and link it
                  on save.
                </li>
              </Steps>
            </Task>

            <Task id="records-renewal" title="Renewal date and consent">
              <p className="text-sm leading-relaxed text-fog">
                A customer&rsquo;s renewal date and reminder consent live on their
                record. Set them in the Edit form&rsquo;s{" "}
                <B>Renewal reminder</B> section.
              </p>
              <Steps>
                <li>
                  Open the customer and click <B>Edit</B>.
                </li>
                <li>
                  Set the <B>Renewal date</B> (when their registration renews) and
                  tick <B>Consented to reminders</B> if they agreed.
                </li>
                <li>Save.</li>
              </Steps>
              <Note>
                Renewal info captured at check-in attaches to the customer when a
                transaction links them, so a record can already show a renewal
                date &ldquo;from latest check-in&rdquo; before you set one here.
                Only consented customers with a date appear in Renewals.
              </Note>
            </Task>

            <Task id="records-edit-delete" title="Edit or delete">
              <Steps>
                <li>
                  In the panel, click <B>Edit</B> to change the record, or{" "}
                  <B>Delete</B> to remove it. Delete asks you to confirm.
                </li>
              </Steps>
              <Note>
                Editing updates the record in place, so fixing a typo never makes
                a duplicate. Deleting removes the record but keeps past check-ins
                and transactions; they are unlinked, not deleted. The history
                stays, without this record attached.
              </Note>
            </Task>

            <Task id="records-renewals-view" title="The Renewals view">
              <p className="text-sm leading-relaxed text-fog">
                The <B>Renewals</B> switcher lists consented customers with a
                known renewal date, soonest first, with days out and a{" "}
                <B>Consented</B> tag.
              </p>
              <Steps>
                <li>Search to filter the list by name, email, or phone.</li>
                <li>
                  Click <B>Export CSV</B> to download the visible rows as a
                  spreadsheet file.
                </li>
              </Steps>
              <Note>
                This view fills in as check-ins are linked to customer records.
                Renewal dates are captured at check-in, so a customer appears once
                they have consented and have a date on file.
              </Note>
            </Task>
          </Section>

          {/* ---- Transaction (Fees + Forms, merged) ---------------------- */}
          <Section id="transaction" title="Transaction">
            <p className="text-sm leading-relaxed text-fog">
              One tab for a whole counter transaction. Pick the customer and
              vehicle once at the top under <B>Customer &amp; vehicle</B>; that
              selection drives both the fee &amp; tax calculator (<B>Step 1</B>)
              and the OMV documents (<B>Step 2</B>).
            </p>

            <Task id="fees-calculator" title="The fee & tax calculator">
              <p className="text-sm leading-relaxed text-fog">
                Step 1. An internal counter estimate. Tax is based on the
                buyer&rsquo;s parish of residence, not 88 Title&rsquo;s location.
              </p>
              <Steps>
                <li>
                  Optional: under <B>Customer &amp; vehicle</B> at the top, search
                  a customer (this sets their parish) or a vehicle.
                </li>
                <li>Pick the buyer&rsquo;s parish of residence (domicile).</li>
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
                This saves the figures shown to the day&rsquo;s ledger. It lives
                in the <B>Record transaction</B> panel next to the Step 1 figures;
                after generating documents, a reminder points you back here.
              </p>
              <Steps>
                <li>Choose the service type (and add an optional note).</li>
                <li>
                  Click <B>Record</B>. The amounts are frozen exactly as shown.
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
                  Use the <B>Customer &amp; vehicle</B> selection at the top (the
                  customer is the buyer / owner / donee). It is shared with the
                  fee calculator.
                </li>
                <li>
                  If it is a gift, tick <B>This is a gift (donation)</B>. That
                  swaps the Bill of Sale for an Act of Donation; the Vehicle
                  Application generates either way.
                </li>
                <li>Add the other party&rsquo;s name and the figures.</li>
                <li>
                  Under <B>Documents to generate</B>, check the ones you need. The
                  Vehicle Application and the transfer document (Bill of Sale, or
                  Act of Donation for a gift) are pre-checked; add{" "}
                  <B>Permission to Process (1806)</B> if you need it.
                </li>
                <li>
                  Choose <B>Open to print</B> or <B>Download</B>, then click{" "}
                  <B>Generate selected</B>. The checked documents come out
                  together in one file.
                </li>
              </Steps>
              <Note>
                To put it on the day&rsquo;s ledger, record it in the Record
                transaction panel. See{" "}
                <A href="#recording-a-transaction">Recording a transaction</A>.
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
                  The <B>Make</B> field on the Vehicle Application. The template
                  has no fillable Make field, so handwrite it. (It is filled on
                  the Bill of Sale / Donation.)
                </li>
                <li>
                  The OMV fee grid (Title Fee, Handling Fee, License Fee, and
                  totals). The office computes those; only Tax Value and Tax are
                  filled.
                </li>
                <li>
                  The statutory <B>$23</B> public tag fee. It stays its own
                  discrete line in the{" "}
                  <A href="/staff/transaction">Step 1 fees &amp; tax</A>, never
                  merged onto these forms.
                </li>
                <li>
                  On the <B>Permission to Process (1806)</B>: the owner and
                  vehicle pre-fill, but the <B>person you authorize</B> and the{" "}
                  <B>transaction type</B> are completed by hand. The 1806
                  authorizes a specific person for a specific action, so that is a
                  decision, not a merge.
                </li>
              </Bullets>
            </Task>
          </Section>

          {/* ---- Dealers -------------------------------------------------- */}
          <Section id="dealers" title="Dealers">
            <p className="text-sm leading-relaxed text-fog">
              The deals dealers file with the office, one row per deal. Click a
              row to open its panel, where every action lives. Most moves are
              internal and instant, but a few email the dealer, and the console
              always asks you to confirm those first.
            </p>

            <EmailNote heading="The rule that matters">
              <B>Submitted</B>, <B>Received</B>, and <B>In progress</B> are
              internal and instant. <B>Ready for pickup</B> emails the dealer, so
              it asks you to confirm first. <B>Flagging</B> a deal (and updating
              the note) emails the dealer the note, also confirmed.{" "}
              <B>Clear flag</B> is confirmed because it changes what the dealer
              sees, but it sends no email. Corrections never email.
            </EmailNote>

            <Task id="dealers-list" title="The deals list">
              <p className="text-sm leading-relaxed text-fog">
                Filter tabs across the top scope the table; each shows a count.
              </p>
              <Defs
                items={[
                  ["Active", "Everything not yet picked up. The default view."],
                  ["Needs attention", "Only the deals you have flagged."],
                  [
                    "Ready for pickup",
                    "Deals marked ready, waiting on the dealer.",
                  ],
                  ["All", "Every deal, including picked-up ones."],
                ]}
              />
              <p className="text-sm leading-relaxed text-fog">
                Search by deal, dealer, or VIN. The columns read left to right:
              </p>
              <Defs
                items={[
                  ["Dealer", "The dealership that filed the deal."],
                  [
                    "Deal",
                    "Its reference (stock number, else a short id) and the vehicle.",
                  ],
                  ["Service", "The transaction type, as filed."],
                  ["Filed", "The exact date it was filed."],
                  ["Age", "Whole days since it was filed."],
                  ["Status", "One badge for where it is in the pipeline."],
                  ["Flag", "A red “Needs attention” badge when flagged."],
                ]}
              />
            </Task>

            <Task id="dealers-panel" title="The deal panel">
              <p className="text-sm leading-relaxed text-fog">
                A row click opens the panel. It shows the dealer, the deal
                reference, the vehicle, the type and filed date, and the{" "}
                <B>VIN</B> with a Copy button.
              </p>
              <Steps>
                <li>
                  The <B>pipeline stepper</B> shows the five stages: Submitted,
                  Received, In progress, Ready for pickup, Picked up. The current
                  stage is marked.
                </li>
                <li>
                  Click <B>Advance to &hellip;</B> to move the deal to the next
                  stage. Advancing to <B>Ready for pickup</B> asks you to confirm,
                  because it emails the dealer.
                </li>
                <li>
                  To step a deal back, use the <B>⋯</B> menu next to Advance
                  and pick <B>Return to &hellip;</B> under Corrections. A
                  correction is instant and never emails.
                </li>
              </Steps>
            </Task>

            <Task id="dealers-flag" title="Flagging a deal">
              <p className="text-sm leading-relaxed text-fog">
                A flag tells the dealer something needs fixing, and emails them the
                note. The flag has a small lifecycle.
              </p>
              <Steps>
                <li>
                  Click <B>Flag for attention</B>, type what needs fixing, and
                  click <B>Save &amp; notify dealer</B>. A confirm follows, since
                  it emails the dealer the note.
                </li>
                <li>
                  While flagged, the panel shows the note and{" "}
                  <B>who flagged it and when</B>. Click <B>Update note</B> to
                  change it, which re-emails the dealer the new note (confirmed).
                </li>
                <li>
                  Click <B>Clear flag</B> when it is resolved. This is confirmed
                  because the dealer will no longer see it flagged, but it sends no
                  email.
                </li>
              </Steps>
              <EmailNote>
                Raising a flag and updating its note both email the dealer. Only
                one email leaves per action; the buttons disable while it sends.
              </EmailNote>
            </Task>
          </Section>

          {/* ---- Ledger --------------------------------------------------- */}
          <Section id="ledger" title="Ledger">
            <p className="text-sm leading-relaxed text-fog">
              The day&rsquo;s record, behind two views: the <B>Ledger</B> (the
              exportable financial record) and the <B>Activity</B> trail (who did
              what, when). Switch between them with the control at the top.
            </p>

            <Task id="transactions-ledger" title="The day's ledger">
              <p className="text-sm leading-relaxed text-fog">
                The tab opens on today&rsquo;s ledger. Use the <B>Day</B> picker
                to view another day.
              </p>
              <Bullets>
                <li>
                  The tiles show total collected, 88 Title revenue, the
                  pass-through (tax + $23), and the transaction count.
                </li>
                <li>
                  Each row has the time, a short id, customer, service, the
                  amounts, who processed it, and its status.
                </li>
                <li>
                  <B>History</B> on a row shows its append-only trail (recorded,
                  voided) with who and when.
                </li>
              </Bullets>
            </Task>

            <Task id="voiding" title="Voiding a transaction">
              <Steps>
                <li>
                  On the row, click <B>Void</B>.
                </li>
                <li>Enter a reason for the void (required).</li>
                <li>
                  Click <B>Confirm void</B>.
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
                Click <B>Export CSV</B> to download the selected day&rsquo;s rows
                as a spreadsheet file.
              </p>
            </Task>

            <Task
              id="transactions-report"
              title="Print the reconciliation report"
            >
              <p className="text-sm leading-relaxed text-fog">
                Click <B>Print report</B> to open the monochrome reconciliation
                report for the selected day and print it. It separates 88 Title
                revenue from the state / parish and statutory pass-through, and
                carries a &ldquo;Prepared by&rdquo; line with your name.
              </p>
            </Task>

            <Task id="activity-log" title="The activity log">
              <p className="text-sm leading-relaxed text-fog">
                Switch to the <B>Activity</B> view for the append-only trail of
                who did what, newest first.
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
        </article>
      </div>
    </div>
  );
}

/** Contents entries, kept in sync with the top-level Section ids below. */
const CONTENTS: HelpTocEntry[] = [
  { anchor: "first-day", label: "First day" },
  { anchor: "first-week", label: "Your first week" },
  { anchor: "queue", label: "Queue" },
  { anchor: "records", label: "Records" },
  { anchor: "transaction", label: "Transaction" },
  { anchor: "dealers", label: "Dealers" },
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
      className="scroll-mt-28 border-t border-line pt-10 first:border-t-0 first:pt-0"
    >
      <h2
        id={id}
        className="font-display text-2xl font-extrabold text-ink sm:text-[1.75rem]"
      >
        {title}
      </h2>
      <span
        aria-hidden
        className="mt-2.5 block h-[3px] w-8 rounded-full bg-plate"
      />
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
    <div id={id} className="scroll-mt-28">
      <h3 className="font-display text-lg font-extrabold text-ink">{title}</h3>
      <div className="mt-2.5 space-y-3">{children}</div>
    </div>
  );
}

/** Bold inline term, matched to the ink body weight used across the reference. */
function B({ children }: { children: ReactNode }) {
  return <strong className="font-semibold text-ink">{children}</strong>;
}

/** An in-page or console link, one underline treatment. */
function A({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="font-semibold text-ink underline underline-offset-2 hover:text-plate"
    >
      {children}
    </Link>
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
 * The one neutral callout treatment: a plate-red left accent on a tinted
 * surface, reused for the scope note and every task caveat.
 */
function Note({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-r-md border-l-2 border-plate bg-mist/70 px-4 py-3 text-sm leading-relaxed text-fog">
      {children}
    </div>
  );
}

/**
 * The louder callout, reserved for the consequences that email a dealer or
 * customer: a red-tinted card echoing the console's flag card, so a step that
 * reaches outside the office is impossible to miss. An optional heading names it.
 */
function EmailNote({
  heading,
  children,
}: {
  heading?: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-plate/20 bg-plate/[0.05] p-4">
      {heading ? (
        <p className="mb-1.5 flex items-center gap-2 text-sm font-bold text-plate">
          <span aria-hidden className="h-1.5 w-1.5 rounded-[1px] bg-plate" />
          {heading}
        </p>
      ) : null}
      <p className="text-sm leading-relaxed text-ink/80">{children}</p>
    </div>
  );
}
