# DPSMV form field map (audit)

Every fillable AcroForm field in each of the four real OMV templates we generate,
mapped to the app data path that feeds it, or marked **BLANK BY DESIGN** with the
reason. This is the source of truth for "is every mappable field mapped, and is
every blank field blank on purpose." It is transcribed from the actual templates
in `/public` (field names are exact, including the templates' own quirks) and must
be kept in sync with `lib/forms/fields.ts` + `lib/forms/mapping.ts`.

`scripts/forms-selftest.mjs` fills all four templates from fixtures and reads the
values back to prove the mapped/blank split below actually holds. Re-run it after
any change here: `npm run test:forms`.

## Data sources (legend)

- `customer.*` — a saved customer row from the RLS-gated records DAL
  (`getCustomerById`). `id_number` is sensitive: it feeds the DL field **only**
  when `id_type === "drivers_license"`, is resolved server-side, and is never
  logged or sent to the client.
- `vehicle.*` — a saved vehicle row (`getVehicleById`).
- `req.*` — values the clerk enters for this transaction (`FormGenRequest`).
- `fees.*` — server-computed figures (`FormComputed`) from the domicile tax
  engine. All money is integer cents.
- **Gating rules honored everywhere:** money renders BLANK when the amount is
  zero/unset (never `$0.00`/`0.00` — a false price on a signed document);
  transaction dates render BLANK when not entered (never today); only a
  "date prepared / generated" field uses today. Signature/witness/notary blocks
  are never filled. The statutory `$23` public tag fee is never placed on a form
  (it stays its own discrete line on the fee calculator).

---

## 1. Bill of Sale of a Movable — `public/18538728.pdf` (11 fields)

> **Year split:** the template ships ONE field named `Year` wired to two blanks —
> the vehicle-description "Year:" line **and** the execution-date "…year of ___"
> line. `lib/forms/pdf.ts#splitBillOfSaleYear` splits it on the loaded document so
> the vehicle blank becomes a `Vehicle Year` field (filled) and the execution-year
> blank keeps the `Year` name (blank). The template file on disk is untouched.

| Field (exact name) | Source / status |
| --- | --- |
| `Parish of` | `req.executionParish` |
| `Seller of legal age who herby sells and delivers with full and general warranty of title unto` | `req.counterpartyName` (the seller) |
| `Buyer of legal age the following movable property` | `customer.full_name` (the buyer) |
| `Make` | `vehicle.make` |
| `Model` | `vehicle.model` |
| `Vehicle Year` *(split from `Year`)* | `vehicle.year` |
| `Vehicle Identification Number VIN` | `vehicle.vin` |
| `Vehicle Sale Price` | `fees.sellingCents` (money, BLANK when unset) |
| `Date of Sale` | `req.date` (BLANK when unset — never today) |
| `Year` *(execution-year widget after split)* | **BLANK BY DESIGN** — signed/notarized in person |
| `Day` | **BLANK BY DESIGN** — execution date, signed in person |
| `Month` | **BLANK BY DESIGN** — execution date, signed in person |

Signatures (Seller, Buyer, Notary Public) have no fillable widgets and are signed
in person.

---

## 2. Act of Donation of a Movable (DPSMV1699) — `public/18544277.pdf` (14 fields)

The saved customer is the **donee** (new owner); the counterparty is the **donor**.
`Vehicle Year` and the execution `Year` are already distinct fields here (no split
needed).

| Field (exact name) | Source / status |
| --- | --- |
| `Parish of` | `req.executionParish` |
| `Donor` | `req.counterpartyName` |
| `Donee` | `customer.full_name` |
| `Make` | `vehicle.make` |
| `Model` | `vehicle.model` |
| `Vehicle Year` | `vehicle.year` |
| `VIN` | `vehicle.vin` |
| `The relationship between Donor and Donee is as follows` | `req.relationship` |
| `The value of the movable property donated herein is` | `fees.sellingCents` (money, BLANK when unset) |
| `Notary Printed Name` | **BLANK BY DESIGN** — notarized in person |
| `Notary ID` | **BLANK BY DESIGN** — notarized in person |
| `Day` | **BLANK BY DESIGN** — execution date |
| `Month` | **BLANK BY DESIGN** — execution date |
| `Year` | **BLANK BY DESIGN** — execution date |

Witness / Donor / Donee signatures have no fillable widgets (signed in person).

---

## 3. Permission to Process Transaction (DPSMV 1806) — `public/forms/dpsmv-1806-permission-to-process-transaction.pdf` (23 fields)

> The field names read "backwards": each was auto-named after the text that
> FOLLOWS its blank. The **owner** printed-name blank is named
> `do hereby give permission for`; the **permittee** blank is named `Print`.

| Field (exact name) | Source / status |
| --- | --- |
| `do hereby give permission for` | `customer.full_name` (the owner) |
| `YEAR` | `vehicle.year` |
| `MAKE` | `vehicle.make` |
| `MODEL` | `vehicle.model` |
| `VIN NUMBER` | `vehicle.vin` |
| `Owners Drivers License Number` | `customer.id_number` (gated: DL only) |
| `Print` | **BLANK BY DESIGN** — the person authorized is a human decision |
| `to process my transaction indicated below with the` | **BLANK BY DESIGN** — prose blank on the form |
| `on the following described vehicle` | **BLANK BY DESIGN** — prose blank on the form |
| `Renewal or Replacement of License Plate` | **BLANK BY DESIGN** — transaction type, checked by hand |
| `Obtain a Duplicate Registration Certificate` | **BLANK BY DESIGN** — transaction type |
| `Process a transfer of Ownership new owner must have DPSMV 1799 form` | **BLANK BY DESIGN** — transaction type |
| `Surrender a License Plate` | **BLANK BY DESIGN** — transaction type |
| `CreateChangeor Update International Registration Plan IRP` | **BLANK BY DESIGN** — transaction type |
| `Clear a Flag or Suspension on My Driving Record` | **BLANK BY DESIGN** — transaction type |
| `Fleet or Unit` | **BLANK BY DESIGN** — transaction type detail |
| `Obtain a Copy of My Official Driving Record  must have DPSMV 2106` | **BLANK BY DESIGN** — transaction type |
| `Other` / `Other_2` / `undefined` | **BLANK BY DESIGN** — free-text transaction detail |
| `This form IS NOT a power of attorney and the above named person cannot sign` | **BLANK BY DESIGN** — disclosure prose blank |
| `Owners Signature` | **BLANK BY DESIGN** — signed in person |
| `Date` | **BLANK BY DESIGN** — dated in person |

---

## 4. Vehicle Application — `public/14249283.pdf` (127 fields, page 1 holds all mapped data)

> **Make quirk:** the `Make` field is wired to TWO widgets — the page-1 vehicle
> row AND a page-2 plate-transfer affidavit that is left entirely blank. Filling
> `Make` would bleed the make onto page 2, so it is **left for handwriting** on the
> vehicle line (the make is on file). It could be split like the Bill of Sale
> `Year` if page-1 Make should auto-fill; kept as-is per the design that never
> touches page 2.

### Page 1 — MAPPED

| Field (exact name) | Source / status |
| --- | --- |
| `Date Prepared` | `fees.today` (date generated — the today exception) |
| `VIN` | `vehicle.vin` |
| `Body` | `vehicle.body_style` |
| `Color` | `vehicle.color` |
| `Year` | `vehicle.year` |
| `Model` | `vehicle.model` |
| `Name of Owner` | `customer.full_name` |
| `DL` | `customer.id_number` (gated: DL only) |
| `Owner Principal Address` | `customer.address_line1` + `address_line2` |
| `City` | `customer.city` |
| `Parish` | `customer.parish` |
| `State/Zip` | `customer.state` + `postal_code` |
| `Trade VIN` | `req.tradeVin` |
| `Date Acquired` | `req.date` (BLANK when unset — never today) |
| `Cost of Vehicle` | `fees.sellingCents` (money, BLANK when unset) |
| `Less Trade` | `fees.tradeInCents` (money, BLANK when unset) |
| `Rebate` | `fees.rebateCents` (money, BLANK when unset) |
| `Tax Value` | `fees.taxableCents` (money, BLANK when unset) |
| `Tax` | `fees.taxCents` (money, BLANK when unset) |
| `1st Lienholder` | `req.lienholderName` (only when a lien is supplied) |
| `Street` | `req.lienholderAddress` |
| `CityStateZip` | `req.lienholderCityStateZip` |

### Page 1 — BLANK BY DESIGN

| Field(s) | Reason |
| --- | --- |
| `Make` | Shared page-1/page-2 widget; handwritten on the vehicle line (see quirk above) |
| `Type of Plate`, `Dealer Code`, `License No`, `Exp Date`, `Mileage`, `ELT` | Office-entered / no data source |
| `Name of Joint Owner`, `DL1` | No joint owner on file |
| `Domicile Code` | OMV numeric parish code is not in our data |
| `Name`, `DL2`, `Streets`, `City1`, `Parish1`, `State/Zip1` | Second party/address block — no source |
| `Trade Lic #` | No source |
| `2nd Lienholder`, `Street1`, `CityStateZip1`, `ELTs` | Second lienholder not supplied |
| `Check Box28`–`Check Box33` | Mail-renewal / lessee / renter / duplicate-title situational checkboxes |
| `Check Box50`, `Check Box51` | New / Used condition — not stored |
| `Tax Date` | Office-entered |
| `Previous Title #`, `State Abr` | No source |
| `Title Fee`, `Mtg Fee`, `Lic Fee`, `Lic Transfer Fee`, `Lic Credit`, `Lic Pen`, `Lic Pen Credit`, `Tax Penalty`, `Interest`, `Vendors Comp`, `Tax Credit`, `Hdlg Fee`, `Tow Fee`, `Misc Fee`, `Total Fees`, `Total Taxes`, `Grand Total` | OMV-computed statutory fee grid — never from our fee engine. **The statutory `$23` public tag fee is deliberately NOT placed here** (stays its own discrete line on the fee calculator, never merged into the grid) |
| `Check Box78`–`Check Box81` | Situational checkboxes |
| `Day`, `Month`, `Year1`, `ID#`, `Date1`, `Date2`, `Day1`, `Month1`, `Yr1`, `ID#1`, `Check Box88`, `Check Box89` | Sworn / notarized-in-person date + notary blocks |
| `Rec'd/Rejection Date(s)`, `Form #` | Office / pre-printed |

### Page 2 — BLANK BY DESIGN (entire page)

Page 2 is a set of situational affidavits (plate transfer / cancellation,
lost-plate, farm-use, out-of-state, salvage) completed and signed in person only
when they apply. **No page-2 field is ever auto-filled.** Fields:
`Old License Plate Number`, `New License Plate Number`, `Use`, `Use1`, `Weight`,
`YearMakeVIN`, `Lic Plate`, `Returned`, `lic plate #1`, `Check Box104`,
`Check Box105`, `comment`, `comments`, `Error`, `Error1`, `City2`, `Parish2`,
`RFD`, `Box`, `Zip2`, `Make` (page-2 widget), `Mode11`, `VIN3`, `Printed Name`,
`Domiciled`, `Printed Name of Owner`, `Make1`, `Model1`, `VIN4`, `Check Box126`,
`Check Box128`, `Comment`, `Comment1`, `Check Box131`–`Check Box134`, `Month6`,
`Year6`.
