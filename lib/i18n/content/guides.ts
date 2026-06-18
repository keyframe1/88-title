/**
 * Localized service guides (the /services/[slug] editorial + SEO content).
 *
 * English stays the single source in lib/serviceGuides.ts. Spanish is overlaid
 * here by slug, with intro/steps/faqs matched by position to the English source
 * and any gap falling back to English. This module is consumed only by the
 * server-rendered service page, so the (large) Spanish prose never ships in a
 * client bundle.
 *
 * ACCURACY: this is Louisiana title/registration guidance. Translations stay
 * faithful to the English source and invent no statutes, fees, or deadlines.
 * Louisiana succession terms ("affidavit of heirship", "judgment of possession")
 * are rendered plainly; have a native speaker confirm them before launch.
 */
import { getServiceGuide, type ServiceGuide } from "@/lib/serviceGuides";
import {
  getLocalizedPath,
  type LocalizedTransactionPath,
} from "./checklists";
import type { Locale } from "../config";

export interface LocalizedServiceGuide {
  slug: string;
  metaTitle: string;
  metaDescription: string;
  eyebrow: string;
  heading: string;
  intro: string[];
  steps: { title: string; body: string }[];
  faqs: { question: string; answer: string }[];
  related: string[];
}

interface GuideOverride {
  metaTitle: string;
  metaDescription: string;
  eyebrow: string;
  heading: string;
  intro: string[];
  steps: { title: string; body: string }[];
  faqs: { question: string; answer: string }[];
}

