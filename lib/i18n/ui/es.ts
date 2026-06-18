/**
 * Spanish (Latin American) UI strings. Standard, clear Latin American Spanish in
 * the "usted" register, suited to the area's Hispanic community (Honduras is the
 * top origin). No em dashes; ¿ and ¡ used naturally.
 *
 * Typed as `UiDictionary`, so any key missing from this set is a compile error.
 * Louisiana-specific terms: "parish" -> "parroquia", "OMV" kept as the office's
 * name, "tag" -> "placa".
 *
 * High-stakes strings (the $23 / OMV disclosure and money-decision fee copy)
 * live in lib/i18n/content/fees.ts and are flagged for native review before
 * launch.
 */
import type { UiDictionary } from "./en";

export const es: UiDictionary = {
  language: {
    label: "Idioma",
  },

  header: {
    homeAria: "Inicio de 88 Title",
    navAria: "Principal",
    checkIn: "Tomar turno",
    nav: {
      checklist: "Qué traer",
      services: "Servicios",
      pricing: "Tarifas",
    },
  },

  footer: {
    mapTitle: (name, address) => `Mapa que muestra ${name} en ${address}`,
    getDirections: "Cómo llegar",
    hoursHeading: "Horario",
    navAria: "Pie de página",
    nav: {
      checklist: "Qué traer",
      pricing: "Tarifas",
      services: "Servicios",
      checkIn: "Tomar turno",
    },
    dealerLogin: "Acceso para concesionarios",
    disclosureLabel: "Aviso sobre el cargo de placa pública.",
    notOmv:
      "88 Title es una agencia privada de placas públicas y no es la Oficina de Vehículos Motorizados (OMV) de Luisiana.",
    rights: (year, name) => `© ${year} ${name}. Todos los derechos reservados.`,
  },

  home: {
    hero: {
      eyebrow:
        "Agencia de placas públicas del área metropolitana de Nueva Orleans",
      headline: "Evite la fila. Aproveche su tarde.",
      subhead:
        "Títulos, registro y placas, resueltos en el mostrador en una sola visita. Tome su turno en línea antes de llegar.",
      cta: "Tomar turno en línea",
    },
    live: {
      heading: "La fila en este momento",
      subhead:
        "Tome su turno desde el teléfono y vea la espera en tiempo real.",
      lobbyView: "Vista de sala de espera",
    },
    services: {
      heading: "¿Qué necesita hacer?",
      subhead:
        "Respuestas claras sobre cómo funciona cada trámite, y luego arme su lista cuando esté listo.",
      all: "Todos los servicios",
    },
  },

  queue: {
    emptyTitle: "No hay nadie en la fila ahora mismo",
    emptyBody: "Pase sin esperar. El mostrador está abierto.",
    nowServing: "Atendiendo ahora",
    inLine: "En fila",
    waitingCount: (n) => `${n} en espera`,
    noneWaiting: "Nadie en espera.",
    you: "Usted",
    visitFallback: "Visita",
  },

  checkinStatus: {
    waiting: {
      label: "En espera",
      description:
        "Está en la fila. Lo iremos adelantando a medida que el mostrador se desocupe.",
    },
    in_progress: {
      label: "Es su turno",
      description: "Diríjase al mostrador. Ya estamos listos para atenderlo.",
    },
    no_show: {
      label: "Llamada perdida",
      description:
        "Llamamos su turno y no lo encontramos. Acérquese al mostrador y nuestro personal lo atenderá.",
    },
    complete: {
      label: "Completado",
      description: "Listo. Gracias por visitar 88 Title.",
    },
    cancelled: {
      label: "Cancelado",
      description: "Este turno fue cancelado.",
    },
  },

  servicesIndex: {
    eyebrow: "Servicios",
    heading: "Lo que atendemos",
    introBefore:
      "Elija un trámite para conocer cómo funciona, qué traer y las preguntas más comunes. Cuando esté listo, ",
    introLink: "arme su lista",
    introAfter: " y tome su turno en línea.",
  },

  serviceDetail: {
    backToAll: "← Todos los servicios",
    howItWorks: "Cómo funciona",
    whatToBring: "Qué traer",
    whatToBringIntro:
      "La versión corta. Use la herramienta de lista para ir marcando estos documentos a medida que los reúne.",
    buildChecklist: "Arme su lista para esto",
    guidanceDisclaimer:
      "Orientación general para ayudarle a evitar un segundo viaje, no es asesoría legal. Los requisitos pueden variar según el caso, y confirmamos los detalles de su situación en la oficina.",
    commonQuestions: "Preguntas frecuentes",
    feesBefore: "¿Tiene curiosidad por el costo? ",
    feesLink: "Sume los cargos por servicio de 88 Title",
    feesAfter:
      ". El cargo de placa pública de $23 siempre se muestra en su propia línea.",
    related: "Relacionados",
    checkIn: "Tomar turno en línea",
  },

  pricing: {
    eyebrow: "Cargos por servicio",
    heading: "Sume sus cargos por servicio",
    intro:
      "Elija los servicios que necesita y vea cómo se actualiza el subtotal de los cargos por servicio de 88 Title a medida que avanza. El cargo de placa pública de $23 lo fija el estado y siempre se muestra en su propia línea, sin combinarlo ni recargarlo. Los cargos e impuestos del estado varían según el vehículo y la parroquia, así que esos se calculan en el mostrador, no se estiman aquí.",
    tagFeeAria: "Cargo de placa pública",
    tagFeeLine: "El cargo de placa pública, en su propia línea, siempre.",
    tagFeeAbout: "Sobre los $23:",
    calc: {
      addLegend: "Agregue los servicios de 88 Title que necesita",
      pickHint:
        "Elija los que apliquen. Su subtotal se actualiza a medida que avanza.",
      summaryLabel: "Cargos por servicio de 88 Title",
      serviceFeesOnly: "Solo cargos por servicio, no es su total final",
      noneSelected:
        "Aún no ha seleccionado servicios. Elija los que necesita y se irán sumando aquí.",
      alwaysIncluded: "(siempre incluido)",
      notFinalTitle: "Este no es su total final",
      notFinalBody:
        "Esto muestra los cargos por servicio de 88 Title. Los cargos e impuestos del estado dependen de su vehículo y parroquia específicos y se calculan en el mostrador.",
      samplePrice: "Precio de muestra",
      lockedBadge: "Siempre incluido · fijado por el estado",
      checkIn: "Tomar turno en línea",
    },
  },

  checklist: {
    eyebrow: "Lista de documentos",
    heading: "Qué traer",
    intro:
      "Díganos a qué viene y armaremos su lista exacta de “qué traer”. Marque los documentos a medida que los reúne. No necesita cuenta, y no se guarda nada a menos que decida compartir su lista al tomar turno.",
    finder: {
      step1Heading: "¿Qué tipo de visita es esta?",
      step1Hint:
        "Elija una y le mostraremos exactamente qué traer. No necesita cuenta.",
      learnMore: "Conozca más sobre este trámite →",
      change: "Cambiar",
      yourChecklist: "Su lista",
      ready: (done, total) => `${done} / ${total} listos`,
      readyAria: (done, total) => `${done} de ${total} documentos listos`,
      completeTitle: "Está listo para tomar turno",
      completeBody: (label) => `Ya tiene todo lo necesario para: ${label}.`,
      progressHint:
        "Marque cada documento a medida que lo reúne. Puede tomar turno en cualquier momento, incluso antes de tener todo listo.",
      shareTitle: "Llevar esta lista a mi turno",
      shareBody:
        "Comparte su trámite y los documentos que marcó como listos con nuestra recepción para que puedan prepararse. Solo los tipos de documento, nunca los documentos en sí. Opcional.",
      checkIn: "Tomar turno en línea",
    },
  },

  visit: {
    heading: "Qué esperar",
    waitLabel: "La espera",
    waitValue: "Evítela",
    waitHint: "Tome su turno en línea y guarde su lugar desde el teléfono.",
    saturdayLabel: "Horario del sábado",
    saturdayValue: "9:00 a.m. a 1:00 p.m.",
    saturdayHint: "Abierto cuando la mayoría de las oficinas están cerradas.",
    howLabel: "Cómo funciona tomar turno:",
    howBody:
      " elija su trámite, traiga los documentos de su lista y tome su turno en línea. Su lugar está listo cuando entra.",
  },

  checkin: {
    eyebrow: "Tomar turno",
    heading: "Tome su turno en línea",
    intro:
      "Aparte su lugar desde el teléfono y vea avanzar la fila en tiempo real. Le avisaremos en el momento en que sea su turno, así no tiene que esperar de pie.",
    formHeading: "Díganos quién es",
    formHint: "Tres datos rápidos y queda en fila.",
    lineRightNow: "La fila en este momento",
    lobbyView: "Vista de sala de espera",
    form: {
      serviceLabel: "¿A qué viene?",
      servicePlaceholder: "Elija su visita…",
      sharingTitle: "Compartiendo su lista con la recepción",
      sharingAllReady: (total) => `Marcó los ${total} documentos como listos.`,
      sharingSomeReady: (ready, total) =>
        `Marcó ${ready} de ${total} como listos.`,
      sharingStillGathering: (labels) => ` Aún reuniendo: ${labels}.`,
      sharingHelp:
        "Nos ayuda a prepararnos para su visita. Solo los tipos de documento, nunca los documentos en sí.",
      dontShare: "No compartir",
      nameLabel: "Su nombre",
      namePlaceholder: "José Martínez",
      emailLabel: "Correo electrónico",
      emailPlaceholder: "usted@correo.com",
      emailHint: "Aquí le enviaremos el enlace para ver su estado en vivo.",
      cellLabel: "Celular",
      optional: "(opcional)",
      cellPlaceholder: "(504) 555-0123",
      renewalLabel: "Vencimiento del registro",
      remindTitle: "Recuérdenme antes de que venza mi registro",
      remindBody:
        "Le enviaremos un aviso amable por correo cuando se acerque la fecha de renovar. Desactivado por defecto; puede cancelar la suscripción cuando quiera.",
      submitting: "Tomando su turno…",
      submit: "Tomar turno",
      privacy: (isRenewal) =>
        `No necesita cuenta. Usamos sus datos solo para esta visita${
          isRenewal ? " (y para recordatorios de renovación, si lo autoriza)" : ""
        }.`,
      errors: {
        pickVisit: "Elija el tipo de visita a la que viene.",
        addName: "Agregue su nombre para que podamos llamarlo.",
        validEmail:
          "Ingrese un correo válido. Ahí le enviamos el enlace de su estado.",
        couldNotCheckIn: (message) => `No pudimos tomar su turno: ${message}`,
      },
    },
  },

  status: {
    eyebrow: "Estado en vivo",
    heading: "Su turno",
    notFoundTitle: "No pudimos encontrar este turno",
    notFoundBody:
      "Es posible que el enlace haya vencido o que el turno ya se haya completado. Puede tomar turno de nuevo en unos segundos.",
    notFoundCta: "Tomar turno",
    loading: "Cargando su estado…",
    upEyebrow: "Es su turno",
    upHeadToCounter: "Diríjase al mostrador",
    upShowTicket: (code) => `Muestre el turno ${code} a nuestro personal.`,
    completeEyebrow: "Listo",
    completeTitle: "Gracias por visitar 88 Title",
    completeBody: (code) => `El turno ${code} está completo. ¡Maneje con cuidado!`,
    cancelledTitle: "Turno cancelado",
    cancelledBody: "¿Cambió de opinión? Puede volver a la fila cuando quiera.",
    cancelledCta: "Tomar turno de nuevo",
    noShowTitle: (code) => `Llamamos al turno ${code}`,
    noShowBody:
      "Parece que no lo encontramos. Acérquese al mostrador y nuestro personal lo atenderá.",
    ticketFor: (service) => `Su turno · ${service}`,
    youreNext: "¡Usted sigue!",
    inLine: (position) => `#${position} en fila`,
    peopleAhead: (ahead) =>
      `${ahead} ${ahead === 1 ? "persona" : "personas"} por delante de usted. Lo iremos adelantando a medida que el mostrador se desocupe.`,
    cancelling: "Cancelando…",
    cancel: "Cancelar mi lugar",
    lineRightNow: "La fila en este momento",
  },

  push: {
    onTitle: "🔔 Las notificaciones están activadas",
    onBody:
      "Avisaremos a este dispositivo en el momento en que sea su turno, para que pueda cerrar la página.",
    reconfirm: "Volver a confirmar este dispositivo",
    reconfirming: "Confirmando…",
    getNotifiedTitle: "Reciba un aviso cuando sea su turno",
    iosBefore: "En iPhone, toque ",
    iosAction: "Compartir → Agregar a pantalla de inicio",
    iosAfter:
      ", y luego abra 88 Title desde ahí para activar las notificaciones. Mientras tanto le enviaremos correos y esta página se mantiene activa.",
    unsupportedBody:
      "Este navegador no puede mostrar notificaciones. No hay problema: le enviaremos correos y mantendremos esta página activa.",
    blockedTitle: "Las notificaciones están bloqueadas",
    blockedBody:
      "Está bien. Igual recibirá un correo y esta página se actualiza en vivo. Para activarlas, permita las notificaciones de este sitio en la configuración de su navegador.",
    offerBody:
      "Active las notificaciones y le avisaremos aunque cierre esta página o guarde el teléfono.",
    turnOn: "Activar notificaciones",
    turningOn: "Activando…",
    error:
      "No se pudieron activar las notificaciones. Igual recibirá correos + esta página en vivo.",
  },

  install: {
    dismiss: "Cerrar",
    iosTap: "Toque",
    iosShare: "Compartir",
    iosThen: ", y luego ",
    iosAdd: "Agregar a pantalla de inicio",
    statusTitle: "Agregue 88 Title a su pantalla de inicio",
    statusBodyIos:
      "Instale 88 Title y podremos avisarle en el momento en que sea su turno, aunque cierre esta página. En iPhone, instalar es lo que activa las notificaciones.",
    statusBodyOther:
      "Para poder avisarle en el momento en que sea su turno, aunque cierre esta página.",
    statusButton: "Agregar a pantalla de inicio",
    opening: "Abriendo…",
    dealerTitle: "Instálela para acceso rápido y notificaciones",
    dealerBodyOther: "Un toque agrega 88 Title a su pantalla de inicio.",
    install: "Instalar",
    homeBodyIosPrefix: "Agregue 88 Title a su pantalla de inicio. ",
    homeBodyOther:
      "Agregue 88 Title a su pantalla de inicio para acceso rápido y avisos.",
  },

  offlineBanner:
    "Está sin conexión. Las actualizaciones en vivo están en pausa y se reanudarán en cuanto se reconecte.",

  returning: {
    inLine: "Está en la fila",
    ticketSuffix: (code) => `, turno ${code}`,
    viewStatus: "Ver su estado en vivo",
    visitFallback: "su visita",
  },

  offlinePage: {
    eyebrow: "Está sin conexión",
    heading: "Necesitamos conexión",
    body:
      "La fila en vivo y el estado de su turno se actualizan en tiempo real, así que necesitan internet. Reconéctese y retomará justo donde quedó.",
    tryAgain: "Reintentar",
    alreadyCheckedIn: "¿Ya tomó turno? Igual le avisaremos cuando sea su turno.",
  },

  lobby: {
    heading: "Fila en vivo",
    updatesAuto: "Se actualiza automáticamente",
  },

  meta: {
    home: {
      title: "88 Title | Agencia de placas públicas en Metairie, LA",
      description:
        "Evite la fila de la OMV. 88 Title realiza transferencias de título, placas, registro y notaría en el mostrador en Metairie, Luisiana. Tome turno en línea y traiga los documentos correctos.",
    },
    services: {
      title: "Servicios de título y registro en Metairie, LA",
      description:
        "Todo lo que 88 Title atiende en Metairie: transferencias de título, registros para recién llegados a Luisiana, títulos duplicados, vehículos heredados, renovaciones, placas y notaría. Conozca cómo funciona cada uno.",
    },
    pricing: {
      title: "Cargos por servicio en Metairie, LA",
      description:
        "Sume los cargos por servicio de 88 Title en Metairie. El cargo de placa pública de $23 es de ley y siempre se muestra en su propia línea. Solo cargos por servicio, sin estimados de impuestos ni totales personalizados.",
    },
    checklist: {
      title: "Qué traer en Metairie, LA",
      description:
        "Arme su lista exacta de documentos para una transferencia de título, placas, registro, vehículo heredado o notaría en Luisiana, y luego tome turno en 88 Title en Metairie.",
    },
    checkin: {
      title: "Tome turno en línea en Metairie, LA",
      description:
        "Tome turno en línea para 88 Title en Metairie. Aparte su lugar en la fila en vivo desde el teléfono y le avisaremos en el momento en que sea su turno.",
    },
    status: {
      title: "Su turno",
      description: "Su lugar en vivo en la fila de 88 Title.",
    },
    lobby: {
      title: "Sala de espera · fila en vivo",
      description: "Pantalla de la fila de la sala de espera de 88 Title.",
    },
    offline: {
      title: "Está sin conexión",
      description: "88 Title necesita conexión para la fila en vivo.",
    },
    serviceNotFound: "Servicio no encontrado",
    serviceFallbackTitle: (label) => `${label} en Metairie, LA`,
    serviceFallbackDescription: (blurb, label) =>
      `${blurb} Vea exactamente qué traer para ${label} en 88 Title en Metairie, y luego tome turno en línea.`,
  },
};
