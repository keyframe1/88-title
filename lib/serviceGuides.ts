/**
 * 88 Title service guides — the editorial / SEO layer for the
 * /services/[slug] landing pages.
 *
 * This is deliberately SEPARATE from lib/checklists.ts. That file is the
 * transactional "what to bring" config that drives the DocumentFinder tool.
 * This file is the "learn and decide" content for someone who found us on
 * Google and hasn't committed yet: a plain-English explanation of how each
 * transaction works, the common questions people ask, and internal links to
 * related transactions.
 *
 * Two surfaces, one funnel:
 *   - Services (these guides) = learn / decide (SEO + FAQ landing pages).
 *   - Checklist (the DocumentFinder) = do (the interactive tool).
 * Each guide hands the visitor into the checklist; the checklist links back.
 *
 * ACCURACY RULES (this is Louisiana title / registration information, and
 * wrong info sends people on wasted trips):
 *   - Content is built on the real checklist items in lib/checklists.ts,
 *     expanded into fuller plain-English explanation.
 *   - We do NOT invent statute citations, fee amounts, hard deadlines, or
 *     procedural edge cases we can't be certain of.
 *   - Where a transaction is genuinely variable (inherited vehicles above
 *     all), we explain the common case and say, honestly, that the right
 *     path depends on the situation and to call or come in. Honest and
 *     helpful beats confident and wrong.
 *   - No wait-time numbers. No prices (the fees page is the one place for
 *     that, and the statutory $23 always carries its OMV disclosure there).
 */

import { getTransactionPath, type TransactionPath } from "@/lib/checklists";

/** A single question / answer pair, surfaced on the page and in FAQPage schema. */
export interface ServiceFaq {
  question: string;
  answer: string;
}

/** One step in the plain-English "how it works" walkthrough. */
export interface ServiceStep {
  title: string;
  body: string;
}

export interface ServiceGuide {
  /** Must match a TransactionPath slug in lib/checklists.ts. */
  slug: string;
  /**
   * SEO <title> segment targeting real search intent. The "| 88 Title" suffix
   * is appended by pageMetadata, so it is intentionally omitted here.
   */
  metaTitle: string;
  /** SEO meta description. */
  metaDescription: string;
  /** Short category tag shown above the H1. */
  eyebrow: string;
  /** The H1 — search-intent phrasing, fuller than the short checklist label. */
  heading: string;
  /** Situational intro paragraph(s), brand voice. */
  intro: string[];
  /** The "how it works" walkthrough, in order. */
  steps: ServiceStep[];
  /** 3 to 6 real questions per transaction. */
  faqs: ServiceFaq[];
  /** Slugs of related transactions to internally link. */
  related: string[];
}