const es: Record<string, GuideOverride> = {
  "title-transfer": {
    metaTitle: "Cómo transferir el título de un carro en Luisiana",
    metaDescription:
      "¿Compró un carro a un vendedor particular en Luisiana? Aquí le explicamos cómo transferir el título a su nombre en un solo viaje, qué traer y las respuestas a las preguntas más comunes. 88 Title en Metairie.",
    eyebrow: "Transferencia de título",
    heading: "Cómo transferir el título de un carro en Luisiana",
    intro: [
      "Acaba de comprar un carro a un vendedor particular. Ahora el título debe pasar a su nombre, y las placas y el registro tienen que seguir. Preferiría no hacer dos viajes para resolverlo.",
      "Así funciona en realidad una transferencia de título, y exactamente qué traer para que podamos terminarla en el mostrador.",
    ],
    steps: [
      {
        title: "El vendedor le cede el título",
        body: "Al reverso del título hay una sección de cesión. El vendedor escribe su nombre como comprador, el precio de venta, la fecha y la lectura del odómetro, y la firma. Esa firma es lo que le entrega legalmente el vehículo.",
      },
      {
        title: "Ponga la venta por escrito",
        body: "Una factura de venta deja constancia del precio, la fecha y ambas partes en un solo lugar. Respalda las cifras del título y los protege a los dos. Si no tiene una, podemos redactarla y notarizarla mientras está aquí.",
      },
      {
        title: "Traiga prueba de que puede registrarlo",
        body: "Luisiana necesita ver su identificación con foto y un comprobante de seguro de Luisiana a su nombre antes de que el vehículo vuelva a circular a su nombre.",
      },
      {
        title: "Tramitamos la transferencia y gestionamos las placas",
        body: "Preparamos la solicitud del título, la presentamos y nos encargamos del registro y la placa, para que salga con todo encaminado.",
      },
    ],
    faqs: [
      {
        question: "¿Necesito que el vendedor venga conmigo?",
        answer:
          "No. Siempre que el vendedor le haya cedido el título correctamente y usted tenga una factura de venta, puede completar la transferencia sin él. Lo que importa es la firma del vendedor en el título, no su presencia.",
      },
      {
        question: "¿Qué pasa si el vendedor perdió el título?",
        answer:
          "El vendedor tiene que reemplazarlo antes de poder cederlo, porque no se puede transferir un título que no existe. Puede solicitar un duplicado a la OMV, y nosotros podemos ayudarlo con eso. Una vez que tenga el reemplazo, se lo cede a usted y vuelve a estar encaminado.",
      },
      {
        question: "¿Necesito una factura de venta si el precio ya está en el título?",
        answer:
          "Vale la pena tenerla de todas formas. Una factura de venta detalla el precio, la fecha y ambas partes en un solo documento y protege a todos si surge alguna duda después. Podemos notarizarle una en el momento.",
      },
      {
        question: "¿Cuánto tiempo tengo para transferir el título después de comprar?",
        answer:
          "Luisiana espera que lo transfiera poco después de la venta, y esperar puede generar multas, así que es mejor no dejarlo pendiente. Traiga sus documentos y lo tramitamos de inmediato. Si le preocupa el tiempo, llámenos y le decimos cómo está su caso.",
      },
      {
        question: "¿Se requiere la lectura del odómetro?",
        answer:
          "Para la mayoría de los vehículos de menos de 20 años, sí. La lectura se registra al momento de la venta. Nos aseguramos de anotarla correctamente.",
      },
    ],
  },
  "new-to-louisiana": {
    metaTitle: "Cómo registrar en Luisiana un vehículo de otro estado",
    metaDescription:
      "¿Recién llegado a Luisiana con un carro de otro estado? Aquí le explicamos cómo obtener el título y registrarlo aquí, qué traer y si necesita una inspección del VIN. 88 Title en Metairie.",
    eyebrow: "Recién llegado a Luisiana",
    heading: "Cómo registrar en Luisiana un vehículo de otro estado",
    intro: [
      "Se mudó a Luisiana, o compró un vehículo en otro estado, y ahora necesita placas de Luisiana y un título de Luisiana.",
      "Aquí le explicamos cómo traspasarlo, y qué tener consigo para que sea un solo viaje.",
    ],
    steps: [
      {
        title: "Traiga su título vigente de otro estado",
        body: "Este es el documento que Luisiana convierte en un título de Luisiana. Si todavía hay un préstamo sobre el vehículo, traiga el nombre de su acreedor y el número de cuenta para que el gravamen se traspase correctamente.",
      },
      {
        title: "Traiga su registro vigente",
        body: "Su registro de otro estado muestra el estado actual del vehículo y ayuda a que todo cuadre sin problemas.",
      },
      {
        title: "Muestre su identificación y su seguro de Luisiana",
        body: "Una identificación con foto y un comprobante de seguro de Luisiana a su nombre son lo que permite que el vehículo circule aquí a su nombre.",
      },
      {
        title: "Considere una posible revisión del VIN",
        body: "Algunas transferencias de otro estado necesitan una verificación física rápida del VIN y el odómetro. Si la suya la requiere, tener el vehículo consigo nos permite hacerla en la misma visita en lugar de pedirle que regrese.",
      },
    ],
    faqs: [
      {
        question: "¿Necesito traer el vehículo?",
        answer:
          "A veces. Ciertas transferencias de otro estado requieren una inspección física del VIN y el odómetro. Traer el vehículo nos permite verificarlo en el momento si hace falta y evitar un segundo viaje. Si no está seguro, llame antes y le decimos si la suya lo necesita.",
      },
      {
        question: "¿Qué pasa si todavía debo dinero del carro?",
        answer:
          "No hay problema, es común. Traiga el nombre de su acreedor y el número de cuenta para que el gravamen se traspase a su nuevo título de Luisiana. El prestamista mantiene registrado su interés y usted sigue manejando.",
      },
      {
        question: "¿Necesito primero una licencia de conducir de Luisiana?",
        answer:
          "Traiga la identificación con foto que tenga. Si ya cambió a una licencia de Luisiana, traiga esa. Si todavía está en plena mudanza, llámenos y le decimos qué sirve para su situación.",
      },
      {
        question: "¿Puedo quedarme con mis placas viejas de otro estado?",
        answer:
          "No, el vehículo recibe placas de Luisiana como parte del registro aquí. Nosotros nos encargamos de pedir la placa nueva durante la visita.",
      },
      {
        question: "¿Qué pasa si no encuentro mi título de otro estado?",
        answer:
          "Tendrá que reemplazarlo a través del estado que lo emitió antes de que Luisiana pueda convertirlo. Llámenos y lo orientamos para que no pierda un viaje.",
      },
    ],
  },
  "duplicate-title": {
    metaTitle: "Cómo reemplazar un título perdido o robado en Luisiana",
    metaDescription:
      "¿Perdió el título de su carro en Luisiana, o se lo robaron o se dañó? Aquí le explicamos cómo obtener un título duplicado, qué traer y cómo notarizamos la declaración jurada en el momento. 88 Title en Metairie.",
    eyebrow: "Título duplicado",
    heading: "Cómo reemplazar un título perdido o robado en Luisiana",
    intro: [
      "Su título se perdió, se dañó o nunca lo recibió, y ahora lo necesita para vender, para transferir o simplemente para tenerlo a mano.",
      "Un título duplicado es el reemplazo oficial del original. Aquí le explicamos cómo obtener uno sin tantas vueltas.",
    ],
    steps: [
      {
        title: "Confirme que usted es el propietario",
        body: "Traiga su identificación con foto y los datos de su vehículo: el VIN, el número de placa o el número del título anterior. Cualquiera de esos nos ayuda a encontrar el registro y confirmar que el título es suyo para reemplazarlo.",
      },
      {
        title: "Indique por qué necesita el reemplazo",
        body: "Perdido, robado o dañado, anotamos el motivo. Si se necesita una declaración jurada de pérdida o robo, podemos notarizársela aquí mismo.",
      },
      {
        title: "Primero libere cualquier gravamen viejo",
        body: "Si antes había un préstamo sobre el vehículo y ya está pagado, traiga la liberación del gravamen. Eso permite que el duplicado salga limpio, sin que el prestamista anterior siga apareciendo.",
      },
      {
        title: "Presentamos la solicitud del duplicado",
        body: "Preparamos y tramitamos la solicitud para que se le emita el título de reemplazo.",
      },
    ],
    faqs: [
      {
        question: "¿Qué pasa si no estoy seguro del número de mi título?",
        answer:
          "No hay problema. El VIN o el número de placa suele ser suficiente para encontrar su registro. Traiga lo que tenga y trabajamos a partir de ahí.",
      },
      {
        question: "¿Pueden notarizar aquí la declaración jurada de título perdido?",
        answer:
          "Sí. Podemos notarizar una declaración jurada de pérdida o robo en el momento, así no tiene que buscar primero un notario en otro lugar.",
      },
      {
        question: "En mi título aparece un préstamo viejo. ¿Eso importa?",
        answer:
          "Puede importar. Si el préstamo ya está pagado, traiga la liberación del gravamen para que el nuevo título se emita sin el prestamista anterior. Si no tiene la liberación, llámenos y vemos juntos cómo conseguirla.",
      },
      {
        question: "¿Puedo vender el carro mientras no tengo el título?",
        answer:
          "Conviene tener el duplicado primero, porque el comprador necesita un título válido cedido a su nombre. Obtenga el reemplazo y luego queda libre para vender. Muchas veces podemos tramitar el duplicado y los documentos de la venta juntos.",
      },
      {
        question: "Solo necesito una copia para mis archivos. ¿Es lo mismo?",
        answer:
          "Un título duplicado es el reemplazo oficial, no una fotocopia. Si solo necesita confirmar datos, llámenos y le decimos la forma más sencilla de conseguir lo que necesita.",
      },
    ],
  },
  "inherited-vehicle": {
    metaTitle: "Cómo transferir un vehículo heredado en Luisiana",
    metaDescription:
      "¿Heredó un vehículo en Luisiana tras un fallecimiento en la familia? Aquí le explicamos cómo suele ser la transferencia del título, los documentos que intervienen y por qué las sucesiones varían. 88 Title en Metairie lo guía paso a paso.",
    eyebrow: "Vehículo heredado",
    heading: "Cómo transferir un vehículo heredado en Luisiana",
    intro: [
      "Falleció alguien cercano a usted y hay un vehículo que atender. Este es uno de los trámites más variables, porque cómo se traspasa el título depende de la sucesión, así que la respuesta honesta es que el camino correcto es diferente de familia en familia.",
      "Aquí le explicamos cómo suele ser, y cómo le ayudamos a encontrar su camino específico sin adivinar.",
    ],
    steps: [
      {
        title: "Reúna el título y el certificado de defunción",
        body: "Traiga el título del vehículo y un certificado de defunción certificado. Estos son el punto de partida de casi toda transferencia de vehículo heredado.",
      },
      {
        title: "Resuelva los documentos de sucesión",
        body: "Esta es la parte que varía. Para algunas sucesiones basta con una declaración jurada de herederos. Otras pasan por los tribunales, y el título se traspasa con un auto de posesión. Cuál aplica depende de la sucesión, y eso es justo el tipo de cosa que le ayudamos a determinar en lugar de que tenga que adivinar.",
      },
      {
        title: "Traiga la identificación y el seguro del heredero",
        body: "La persona que asume la propiedad trae su identificación con foto y un comprobante de seguro de Luisiana, igual que en cualquier transferencia a nombre de un nuevo propietario.",
      },
      {
        title: "Le ayudamos a ajustar los documentos a su situación",
        body: "Las transferencias por herencia rara vez son iguales. Traiga lo que tenga, o llame primero, y le decimos qué necesita su situación antes de que haga el viaje.",
      },
    ],
    faqs: [
      {
        question: "¿Necesito hacer una sucesión completa?",
        answer:
          "No siempre. Las sucesiones más pequeñas o sencillas pueden calificar para transferir con una declaración jurada de herederos, mientras que otras necesitan un auto de posesión judicial. De verdad depende de la sucesión, así que lo mejor es llamar o venir y dejar que revisemos su caso antes de suponer el camino más difícil.",
      },
      {
        question:
          "¿Cuál es la diferencia entre una declaración jurada de herederos y un auto de posesión?",
        answer:
          "Una declaración jurada de herederos es una declaración bajo juramento que se usa para sucesiones que califican, sin proceso judicial. Un auto de posesión surge de una sucesión tramitada por los tribunales. Cuál corresponde a su situación depende de la sucesión, y le ayudamos a distinguir cuál es cuál.",
      },
      {
        question: "Hay varios herederos. ¿Todos tienen que estar de acuerdo?",
        answer:
          "Por lo general los herederos deben estar de acuerdo sobre quién se queda con el vehículo, y los documentos tienen que reflejarlo. Los detalles dependen de la sucesión, así que traiga lo que tenga y repasamos quién debe firmar qué.",
      },
      {
        question: "¿Qué pasa si no encuentro el título?",
        answer:
          "Eso pasa. Muchas veces podemos partir de los datos del vehículo para gestionar un reemplazo como parte de la transferencia. Llámenos y le decimos qué traer.",
      },
      {
        question: "Esto se siente complicado. ¿Solo pueden decirme qué necesito?",
        answer:
          "Sí, para eso estamos. Las transferencias por herencia son el caso donde una llamada rápida al inicio ahorra más tiempo. Cuéntenos sobre la sucesión y le damos una respuesta clara sobre su siguiente paso.",
      },
    ],
  },
  "registration-renewal": {
    metaTitle: "Cómo renovar el registro de su vehículo en Luisiana",
    metaDescription:
      "¿Hora de renovar el registro de su vehículo en Luisiana? Aquí le explicamos qué traer y cómo renovar en persona en Metairie sin la fila de la OMV. 88 Title.",
    eyebrow: "Renovación del registro",
    heading: "Cómo renovar el registro de su vehículo en Luisiana",
    intro: [
      "Su registro venció, o está por vencer, y quiere renovar sin hacer fila en la OMV.",
      "Aquí le explicamos qué traer para que podamos renovarlo en el mostrador y dejarlo salir pronto.",
    ],
    steps: [
      {
        title: "Traiga su aviso de renovación",
        body: "Su aviso de renovación o su registro vigente nos dice exactamente qué vehículo y qué placa estamos renovando. Cualquiera de los dos sirve.",
      },
      {
        title: "Traiga su identificación y su seguro",
        body: "Una identificación con foto y un comprobante de seguro vigente son lo que Luisiana necesita para que el vehículo vuelva a circular por otro periodo.",
      },
      {
        title: "Tenga a mano el número de su placa",
        body: "El número de su placa vincula todo con el registro correcto. Está en su registro vigente, por si no lo recuerda.",
      },
      {
        title: "Tramitamos la renovación",
        body: "Presentamos la renovación y ponemos su registro al día, para que esté cubierto.",
      },
    ],
    faqs: [
      {
        question: "Perdí mi aviso de renovación. ¿Aún puedo renovar?",
        answer:
          "Sí. Su registro vigente sirve igual de bien, e incluso sin él normalmente podemos encontrar su registro con el número de placa y su identificación. Traiga lo que tenga.",
      },
      {
        question: "¿Mi carro necesita una inspección primero?",
        answer:
          "Las reglas de inspección dependen del vehículo y de dónde vive. Si una inspección vigente o calcomanía de frenos (brake tag) forma parte de su renovación, se lo diremos. Si tiene dudas, llame antes para que haga un solo viaje.",
      },
      {
        question: "Mi registro ya venció. ¿Es demasiado tarde?",
        answer:
          "No, todavía puede renovar un registro vencido, aunque dejarlo vencer puede generar una multa por atraso. Venga y lo ponemos al día.",
      },
      {
        question: "¿Puedo renovar el vehículo de otra persona?",
        answer:
          "Muchas veces sí, si tiene los datos de su registro y los documentos requeridos. Llámenos con los detalles y le decimos qué traer.",
      },
    ],
  },
  plates: {
    metaTitle: "Transferencias y reemplazos de placas en Luisiana",
    metaDescription:
      "¿Necesita pasar una placa a otro vehículo, reemplazar una placa perdida o dañada, o pedir una placa especializada en Luisiana? Aquí le explicamos qué requiere cada una. 88 Title en Metairie.",
    eyebrow: "Placas",
    heading: "Placas: transferir, reemplazar o pedir una especializada",
    intro: [
      "Las placas cubren varias necesidades: pasar una placa que ya tiene a otro vehículo, reemplazar una que se perdió o se dañó, o pedir una placa especializada.",
      "Aquí le explicamos qué requiere cada una para que traiga lo correcto la primera vez.",
    ],
    steps: [
      {
        title: "Traiga su identificación y su registro",
        body: "Su identificación con foto y su registro vigente lo conectan con el vehículo y la placa que constan en el registro. Estos van con usted sin importar qué trámite de placa venga a hacer.",
      },
      {
        title: "Traiga la placa, si la tiene",
        body: "Para una transferencia o un reemplazo, traiga su placa actual. En una transferencia pasa al nuevo vehículo; en un reemplazo nos encargamos de entregar la anterior.",
      },
      {
        title: "Traiga un comprobante de seguro",
        body: "El comprobante de seguro mantiene debidamente cubierto el vehículo donde va la placa.",
      },
      {
        title: "Díganos qué busca",
        body: "Transferencia, reemplazo o placa especializada, cada una funciona un poco distinto. Avísenos y nosotros nos encargamos del resto.",
      },
    ],
    faqs: [
      {
        question: "¿Puedo pasar mi placa a otro carro que compré?",
        answer:
          "Por lo general sí. Luisiana le permite transferir una placa que le pertenece a otro vehículo a su nombre. Traiga su placa actual, su registro y su identificación, y la pasamos y actualizamos el registro.",
      },
      {
        question: "Perdí mi placa o me la robaron. ¿Qué hago?",
        answer:
          "Podemos gestionar un reemplazo. Traiga su identificación, su registro y un comprobante de seguro. Si la placa anterior de verdad se perdió, solo avísenos, y si todavía tiene una dañada, tráigala.",
      },
      {
        question: "¿Cómo pido una placa especializada?",
        answer:
          "Venga con su identificación y su registro y díganos qué placa especializada quiere, y empezamos el pedido. Las placas especializadas pueden tener sus propios cargos estatales, que repasaremos con usted.",
      },
      {
        question: "¿Necesito una placa nueva cuando compro un carro usado?",
        answer:
          "Depende de si está transfiriendo una placa que ya tiene o necesita que le emitan una nueva. Si compró a un vendedor particular, esto normalmente va junto con la transferencia del título. Cuéntenos su situación y lo resolvemos juntos.",
      },
    ],
  },
  notary: {
    metaTitle: "Servicios de notaría en Metairie, Luisiana",
    metaDescription:
      "¿Necesita notarizar un documento en Metairie? Tráigalo sin firmar, traiga su identificación y firme frente a nuestro notario. Aquí le explicamos cómo funciona y qué traer. 88 Title.",
    eyebrow: "Notaría",
    heading: "Servicios de notaría en Metairie",
    intro: [
      "Tiene un documento que necesita un notario: una declaración jurada, una autorización, una transferencia u otro acto.",
      "Aquí le explicamos cómo funciona una notarización y qué llevar consigo para que tome solo unos minutos.",
    ],
    steps: [
      {
        title: "Traiga el documento sin firmar",
        body: "Deje la firma en blanco. El sentido de notarizar es que usted firme frente al notario, así que no firme con anticipación.",
      },
      {
        title: "Traiga identificación con foto válida para cada firmante",
        body: "Cada persona que firme necesita una identificación con foto válida para que el notario pueda confirmar quién es.",
      },
      {
        title: "Todos firman en persona",
        body: "Todos los firmantes tienen que estar físicamente presentes. El notario presencia cada firma y luego completa el acto notarial.",
      },
    ],
    faqs: [
      {
        question: "¿Debo firmar el documento antes de venir?",
        answer:
          "No. Deje la firma en blanco y firme frente al notario. La función del notario es presenciar la firma, así que firmar antes anula el propósito.",
      },
      {
        question: "¿Qué identificación necesito?",
        answer:
          "Una identificación con foto válida emitida por el gobierno para cada persona que vaya a firmar. Si un firmante no tiene una identificación estándar, llámenos primero y le decimos qué opciones tiene.",
      },
      {
        question: "¿Puede alguien firmar por otra persona que no puede estar presente?",
        answer:
          "Solo si tiene la debida autoridad legal, como un poder notarial, e incluso entonces las reglas son específicas. Toda persona que firme debe estar presente en persona con su identificación. Llámenos con los detalles y le decimos qué sirve.",
      },
      {
        question: "¿Qué tipos de documentos pueden notarizar?",
        answer:
          "Atendemos actos comunes, declaraciones juradas, autorizaciones y documentos de transferencia. Si no está seguro de que el suyo aplique, llame antes y descríbalo, y le avisamos antes de que venga.",
      },
    ],
  },
};

