/**
 * English UI strings — the BASE locale and the single source of the dictionary
 * shape. Every other locale (lib/i18n/ui/<code>.ts) is typed as `UiDictionary`,
 * so TypeScript flags any key a translation forgets.
 *
 * Scope: strings that originate in customer-facing components/pages. Strings
 * that originate in shared data (checklists, service guides, fees, hours) stay
 * in lib/ and are localized by the resolvers in lib/i18n/content/* instead, so
 * the English copy there is never duplicated here.
 *
 * Brand voice and typography are preserved (curly apostrophes, no em dashes).
 */
export const en = {
  language: {
    /** aria-label on the language switch. */
    label: "Language",
  },

  header: {
    homeAria: "88 Title home",
    navAria: "Primary",
    checkIn: "Check in",
    nav: {
      checklist: "What to bring",
      services: "Services",
      pricing: "Fees",
    },
  },

  footer: {
    mapTitle: (name: string, address: string) =>
      `Map showing ${name} at ${address}`,
    getDirections: "Get directions",
    hoursHeading: "Hours",
    navAria: "Footer",
    nav: {
      checklist: "What to bring",
      pricing: "Fees",
      services: "Services",
      checkIn: "Check in",
    },
    dealerLogin: "Dealer login",
    disclosureLabel: "Public tag fee disclosure.",
    notOmv:
      "88 Title is a private public tag agency and is not the Louisiana Office of Motor Vehicles (OMV).",
    rights: (year: number, name: string) =>
      `© ${year} ${name}. All rights reserved.`,
  },

  home: {
    hero: {
      eyebrow: "New Orleans metro public tag agency",
      headline: "Skip the line. Keep your afternoon.",
      subhead:
        "Titles, registration, and plates, done at the counter in one visit. Check in online before you arrive.",
      cta: "Check in online",
    },
    live: {
      heading: "The line right now",
      subhead: "Check in from your phone and watch the wait in real time.",
      lobbyView: "Lobby view",
    },
    services: {
      heading: "What do you need done?",
      subhead:
        "Straight answers on how each transaction works, then build your checklist when you are ready.",
      all: "All services",
    },
  },

  queue: {
    emptyTitle: "No one’s in line right now",
    emptyBody: "Walk right in. The counter’s open.",
    nowServing: "Now serving",
    inLine: "In line",
    waitingCount: (n: number) => `${n} waiting`,
    noneWaiting: "No one waiting.",
    you: "You",
    /** Fallback when a row's service type isn't recognized. */
    visitFallback: "Visit",
  },

  /**
   * Customer-facing check-in status text. The visual tone stays in
   * CHECKIN_STATUS_META (lib/checkin/types); only the words are localized here.
   */
  checkinStatus: {
    waiting: {
      label: "Waiting",
      description: "You're in line. We'll move you up as the counter opens.",
    },
    in_progress: {
      label: "You're up",
      description: "Head to the counter. We're ready for you now.",
    },
    no_show: {
      label: "Missed call",
      description:
        "We called your ticket and missed you. Come to the counter and our staff will help you.",
    },
    complete: {
      label: "Complete",
      description: "All done. Thanks for visiting 88 Title.",
    },
    cancelled: {
      label: "Cancelled",
      description: "This check-in was cancelled.",
    },
  },

  servicesIndex: {
    eyebrow: "Services",
    heading: "What we handle",
    introBefore:
      "Choose a transaction to learn how it works, what to bring, and the questions people ask most. When you are ready, ",
    introLink: "build your checklist",
    introAfter: " and check in online.",
  },

  serviceDetail: {
    backToAll: "← All services",
    howItWorks: "How it works",
    whatToBring: "What to bring",
    whatToBringIntro:
      "The short version. Use the checklist tool to tick these off as you gather them.",
    buildChecklist: "Build your checklist for this",
    guidanceDisclaimer:
      "General guidance to help you avoid a second trip, not legal advice. Requirements can vary by situation, and we confirm the specifics for your case in office.",
    commonQuestions: "Common questions",
    feesBefore: "Curious what this costs? ",
    feesLink: "Add up 88 Title’s service fees",
    feesAfter: ". The $23 public tag fee is always shown as its own line.",
    related: "Related",
    checkIn: "Check in online",
  },

  pricing: {
    eyebrow: "Service fees",
    heading: "Add up your service fees",
    intro:
      "Pick the services you need and watch the subtotal of 88 Title’s service fees update as you go. The $23 public tag fee is set by the state and always shown on its own line, never merged in or marked up. State fees and taxes vary by vehicle and parish, so those are handled at the counter, not estimated here.",
    tagFeeAria: "Public tag fee",
    tagFeeLine: "Public tag fee, shown as its own line, every time.",
    tagFeeAbout: "About the $23:",
    calc: {
      addLegend: "Add the 88 Title services you need",
      pickHint: "Pick any that apply. Your subtotal updates as you go.",
      summaryLabel: "88 Title service fees",
      serviceFeesOnly: "Service fees only, not your final total",
      noneSelected:
        "No services selected yet. Choose the ones you need and they’ll add up here.",
      alwaysIncluded: "(always included)",
      notFinalTitle: "This is not your final total",
      notFinalBody:
        "This shows 88 Title’s service fees. State fees and taxes depend on your specific vehicle and parish and are calculated at the counter.",
      samplePrice: "Sample price",
      lockedBadge: "Always included · set by the state",
      checkIn: "Check in online",
    },
  },

  checklist: {
    eyebrow: "Document checklist",
    heading: "What to bring",
    intro:
      "Tell us what you’re here for and we’ll build your exact “what to bring” list. Check items off as you gather them. No account needed, and nothing is saved unless you choose to share your list when you check in.",
    finder: {
      step1Heading: "What kind of visit is this?",
      step1Hint:
        "Pick one and we’ll show you exactly what to bring. No account needed.",
      learnMore: "Learn more about this transaction →",
      change: "Change",
      yourChecklist: "Your checklist",
      ready: (done: number, total: number) => `${done} / ${total} ready`,
      readyAria: (done: number, total: number) =>
        `${done} of ${total} items ready`,
      completeTitle: "You’re ready to check in",
      completeBody: (label: string) =>
        `You’ve gathered everything for a ${label.toLowerCase()}.`,
      progressHint:
        "Check off each item as you gather it. You can check in any time, even before you’ve gathered everything.",
      shareTitle: "Bring this checklist to my check-in",
      shareBody:
        "Shares your transaction and which items you’ve marked ready with our front desk so they can prepare. Just the document types, never the documents themselves. Optional.",
      checkIn: "Check in online",
    },
  },

  visit: {
    heading: "What to expect",
    waitLabel: "The wait",
    waitValue: "Skip it",
    waitHint: "Check in online and hold your place from your phone.",
    saturdayLabel: "Saturday hours",
    saturdayValue: "9:00 AM – 1:00 PM",
    saturdayHint: "Open when most offices are closed.",
    howLabel: "How check-in works:",
    howBody:
      " pick your transaction, bring the documents on your checklist, and check in online. Your spot is ready when you walk in.",
  },

  checkin: {
    eyebrow: "Check in",
    heading: "Check in online",
    intro:
      "Grab your spot from your phone and watch the line move in real time. We’ll notify you the moment you’re up, so there’s no need to wait on your feet.",
    formHeading: "Tell us who you are",
    formHint: "Three quick fields and you’re in line.",
    lineRightNow: "The line right now",
    lobbyView: "Lobby view",
    form: {
      serviceLabel: "What are you here for?",
      servicePlaceholder: "Choose your visit…",
      sharingTitle: "Sharing your checklist with the front desk",
      sharingAllReady: (total: number) =>
        `You’ve marked all ${total} items ready.`,
      sharingSomeReady: (ready: number, total: number) =>
        `You’ve marked ${ready} of ${total} ready.`,
      sharingStillGathering: (labels: string) => ` Still gathering: ${labels}.`,
      sharingHelp:
        "Helps us prepare for your visit. Just the document types, never the documents themselves.",
      dontShare: "Don’t share",
      nameLabel: "Your name",
      namePlaceholder: "Alex Boudreaux",
      emailLabel: "Email",
      emailPlaceholder: "you@email.com",
      emailHint: "We’ll send your live status link here.",
      cellLabel: "Cell",
      optional: "(optional)",
      cellPlaceholder: "(504) 555-0123",
      renewalLabel: "Registration expiration",
      remindTitle: "Remind me before my registration expires",
      remindBody:
        "We’ll email you a friendly heads-up when it’s time to renew. Off by default; unsubscribe anytime.",
      submitting: "Checking you in…",
      submit: "Check in",
      privacy: (isRenewal: boolean) =>
        `No account needed. We use your details only for this visit${
          isRenewal ? " (and renewal reminders, if you opt in)" : ""
        }.`,
      errors: {
        pickVisit: "Pick the type of visit you're here for.",
        addName: "Add your name so we can call you up.",
        validEmail: "Enter a valid email. It's where your status link goes.",
        couldNotCheckIn: (message: string) =>
          `Could not check you in: ${message}`,
        tooManyCheckins:
          "You've checked in several times recently. Please wait a little while and try again, or call us and we'll add you to the line.",
      },
    },
  },

  status: {
    eyebrow: "Live status",
    heading: "Your check-in",
    notFoundTitle: "We couldn’t find this check-in",
    notFoundBody:
      "The link may have expired or already been completed. You can check in again in a few seconds.",
    notFoundCta: "Check in",
    loading: "Loading your status…",
    upEyebrow: "You’re up",
    upHeadToCounter: "Head to the counter",
    upShowTicket: (code: string) => `Show ticket ${code} to our staff.`,
    completeEyebrow: "All done",
    completeTitle: "Thanks for visiting 88 Title",
    completeBody: (code: string) => `Ticket ${code} is complete. Drive safe!`,
    cancelledTitle: "Check-in cancelled",
    cancelledBody: "Changed your mind? You can hop back in line anytime.",
    cancelledCta: "Check in again",
    noShowTitle: (code: string) => `We called ticket ${code}`,
    noShowBody:
      "It looks like we missed you. Come to the counter and our staff will get you taken care of.",
    ticketFor: (service: string) => `Your ticket · ${service}`,
    youreNext: "You’re next!",
    inLine: (position: number) => `#${position} in line`,
    peopleAhead: (ahead: number) =>
      `${ahead} ${ahead === 1 ? "person" : "people"} ahead of you. We’ll move you up as the counter opens.`,
    cancelling: "Cancelling…",
    cancel: "Cancel my spot",
    lineRightNow: "The line right now",
  },

  push: {
    onTitle: "🔔 Notifications are on",
    onBody:
      "We’ll ping this device the moment you’re up, so you can close the page.",
    reconfirm: "Re-confirm this device",
    reconfirming: "Confirming…",
    getNotifiedTitle: "Get notified when you’re up",
    iosBefore: "On iPhone, tap ",
    iosAction: "Share → Add to Home Screen",
    iosAfter:
      ", then open 88 Title from there to enable notifications. Until then we’ll email you and this page stays live.",
    unsupportedBody:
      "This browser can’t show notifications. No problem: we’ll email you and keep this page live.",
    blockedTitle: "Notifications are blocked",
    blockedBody:
      "That’s okay. You’ll still get an email and this page updates live. To turn them on, allow notifications for this site in your browser settings.",
    offerBody:
      "Enable notifications and we’ll alert you even if you close this page or put your phone away.",
    turnOn: "Turn on notifications",
    turningOn: "Turning on…",
    error:
      "Couldn’t turn on notifications. You’ll still get email + this live page.",
  },

  install: {
    dismiss: "Dismiss",
    iosTap: "Tap",
    iosShare: "Share",
    iosThen: ", then ",
    iosAdd: "Add to Home Screen",
    statusTitle: "Add 88 Title to your home screen",
    statusBodyIos:
      "Install 88 Title and we can notify you the moment you’re up, even if you close this page. On iPhone, installing is what turns notifications on.",
    statusBodyOther:
      "So we can notify you the moment you’re up, even if you close this page.",
    statusButton: "Add to home screen",
    opening: "Opening…",
    dealerTitle: "Install for quick access and notifications",
    dealerBodyOther: "One tap adds 88 Title to your home screen.",
    install: "Install",
    homeBodyIosPrefix: "Add 88 Title to your home screen. ",
    homeBodyOther: "Add 88 Title to your home screen for quick access and alerts.",
  },

  offlineBanner:
    "You’re offline. Live updates are paused and will resume the moment you reconnect.",

  returning: {
    inLine: "You’re in line",
    ticketSuffix: (code: string) => `, ticket ${code}`,
    viewStatus: "View your live status",
    visitFallback: "your visit",
  },

  offlinePage: {
    eyebrow: "You’re offline",
    heading: "We need a connection",
    body:
      "The live line and your check-in status update in real time, so they need the internet. Reconnect and you’ll pick up right where you left off.",
    tryAgain: "Try again",
    alreadyCheckedIn:
      "Already checked in? We’ll still notify you when you’re up.",
  },

  lobby: {
    heading: "Live queue",
    updatesAuto: "Updates automatically",
  },

  /** Page metadata (titles + descriptions). */
  meta: {
    home: {
      title: "88 Title | Public Tag Agency in Metairie, LA",
      description:
        "Skip the OMV line. 88 Title handles Louisiana title transfers, plates, registration, and notary at the counter in Metairie. Check in online and bring the right documents.",
    },
    services: {
      title: "Title & Registration Services in Metairie, LA",
      description:
        "Everything 88 Title handles in Metairie: title transfers, new-to-Louisiana registrations, duplicate titles, inherited vehicles, renewals, plates, and notary. Learn how each one works.",
    },
    pricing: {
      title: "Service Fees in Metairie, LA",
      description:
        "Add up 88 Title’s service fees in Metairie. The $23 public tag fee is statutory and always shown as its own line. Service fees only, with no tax estimates and no personalized totals.",
    },
    checklist: {
      title: "What to Bring in Metairie, LA",
      description:
        "Build your exact document checklist for a Louisiana title transfer, plates, registration, inherited vehicle, or notary, then check in at 88 Title in Metairie.",
    },
    checkin: {
      title: "Check In Online in Metairie, LA",
      description:
        "Check in online for 88 Title in Metairie. Grab your spot in the live queue from your phone and we'll notify you the moment you're up.",
    },
    status: {
      title: "Your check-in",
      description: "Your live place in the 88 Title check-in queue.",
    },
    lobby: {
      title: "Lobby · live queue",
      description: "The 88 Title lobby queue display.",
    },
    offline: {
      title: "You're offline",
      description: "88 Title needs a connection for the live queue.",
    },
    /** Fallback <title> for an unknown service slug. */
    serviceNotFound: "Service not found",
    /** Fallback title/description for a known service with no editorial guide. */
    serviceFallbackTitle: (label: string) => `${label} in Metairie, LA`,
    serviceFallbackDescription: (blurb: string, label: string) =>
      `${blurb} See exactly what to bring for a ${label.toLowerCase()} at 88 Title in Metairie, then check in online.`,
  },
};

export type UiDictionary = typeof en;