const guides: ServiceGuide[] = [
  {
    slug: "title-transfer",
    metaTitle: "How to Transfer a Car Title in Louisiana",
    metaDescription:
      "Bought a car from a private seller in Louisiana? Here is how to transfer the title into your name in one trip, what to bring, and answers to the questions people ask most. 88 Title in Metairie.",
    eyebrow: "Title transfer",
    heading: "How to transfer a car title in Louisiana",
    intro: [
      "You just bought a car from a private seller. Now the title needs to move into your name, and the plates and registration have to follow. You would rather not make two trips to sort it out.",
      "Here is how a title transfer actually works, and exactly what to bring so we can finish it at the counter.",
    ],
    steps: [
      {
        title: "The seller signs the title over to you",
        body: "On the back of the title there is an assignment section. The seller fills in your name as the buyer, the sale price, the date, and the odometer reading, and signs it. That signature is what legally hands the vehicle to you.",
      },
      {
        title: "Put the sale in writing",
        body: "A bill of sale records the price, the date, and both parties in one place. It backs up the numbers on the title and protects both of you. If you do not have one, we can write it up and notarize it while you are here.",
      },
      {
        title: "Bring proof you can register it",
        body: "Louisiana wants to see your photo ID and proof of Louisiana insurance in your name before the vehicle goes back on the road under your name.",
      },
      {
        title: "We process the transfer and handle the plates",
        body: "We prepare the title application, submit it, and take care of the registration and tag, so you leave with everything moving in the right direction.",
      },
    ],
    faqs: [
      {
        question: "Do I need the seller to come with me?",
        answer:
          "No. As long as the seller has properly signed the title over to you and you have a bill of sale, you can complete the transfer without them. The seller's signature on the title is what matters, not their presence.",
      },
      {
        question: "What if the seller lost the title?",
        answer:
          "The seller has to replace it before they can sign it over, because you cannot transfer a title that does not exist. They can request a duplicate from the OMV, and we can help them with that. Once they have the replacement, they sign it over to you and you are back on track.",
      },
      {
        question: "Do I still need a bill of sale if the price is on the title?",
        answer:
          "It is still worth having. A bill of sale spells out the price, date, and both parties in one document and protects everyone if a question comes up later. We can notarize one for you on the spot.",
      },
      {
        question: "How long do I have to transfer the title after buying?",
        answer:
          "Louisiana expects you to transfer it soon after the sale, and waiting can add penalties, so it is best not to sit on it. Bring your paperwork in and we will handle it right away. If you are worried about timing, call us and we will tell you where you stand.",
      },
      {
        question: "Is an odometer reading required?",
        answer:
          "For most vehicles under 20 years old, yes. The reading is recorded at the time of sale. We will make sure it is captured correctly.",
      },
    ],
    related: ["duplicate-title", "plates", "new-to-louisiana"],
  },
  {
    slug: "new-to-louisiana",
    metaTitle: "How to Register an Out-of-State Vehicle in Louisiana",
    metaDescription:
      "New to Louisiana with a car from another state? Here is how to title and register it here, what to bring, and whether you need a VIN inspection. 88 Title in Metairie.",
    eyebrow: "New to Louisiana",
    heading: "How to register an out-of-state vehicle in Louisiana",
    intro: [
      "You moved to Louisiana, or you bought a vehicle in another state, and now it needs Louisiana plates and a Louisiana title.",
      "Here is how to bring it over, and what to have with you so it is a single trip.",
    ],
    steps: [
      {
        title: "Bring your current out-of-state title",
        body: "This is the document Louisiana converts into a Louisiana title. If there is still a loan on the vehicle, bring your lienholder's name and account number so the lien carries over correctly.",
      },
      {
        title: "Bring your current registration",
        body: "Your out-of-state registration shows the vehicle's current status and helps everything line up cleanly.",
      },
      {
        title: "Show your ID and Louisiana insurance",
        body: "A photo ID and proof of Louisiana insurance in your name are what let the vehicle go on the road here under your name.",
      },
      {
        title: "Plan for a possible VIN check",
        body: "Some out-of-state transfers need a quick physical VIN and odometer verification. If yours does, having the vehicle with you means we can do it in the same visit instead of asking you to come back.",
      },
    ],
    faqs: [
      {
        question: "Do I need to bring the actual vehicle?",
        answer:
          "Sometimes. Certain out-of-state transfers require a physical VIN and odometer inspection. Bringing the vehicle means we can verify it on the spot if it is needed and avoid a second trip. If you are not sure, call ahead and we will tell you whether yours needs it.",
      },
      {
        question: "What if I still owe money on the car?",
        answer:
          "That is fine, it is common. Bring your lienholder's name and account number so the lien transfers onto your new Louisiana title. The lender keeps its interest recorded and you keep driving.",
      },
      {
        question: "Do I need a Louisiana driver's license first?",
        answer:
          "Bring whatever photo ID you have. If you have already switched to a Louisiana license, bring that. If you are still mid-move, call us and we will tell you what will work for your situation.",
      },
      {
        question: "Can I keep my old out-of-state plates?",
        answer:
          "No, the vehicle gets Louisiana plates as part of registering it here. We handle ordering the new tag as part of the visit.",
      },
      {
        question: "What if I cannot find my out-of-state title?",
        answer:
          "You will need to replace it through the state that issued it before Louisiana can convert it. Call us and we will point you in the right direction so you do not waste a trip.",
      },
    ],
    related: ["title-transfer", "plates", "registration-renewal"],
  },
  {
    slug: "duplicate-title",
    metaTitle: "How to Replace a Lost or Stolen Title in Louisiana",
    metaDescription:
      "Lost your Louisiana car title, or had it stolen or damaged? Here is how to get a duplicate title, what to bring, and how we notarize the affidavit on the spot. 88 Title in Metairie.",
    eyebrow: "Duplicate title",
    heading: "How to replace a lost or stolen title in Louisiana",
    intro: [
      "Your title is lost, it got damaged, or you never received it, and now you need it to sell, to transfer, or just to have on hand.",
      "A duplicate title is the official replacement for the original. Here is how to get one without the runaround.",
    ],
    steps: [
      {
        title: "Confirm you are the owner",
        body: "Bring your photo ID and your vehicle details: the VIN, the plate number, or the previous title number. Any of those help us find the record and confirm the title is yours to replace.",
      },
      {
        title: "State why you need a replacement",
        body: "Lost, stolen, or damaged, we record the reason. If a lost or stolen affidavit is needed, we can notarize it for you right here.",
      },
      {
        title: "Clear any old lien first",
        body: "If there used to be a loan on the vehicle and it is paid off, bring the lien release. That lets the duplicate come out clean, without the old lender still listed.",
      },
      {
        title: "We submit the duplicate request",
        body: "We prepare and process the application so the replacement title gets issued to you.",
      },
    ],
    faqs: [
      {
        question: "What if I am not sure of my title number?",
        answer:
          "That is okay. The VIN or the license plate number is usually enough for us to find your record. Bring whatever you have and we will work from there.",
      },
      {
        question: "Can you notarize the lost-title affidavit here?",
        answer:
          "Yes. We can notarize a lost or stolen affidavit on the spot, so you do not have to track down a notary somewhere else first.",
      },
      {
        question: "There is an old loan listed on my title. Does that matter?",
        answer:
          "It can. If the loan is paid off, bring the lien release so the new title issues without the old lender still attached. If you do not have the release, call us and we will talk through how to get it.",
      },
      {
        question: "Can I sell the car while the title is missing?",
        answer:
          "You will want the duplicate first, because the buyer needs a valid title signed over to them. Get the replacement, then you are free to sell. We can often handle the duplicate and the sale paperwork together.",
      },
      {
        question: "I only need a copy for my records. Is that the same thing?",
        answer:
          "A duplicate title is the official replacement, not a photocopy. If you only need to confirm details, call us and we will tell you the simplest way to get what you need.",
      },
    ],
    related: ["title-transfer", "inherited-vehicle", "plates"],
  },
  {
    slug: "inherited-vehicle",
    metaTitle: "How to Transfer an Inherited Vehicle in Louisiana",
    metaDescription:
      "Inherited a vehicle in Louisiana after a death in the family? Here is the common shape of the title transfer, the paperwork involved, and why successions vary. 88 Title in Metairie will walk you through it.",
    eyebrow: "Inherited vehicle",
    heading: "How to transfer an inherited vehicle in Louisiana",
    intro: [
      "Someone close to you has passed away and there is a vehicle to deal with. This is one of the more variable transactions, because how the title moves depends on the estate, so the honest answer is that the right path is different from family to family.",
      "Here is the common shape of it, and how we help you find your specific path without guessing.",
    ],
    steps: [
      {
        title: "Gather the title and the death certificate",
        body: "Bring the vehicle title and a certified death certificate. These are the starting point for almost every inherited-vehicle transfer.",
      },
      {
        title: "Sort out the succession paperwork",
        body: "This is the part that varies. For some estates an affidavit of heirship is enough. Others go through the courts, and the title moves on a judgment of possession. Which one applies depends on the estate, and that is exactly the kind of thing we will help you figure out rather than have you guess.",
      },
      {
        title: "Bring the heir's ID and insurance",
        body: "The person taking ownership brings their photo ID and proof of Louisiana insurance, the same as any transfer into a new owner's name.",
      },
      {
        title: "We help match the documents to your situation",
        body: "Inherited transfers rarely look identical. Bring what you have, or call first, and we will tell you what your situation needs before you make the trip.",
      },
    ],
    faqs: [
      {
        question: "Do I need to go through a full succession?",
        answer:
          "Not always. Smaller or simpler estates may qualify to transfer with an affidavit of heirship, while others need a court judgment of possession. It genuinely depends on the estate, so the best move is to call or come in and let us look at your specifics before you assume the harder path.",
      },
      {
        question:
          "What is the difference between an affidavit of heirship and a judgment of possession?",
        answer:
          "An affidavit of heirship is a sworn statement used for qualifying estates, with no court process. A judgment of possession comes out of a succession handled through the courts. Which one your situation calls for depends on the estate, and we will help you tell which is which.",
      },
      {
        question: "There are several heirs. Does everyone have to agree?",
        answer:
          "Generally the heirs need to be on the same page about who is taking the vehicle, and the paperwork has to reflect that. The details depend on the estate, so bring what you have and we will walk through who needs to sign what.",
      },
      {
        question: "What if I cannot find the title?",
        answer:
          "That happens. We can often work from the vehicle details to sort out a replacement as part of the transfer. Call us and we will tell you what to bring.",
      },
      {
        question: "This feels complicated. Can you just tell me what I need?",
        answer:
          "Yes, that is what we are here for. Inherited transfers are the one area where a quick call up front saves the most time. Tell us about the estate and we will give you a straight answer on your next step.",
      },
    ],
    related: ["title-transfer", "duplicate-title", "notary"],
  },
  {
    slug: "registration-renewal",
    metaTitle: "How to Renew Your Vehicle Registration in Louisiana",
    metaDescription:
      "Time to renew your Louisiana vehicle registration? Here is what to bring and how to renew in person in Metairie without the OMV line. 88 Title.",
    eyebrow: "Registration renewal",
    heading: "How to renew your vehicle registration in Louisiana",
    intro: [
      "Your registration is up, or close to it, and you would like to renew without standing in a line at the OMV.",
      "Here is what to bring so we can renew it at the counter and get you back out the door.",
    ],
    steps: [
      {
        title: "Bring your renewal notice",
        body: "Your renewal notice or your current registration tells us exactly which vehicle and plate we are renewing. Either one works.",
      },
      {
        title: "Bring your ID and insurance",
        body: "A photo ID and proof of current insurance are what Louisiana needs to put the vehicle back on the road for another term.",
      },
      {
        title: "Have your plate number handy",
        body: "Your license plate number ties everything to the right record. It is on your current registration if you are not sure.",
      },
      {
        title: "We process the renewal",
        body: "We submit the renewal and get your registration current, so you are covered.",
      },
    ],
    faqs: [
      {
        question: "I lost my renewal notice. Can I still renew?",
        answer:
          "Yes. Your current registration works just as well, and even without it we can usually find your record from your plate number and ID. Bring what you have.",
      },
      {
        question: "Does my car need an inspection first?",
        answer:
          "Inspection rules depend on the vehicle and where you live. If a current inspection or brake tag is part of your renewal, we will tell you. If you are unsure, call ahead so you only make one trip.",
      },
      {
        question: "My registration is already expired. Is it too late?",
        answer:
          "No, you can still renew an expired registration, though letting it lapse can add a late penalty. Come in and we will get you current.",
      },
      {
        question: "Can I renew for someone else's vehicle?",
        answer:
          "Often yes, if you have their registration details and the required documents. Call us with the specifics and we will tell you what to bring.",
      },
    ],
    related: ["plates", "title-transfer", "new-to-louisiana"],
  },
  {
    slug: "plates",
    metaTitle: "License Plate Transfers and Replacements in Louisiana",
    metaDescription:
      "Need to move a plate to another vehicle, replace a lost or damaged plate, or order a specialty plate in Louisiana? Here is what each one takes. 88 Title in Metairie.",
    eyebrow: "Plates",
    heading: "License plates: transfer, replace, or order specialty",
    intro: [
      "Plates cover a few different needs: moving a plate you already have onto a different vehicle, replacing one that is lost or damaged, or ordering a specialty plate.",
      "Here is what each one takes so you bring the right things the first time.",
    ],
    steps: [
      {
        title: "Bring your ID and registration",
        body: "Your photo ID and your current registration connect you to the vehicle and the plate on record. These come along no matter which plate task you are here for.",
      },
      {
        title: "Bring the plate itself, if you have it",
        body: "For a transfer or a replacement, bring your existing plate. For a transfer it moves to the new vehicle; for a replacement we handle turning in the old one.",
      },
      {
        title: "Bring proof of insurance",
        body: "Proof of insurance keeps the vehicle the plate lives on properly covered.",
      },
      {
        title: "Tell us what you are after",
        body: "Transfer, replacement, or specialty plate, each one runs a little differently. Let us know and we will take it from there.",
      },
    ],
    faqs: [
      {
        question: "Can I move my plate to a different car I bought?",
        answer:
          "Usually yes. Louisiana lets you transfer a plate you own onto another vehicle in your name. Bring your existing plate, your registration, and your ID, and we will move it over and update the record.",
      },
      {
        question: "My plate was lost or stolen. What do I do?",
        answer:
          "We can handle a replacement. Bring your ID, your registration, and proof of insurance. If the old plate is truly gone, just let us know, and if you still have a damaged one, bring it in.",
      },
      {
        question: "How do I order a specialty plate?",
        answer:
          "Come in with your ID and registration and tell us which specialty plate you want, and we will get the order started. Specialty plates can carry their own state fees, which we will go over with you.",
      },
      {
        question: "Do I need a new plate when I buy a used car?",
        answer:
          "It depends on whether you are transferring a plate you already own or need a new one issued. If you bought from a private seller, this usually rides along with the title transfer. Tell us your situation and we will sort it out together.",
      },
    ],
    related: ["title-transfer", "registration-renewal", "new-to-louisiana"],
  },
  {
    slug: "notary",
    metaTitle: "Notary Services in Metairie, Louisiana",
    metaDescription:
      "Need a document notarized in Metairie? Bring it unsigned, bring your ID, and sign in front of our notary. Here is how it works and what to bring. 88 Title.",
    eyebrow: "Notary",
    heading: "Notary services in Metairie",
    intro: [
      "You have a document that needs a notary: an affidavit, an authorization, a transfer, or another act.",
      "Here is how a notarization works and what to have with you so it takes just a few minutes.",
    ],
    steps: [
      {
        title: "Bring the document unsigned",
        body: "Leave the signature blank. The whole point of notarizing is that you sign in front of the notary, so do not sign ahead of time.",
      },
      {
        title: "Bring valid photo ID for every signer",
        body: "Each person signing needs a valid photo ID so the notary can confirm who they are.",
      },
      {
        title: "Everyone signs in person",
        body: "All signers have to be physically present. The notary watches each signature and then completes the notarial act.",
      },
    ],
    faqs: [
      {
        question: "Should I sign the document before I come in?",
        answer:
          "No. Leave the signature blank and sign in front of the notary. A notary's job is to witness the signing, so signing early defeats the purpose.",
      },
      {
        question: "What ID do I need?",
        answer:
          "A valid government-issued photo ID for every person who will sign. If a signer does not have standard ID, call us first and we will tell you what your options are.",
      },
      {
        question: "Can someone sign for another person who cannot be there?",
        answer:
          "Only if they have proper legal authority, such as a power of attorney, and even then the rules are specific. Every person who is signing must be present in person with ID. Call us with the details and we will tell you what works.",
      },
      {
        question: "What kinds of documents can you notarize?",
        answer:
          "We handle common acts, affidavits, authorizations, and transfer documents. If you are not sure yours fits, call ahead and describe it, and we will let you know before you come in.",
      },
    ],
    related: ["title-transfer", "duplicate-title", "inherited-vehicle"],
  },
];

/** Look up a service guide by slug. */
export function getServiceGuide(slug: string): ServiceGuide | undefined {
  return guides.find((guide) => guide.slug === slug);
}

/**
 * Resolve a guide's related slugs to their TransactionPaths, dropping any that
 * do not resolve. Used to render the "related transactions" internal links.
 */
export function relatedPaths(guide: ServiceGuide): TransactionPath[] {
  return guide.related
    .map((slug) => getTransactionPath(slug))
    .filter((path): path is TransactionPath => path !== undefined);
}