const overrides: Partial<Record<Locale, Record<string, GuideOverride>>> = { es };

function localizeGuide(
  guide: ServiceGuide,
  locale: Locale,
): LocalizedServiceGuide {
  const o = overrides[locale]?.[guide.slug];
  return {
    slug: guide.slug,
    metaTitle: o?.metaTitle ?? guide.metaTitle,
    metaDescription: o?.metaDescription ?? guide.metaDescription,
    eyebrow: o?.eyebrow ?? guide.eyebrow,
    heading: o?.heading ?? guide.heading,
    intro: guide.intro.map((p, i) => o?.intro[i] ?? p),
    steps: guide.steps.map((s, i) => ({
      title: o?.steps[i]?.title ?? s.title,
      body: o?.steps[i]?.body ?? s.body,
    })),
    faqs: guide.faqs.map((f, i) => ({
      question: o?.faqs[i]?.question ?? f.question,
      answer: o?.faqs[i]?.answer ?? f.answer,
    })),
    related: guide.related,
  };
}

/** A localized service guide by slug, or undefined if there is none. */
export function getLocalizedGuide(
  slug: string,
  locale: Locale,
): LocalizedServiceGuide | undefined {
  const guide = getServiceGuide(slug);
  return guide ? localizeGuide(guide, locale) : undefined;
}

/** Resolve a guide's related slugs to localized transaction paths. */
export function getLocalizedRelatedPaths(
  related: readonly string[],
  locale: Locale,
): LocalizedTransactionPath[] {
  return related
    .map((slug) => getLocalizedPath(slug, locale))
    .filter((path): path is LocalizedTransactionPath => path !== undefined);
}
