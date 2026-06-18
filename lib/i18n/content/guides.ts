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
 * are rendered plainly; have a native Spanish and Vietnamese speaker confirm
 * them before launch.
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

const vi: Record<string, GuideOverride> = {
  "title-transfer": {
    metaTitle: "Cách sang tên giấy chủ quyền xe tại Louisiana",
    metaDescription:
      "Quý khách vừa mua xe từ người bán cá nhân tại Louisiana? Đây là cách chuyển giấy chủ quyền xe sang tên quý khách chỉ trong một lần đi, cần mang theo gì, và lời giải đáp cho những câu hỏi thường gặp nhất. 88 Title tại Metairie.",
    eyebrow: "Chuyển nhượng giấy chủ quyền xe",
    heading: "Cách sang tên giấy chủ quyền xe tại Louisiana",
    intro: [
      "Quý khách vừa mua một chiếc xe từ người bán cá nhân. Giờ giấy chủ quyền xe cần sang tên quý khách, rồi bảng số và đăng ký cũng phải theo sau. Quý khách hẳn không muốn phải đi hai lần để lo cho xong.",
      "Đây là cách sang tên giấy chủ quyền xe thực sự diễn ra, và chính xác cần mang theo gì để chúng tôi hoàn tất ngay tại quầy.",
    ],
    steps: [
      {
        title: "Người bán ký sang tên cho quý khách",
        body: "Ở mặt sau giấy chủ quyền xe có phần sang nhượng. Người bán điền tên quý khách là người mua, giá bán, ngày, và số dặm trên đồng hồ, rồi ký. Chữ ký đó là điều hợp pháp trao chiếc xe cho quý khách.",
      },
      {
        title: "Lập giấy mua bán",
        body: "Giấy mua bán ghi lại giá, ngày và cả hai bên ở cùng một chỗ. Nó củng cố các con số trên giấy chủ quyền xe và bảo vệ cả hai bên. Nếu quý khách chưa có, chúng tôi có thể soạn và công chứng ngay khi quý khách ở đây.",
      },
      {
        title: "Mang theo giấy tờ chứng minh quý khách có thể đăng ký",
        body: "Louisiana cần xem giấy tờ tùy thân có ảnh và bằng chứng bảo hiểm Louisiana mang tên quý khách trước khi xe được lưu thông trở lại dưới tên quý khách.",
      },
      {
        title: "Chúng tôi xử lý việc sang tên và lo bảng số",
        body: "Chúng tôi chuẩn bị hồ sơ giấy chủ quyền xe, nộp lên, và lo phần đăng ký và bảng số, để quý khách ra về với mọi việc đang đi đúng hướng.",
      },
    ],
    faqs: [
      {
        question: "Người bán có cần đi cùng tôi không?",
        answer:
          "Không. Miễn là người bán đã ký sang tên giấy chủ quyền xe đúng cách cho quý khách và quý khách có giấy mua bán, quý khách có thể hoàn tất việc sang tên mà không cần họ. Quan trọng là chữ ký của người bán trên giấy chủ quyền xe, không phải sự có mặt của họ.",
      },
      {
        question: "Nếu người bán làm mất giấy chủ quyền xe thì sao?",
        answer:
          "Người bán phải xin cấp lại trước khi có thể ký sang tên, vì không thể sang tên một giấy chủ quyền xe không tồn tại. Họ có thể xin cấp lại tại OMV, và chúng tôi có thể giúp họ việc đó. Khi đã có bản cấp lại, họ ký sang tên cho quý khách và mọi việc trở lại đúng hướng.",
      },
      {
        question:
          "Nếu giá đã ghi trên giấy chủ quyền xe thì tôi còn cần giấy mua bán không?",
        answer:
          "Vẫn nên có. Giấy mua bán nêu rõ giá, ngày và cả hai bên trong một văn bản và bảo vệ mọi người nếu sau này có thắc mắc. Chúng tôi có thể công chứng giúp quý khách ngay tại chỗ.",
      },
      {
        question: "Sau khi mua, tôi có bao lâu để sang tên giấy chủ quyền xe?",
        answer:
          "Louisiana mong quý khách sang tên ngay sau khi mua, và để chậm có thể bị phạt, nên tốt nhất đừng để lâu. Mang giấy tờ đến và chúng tôi sẽ lo ngay. Nếu quý khách lo về thời hạn, hãy gọi cho chúng tôi và chúng tôi sẽ cho biết tình trạng của quý khách.",
      },
      {
        question: "Có bắt buộc ghi số dặm trên đồng hồ không?",
        answer:
          "Với hầu hết các xe dưới 20 năm tuổi, có. Số dặm được ghi lại vào thời điểm mua bán. Chúng tôi sẽ bảo đảm ghi nhận chính xác.",
      },
    ],
  },
  "new-to-louisiana": {
    metaTitle: "Cách đăng ký xe từ tiểu bang khác tại Louisiana",
    metaDescription:
      "Mới đến Louisiana với chiếc xe từ tiểu bang khác? Đây là cách làm giấy chủ quyền xe và đăng ký tại đây, cần mang theo gì, và liệu quý khách có cần kiểm tra số VIN hay không. 88 Title tại Metairie.",
    eyebrow: "Mới chuyển đến Louisiana",
    heading: "Cách đăng ký xe từ tiểu bang khác tại Louisiana",
    intro: [
      "Quý khách chuyển đến Louisiana, hoặc mua một chiếc xe ở tiểu bang khác, và giờ xe cần bảng số Louisiana và giấy chủ quyền xe Louisiana.",
      "Đây là cách chuyển đổi, và cần mang theo gì để chỉ phải đi một lần.",
    ],
    steps: [
      {
        title: "Mang theo giấy chủ quyền xe hiện tại từ tiểu bang khác",
        body: "Đây là giấy tờ mà Louisiana chuyển đổi thành giấy chủ quyền xe Louisiana. Nếu xe vẫn còn khoản vay, hãy mang theo tên bên cho vay và số tài khoản để khoản thế chấp được chuyển qua đúng cách.",
      },
      {
        title: "Mang theo giấy đăng ký hiện tại",
        body: "Giấy đăng ký từ tiểu bang khác cho thấy tình trạng hiện tại của xe và giúp mọi thứ khớp nhau gọn gàng.",
      },
      {
        title: "Trình giấy tờ tùy thân và bảo hiểm Louisiana",
        body: "Giấy tờ tùy thân có ảnh và bằng chứng bảo hiểm Louisiana mang tên quý khách là những thứ cho phép xe lưu thông tại đây dưới tên quý khách.",
      },
      {
        title: "Chuẩn bị cho khả năng phải kiểm tra số VIN",
        body: "Một số trường hợp chuyển từ tiểu bang khác cần kiểm tra trực tiếp nhanh số VIN và số dặm. Nếu trường hợp của quý khách cần, mang theo xe nghĩa là chúng tôi có thể làm ngay trong cùng một lần thay vì phải hẹn quý khách quay lại.",
      },
    ],
    faqs: [
      {
        question: "Tôi có cần mang theo chiếc xe không?",
        answer:
          "Đôi khi. Một số trường hợp chuyển từ tiểu bang khác cần kiểm tra trực tiếp số VIN và số dặm. Mang theo xe nghĩa là chúng tôi có thể kiểm tra ngay tại chỗ nếu cần và tránh phải đi lần hai. Nếu không chắc, hãy gọi trước và chúng tôi sẽ cho biết trường hợp của quý khách có cần hay không.",
      },
      {
        question: "Nếu tôi vẫn còn nợ tiền xe thì sao?",
        answer:
          "Không sao, chuyện này thường gặp. Hãy mang theo tên bên cho vay và số tài khoản để khoản thế chấp được chuyển sang giấy chủ quyền xe Louisiana mới của quý khách. Bên cho vay vẫn giữ quyền lợi được ghi nhận và quý khách vẫn tiếp tục lái xe.",
      },
      {
        question: "Tôi có cần bằng lái xe Louisiana trước không?",
        answer:
          "Hãy mang theo giấy tờ tùy thân có ảnh nào quý khách có. Nếu quý khách đã đổi sang bằng lái Louisiana, hãy mang theo cái đó. Nếu vẫn đang trong quá trình chuyển đến, hãy gọi cho chúng tôi và chúng tôi sẽ cho biết loại nào phù hợp với trường hợp của quý khách.",
      },
      {
        question: "Tôi có được giữ bảng số cũ từ tiểu bang khác không?",
        answer:
          "Không, xe sẽ nhận bảng số Louisiana như một phần của việc đăng ký tại đây. Chúng tôi lo việc đặt bảng số mới ngay trong lần đến.",
      },
      {
        question: "Nếu tôi không tìm thấy giấy chủ quyền xe từ tiểu bang khác thì sao?",
        answer:
          "Quý khách sẽ cần xin cấp lại qua tiểu bang đã cấp trước khi Louisiana có thể chuyển đổi. Hãy gọi cho chúng tôi và chúng tôi sẽ chỉ hướng đúng để quý khách không mất công đi.",
      },
    ],
  },
  "duplicate-title": {
    metaTitle:
      "Cách thay thế giấy chủ quyền xe bị mất hoặc bị đánh cắp tại Louisiana",
    metaDescription:
      "Làm mất giấy chủ quyền xe Louisiana, hoặc bị đánh cắp hay hư hỏng? Đây là cách xin cấp lại giấy chủ quyền xe, cần mang theo gì, và cách chúng tôi công chứng bản khai hữu thệ ngay tại chỗ. 88 Title tại Metairie.",
    eyebrow: "Cấp lại giấy chủ quyền xe",
    heading:
      "Cách thay thế giấy chủ quyền xe bị mất hoặc bị đánh cắp tại Louisiana",
    intro: [
      "Giấy chủ quyền xe của quý khách bị mất, bị hư hỏng, hoặc quý khách chưa bao giờ nhận được, và giờ quý khách cần nó để bán, để sang tên, hoặc chỉ để có sẵn trong tay.",
      "Giấy chủ quyền xe cấp lại là bản thay thế chính thức cho bản gốc. Đây là cách xin cấp lại mà không phải đi lòng vòng.",
    ],
    steps: [
      {
        title: "Xác nhận quý khách là chủ sở hữu",
        body: "Mang theo giấy tờ tùy thân có ảnh và thông tin chiếc xe: số VIN, số bảng số, hoặc số giấy chủ quyền cũ. Bất kỳ thông tin nào trong đó cũng giúp chúng tôi tìm hồ sơ và xác nhận giấy chủ quyền xe là của quý khách để cấp lại.",
      },
      {
        title: "Cho biết lý do quý khách cần cấp lại",
        body: "Bị mất, bị đánh cắp, hay hư hỏng, chúng tôi ghi lại lý do. Nếu cần bản khai hữu thệ về việc mất hoặc bị đánh cắp, chúng tôi có thể công chứng giúp quý khách ngay tại đây.",
      },
      {
        title: "Giải chấp khoản thế chấp cũ trước",
        body: "Nếu trước đây xe có khoản vay và đã trả hết, hãy mang theo giấy giải chấp. Điều đó giúp giấy chủ quyền xe cấp lại được sạch sẽ, không còn bên cho vay cũ trong đó.",
      },
      {
        title: "Chúng tôi nộp đơn xin cấp lại",
        body: "Chúng tôi chuẩn bị và xử lý hồ sơ để giấy chủ quyền xe thay thế được cấp cho quý khách.",
      },
    ],
    faqs: [
      {
        question: "Nếu tôi không chắc số giấy chủ quyền xe của mình thì sao?",
        answer:
          "Không sao. Số VIN hoặc số bảng số thường đủ để chúng tôi tìm ra hồ sơ của quý khách. Hãy mang theo những gì quý khách có và chúng tôi sẽ làm từ đó.",
      },
      {
        question:
          "Có thể công chứng bản khai hữu thệ về việc mất giấy chủ quyền xe tại đây không?",
        answer:
          "Có. Chúng tôi có thể công chứng bản khai hữu thệ về việc mất hoặc bị đánh cắp ngay tại chỗ, nên quý khách không phải đi tìm công chứng viên ở nơi khác trước.",
      },
      {
        question:
          "Trên giấy chủ quyền xe của tôi có ghi một khoản vay cũ. Điều đó có quan trọng không?",
        answer:
          "Có thể. Nếu khoản vay đã trả hết, hãy mang theo giấy giải chấp để giấy chủ quyền xe mới được cấp mà không còn bên cho vay cũ đính kèm. Nếu quý khách không có giấy giải chấp, hãy gọi cho chúng tôi và chúng tôi sẽ cùng bàn cách lấy nó.",
      },
      {
        question: "Tôi có thể bán xe trong khi giấy chủ quyền xe bị thất lạc không?",
        answer:
          "Quý khách nên xin cấp lại trước, vì người mua cần một giấy chủ quyền xe hợp lệ được ký sang tên cho họ. Hãy lấy bản thay thế, rồi quý khách tự do bán. Chúng tôi thường có thể lo phần cấp lại và giấy tờ mua bán cùng một lúc.",
      },
      {
        question: "Tôi chỉ cần một bản sao để lưu hồ sơ. Có phải cùng một thứ không?",
        answer:
          "Giấy chủ quyền xe cấp lại là bản thay thế chính thức, không phải bản photocopy. Nếu quý khách chỉ cần xác nhận thông tin, hãy gọi cho chúng tôi và chúng tôi sẽ cho biết cách đơn giản nhất để có được điều quý khách cần.",
      },
    ],
  },
  "inherited-vehicle": {
    metaTitle: "Cách sang tên xe thừa kế tại Louisiana",
    metaDescription:
      "Thừa kế một chiếc xe tại Louisiana sau khi gia đình có người qua đời? Đây là cách thông thường của việc sang tên giấy chủ quyền xe, các giấy tờ liên quan, và vì sao thủ tục thừa kế di sản mỗi trường hợp một khác. 88 Title tại Metairie sẽ hướng dẫn quý khách từng bước.",
    eyebrow: "Xe thừa kế",
    heading: "Cách sang tên xe thừa kế tại Louisiana",
    intro: [
      "Một người thân của quý khách vừa qua đời và có một chiếc xe cần lo. Đây là một trong những thủ tục thay đổi nhiều nhất tùy trường hợp, vì cách sang tên giấy chủ quyền xe phụ thuộc vào di sản, nên câu trả lời thành thật là con đường đúng sẽ khác nhau giữa mỗi gia đình.",
      "Đây là cách thông thường, và cách chúng tôi giúp quý khách tìm ra con đường cụ thể của mình mà không phải đoán.",
    ],
    steps: [
      {
        title: "Chuẩn bị giấy chủ quyền xe và giấy chứng tử",
        body: "Mang theo giấy chủ quyền xe và giấy chứng tử có công chứng. Đây là điểm khởi đầu cho hầu hết mọi trường hợp sang tên xe thừa kế.",
      },
      {
        title: "Lo phần giấy tờ thừa kế di sản",
        body: "Đây là phần thay đổi tùy trường hợp. Với một số di sản, bản khai hữu thệ về quyền thừa kế là đủ. Một số khác phải qua tòa, và giấy chủ quyền xe được sang tên bằng phán quyết về quyền sở hữu. Cách nào áp dụng tùy thuộc vào di sản, và đó chính là điều chúng tôi sẽ giúp quý khách xác định thay vì để quý khách phải đoán.",
      },
      {
        title: "Mang theo giấy tờ tùy thân và bảo hiểm của người thừa kế",
        body: "Người nhận quyền sở hữu mang theo giấy tờ tùy thân có ảnh và bằng chứng bảo hiểm Louisiana, giống như mọi trường hợp sang tên cho một chủ sở hữu mới.",
      },
      {
        title: "Chúng tôi giúp khớp giấy tờ với trường hợp của quý khách",
        body: "Các trường hợp sang tên do thừa kế hiếm khi giống hệt nhau. Hãy mang theo những gì quý khách có, hoặc gọi trước, và chúng tôi sẽ cho biết trường hợp của quý khách cần gì trước khi quý khách lên đường.",
      },
    ],
    faqs: [
      {
        question: "Tôi có cần làm thủ tục thừa kế di sản đầy đủ không?",
        answer:
          "Không phải lúc nào cũng vậy. Những di sản nhỏ hơn hoặc đơn giản hơn có thể đủ điều kiện sang tên bằng bản khai hữu thệ về quyền thừa kế, trong khi những trường hợp khác cần phán quyết về quyền sở hữu của tòa. Việc này thực sự tùy thuộc vào di sản, nên cách tốt nhất là gọi hoặc ghé qua để chúng tôi xem xét chi tiết trường hợp của quý khách trước khi quý khách cho rằng phải đi con đường khó hơn.",
      },
      {
        question:
          "Bản khai hữu thệ về quyền thừa kế và phán quyết về quyền sở hữu khác nhau thế nào?",
        answer:
          "Bản khai hữu thệ về quyền thừa kế là một lời khai có tuyên thệ dùng cho những di sản đủ điều kiện, không qua tòa. Phán quyết về quyền sở hữu là kết quả của một thủ tục thừa kế được xử lý qua tòa án. Trường hợp của quý khách cần loại nào là tùy thuộc vào di sản, và chúng tôi sẽ giúp quý khách phân biệt cái nào là cái nào.",
      },
      {
        question: "Có nhiều người thừa kế. Mọi người có phải đồng ý không?",
        answer:
          "Nói chung những người thừa kế cần thống nhất về việc ai sẽ nhận chiếc xe, và giấy tờ phải thể hiện điều đó. Chi tiết tùy thuộc vào di sản, nên hãy mang theo những gì quý khách có và chúng tôi sẽ cùng xem ai cần ký những gì.",
      },
      {
        question: "Nếu tôi không tìm thấy giấy chủ quyền xe thì sao?",
        answer:
          "Chuyện đó vẫn xảy ra. Chúng tôi thường có thể dựa vào thông tin chiếc xe để lo việc cấp lại như một phần của việc sang tên. Hãy gọi cho chúng tôi và chúng tôi sẽ cho biết cần mang theo gì.",
      },
      {
        question: "Việc này có vẻ phức tạp. Cho tôi biết tôi cần gì được không?",
        answer:
          "Được, chúng tôi ở đây chính là để làm việc đó. Sang tên xe thừa kế là trường hợp mà một cuộc gọi nhanh ngay từ đầu tiết kiệm thời gian nhất. Hãy cho chúng tôi biết về di sản và chúng tôi sẽ cho quý khách một câu trả lời rõ ràng về bước tiếp theo.",
      },
    ],
  },
  "registration-renewal": {
    metaTitle: "Cách gia hạn đăng ký xe tại Louisiana",
    metaDescription:
      "Đến lúc gia hạn đăng ký xe Louisiana? Đây là những gì cần mang theo và cách gia hạn trực tiếp tại Metairie mà khỏi xếp hàng ở OMV. 88 Title.",
    eyebrow: "Gia hạn đăng ký xe",
    heading: "Cách gia hạn đăng ký xe tại Louisiana",
    intro: [
      "Đăng ký xe của quý khách đã đến hạn, hoặc gần đến hạn, và quý khách muốn gia hạn mà không phải xếp hàng ở OMV.",
      "Đây là những gì cần mang theo để chúng tôi gia hạn ngay tại quầy và để quý khách ra về nhanh chóng.",
    ],
    steps: [
      {
        title: "Mang theo thông báo gia hạn",
        body: "Thông báo gia hạn hoặc giấy đăng ký hiện tại cho chúng tôi biết chính xác đang gia hạn cho xe và bảng số nào. Cái nào cũng được.",
      },
      {
        title: "Mang theo giấy tờ tùy thân và bảo hiểm",
        body: "Giấy tờ tùy thân có ảnh và bằng chứng bảo hiểm còn hiệu lực là những gì Louisiana cần để cho xe lưu thông thêm một kỳ nữa.",
      },
      {
        title: "Chuẩn bị sẵn số bảng số",
        body: "Số bảng số xe gắn mọi thứ vào đúng hồ sơ. Số đó nằm trên giấy đăng ký hiện tại của quý khách nếu quý khách không nhớ.",
      },
      {
        title: "Chúng tôi xử lý việc gia hạn",
        body: "Chúng tôi nộp đơn gia hạn và cập nhật đăng ký của quý khách, để quý khách được bảo đảm.",
      },
    ],
    faqs: [
      {
        question: "Tôi làm mất thông báo gia hạn. Tôi vẫn gia hạn được không?",
        answer:
          "Được. Giấy đăng ký hiện tại cũng dùng được tốt như vậy, và ngay cả khi không có nó, chúng tôi thường vẫn tìm được hồ sơ của quý khách từ số bảng số và giấy tờ tùy thân. Hãy mang theo những gì quý khách có.",
      },
      {
        question: "Xe của tôi có cần kiểm định trước không?",
        answer:
          "Quy định kiểm định tùy thuộc vào xe và nơi quý khách sống. Nếu việc gia hạn cần có kiểm định hiện hành hoặc tem thắng (brake tag), chúng tôi sẽ cho quý khách biết. Nếu không chắc, hãy gọi trước để chỉ phải đi một lần.",
      },
      {
        question: "Đăng ký xe của tôi đã hết hạn. Có quá trễ không?",
        answer:
          "Không, quý khách vẫn có thể gia hạn đăng ký đã hết hạn, dù để quá hạn có thể bị phạt trễ. Hãy ghé qua và chúng tôi sẽ cập nhật cho quý khách.",
      },
      {
        question: "Tôi có thể gia hạn cho xe của người khác không?",
        answer:
          "Thường là được, nếu quý khách có thông tin đăng ký của họ và các giấy tờ cần thiết. Hãy gọi cho chúng tôi với chi tiết cụ thể và chúng tôi sẽ cho biết cần mang theo gì.",
      },
    ],
  },
  plates: {
    metaTitle: "Chuyển và thay thế bảng số xe tại Louisiana",
    metaDescription:
      "Cần chuyển bảng số sang xe khác, thay thế bảng số bị mất hoặc hư hỏng, hay đặt bảng số đặc biệt tại Louisiana? Đây là những gì mỗi việc cần. 88 Title tại Metairie.",
    eyebrow: "Bảng số xe",
    heading: "Bảng số xe: chuyển, thay thế hoặc đặt loại đặc biệt",
    intro: [
      "Bảng số bao gồm vài nhu cầu khác nhau: chuyển một bảng số quý khách đã có sang một chiếc xe khác, thay thế bảng số bị mất hoặc hư hỏng, hoặc đặt một bảng số đặc biệt.",
      "Đây là những gì mỗi việc cần để quý khách mang theo đúng thứ ngay lần đầu.",
    ],
    steps: [
      {
        title: "Mang theo giấy tờ tùy thân và giấy đăng ký",
        body: "Giấy tờ tùy thân có ảnh và giấy đăng ký hiện tại kết nối quý khách với chiếc xe và bảng số trong hồ sơ. Những thứ này luôn cần, bất kể quý khách đến để làm việc gì về bảng số.",
      },
      {
        title: "Mang theo chính bảng số, nếu quý khách có",
        body: "Khi chuyển hoặc thay thế, hãy mang theo bảng số hiện có. Khi chuyển, nó được gắn sang xe mới; khi thay thế, chúng tôi lo việc nộp trả bảng số cũ.",
      },
      {
        title: "Mang theo bằng chứng bảo hiểm",
        body: "Bằng chứng bảo hiểm giữ cho chiếc xe gắn bảng số được bảo hiểm đầy đủ.",
      },
      {
        title: "Cho chúng tôi biết quý khách cần gì",
        body: "Chuyển, thay thế, hay bảng số đặc biệt, mỗi việc tiến hành hơi khác nhau. Hãy cho chúng tôi biết và chúng tôi sẽ lo phần còn lại.",
      },
    ],
    faqs: [
      {
        question: "Tôi có thể chuyển bảng số sang một chiếc xe khác tôi vừa mua không?",
        answer:
          "Thường là được. Louisiana cho phép quý khách chuyển bảng số mà quý khách sở hữu sang một chiếc xe khác mang tên quý khách. Hãy mang theo bảng số hiện có, giấy đăng ký và giấy tờ tùy thân, và chúng tôi sẽ chuyển nó qua và cập nhật hồ sơ.",
      },
      {
        question: "Bảng số của tôi bị mất hoặc bị đánh cắp. Tôi phải làm gì?",
        answer:
          "Chúng tôi có thể lo việc thay thế. Hãy mang theo giấy tờ tùy thân, giấy đăng ký và bằng chứng bảo hiểm. Nếu bảng số cũ thực sự mất hẳn, chỉ cần cho chúng tôi biết, còn nếu quý khách vẫn còn một bảng số hư hỏng, hãy mang theo.",
      },
      {
        question: "Làm sao để đặt bảng số đặc biệt?",
        answer:
          "Hãy ghé qua với giấy tờ tùy thân và giấy đăng ký rồi cho chúng tôi biết quý khách muốn loại bảng số đặc biệt nào, và chúng tôi sẽ bắt đầu đặt. Bảng số đặc biệt có thể có phí riêng của tiểu bang, và chúng tôi sẽ trao đổi với quý khách về các khoản đó.",
      },
      {
        question: "Khi mua xe cũ tôi có cần bảng số mới không?",
        answer:
          "Tùy vào việc quý khách chuyển một bảng số đã sở hữu hay cần cấp một bảng số mới. Nếu quý khách mua từ người bán cá nhân, việc này thường đi kèm với việc sang tên giấy chủ quyền xe. Hãy cho chúng tôi biết trường hợp của quý khách và chúng tôi sẽ cùng giải quyết.",
      },
    ],
  },
  notary: {
    metaTitle: "Dịch vụ công chứng tại Metairie, Louisiana",
    metaDescription:
      "Cần công chứng một giấy tờ tại Metairie? Mang đến khi chưa ký, mang theo giấy tờ tùy thân, và ký trước mặt công chứng viên của chúng tôi. Đây là cách thực hiện và những gì cần mang theo. 88 Title.",
    eyebrow: "Công chứng",
    heading: "Dịch vụ công chứng tại Metairie",
    intro: [
      "Quý khách có một giấy tờ cần công chứng: một bản khai hữu thệ, một giấy ủy quyền, một văn bản chuyển nhượng, hoặc một văn bản khác.",
      "Đây là cách công chứng diễn ra và cần mang theo gì để chỉ mất vài phút.",
    ],
    steps: [
      {
        title: "Mang giấy tờ đến khi chưa ký",
        body: "Để trống phần chữ ký. Ý nghĩa của việc công chứng là quý khách ký trước mặt công chứng viên, nên đừng ký trước.",
      },
      {
        title: "Mang theo giấy tờ tùy thân có ảnh hợp lệ cho mỗi người ký",
        body: "Mỗi người ký cần một giấy tờ tùy thân có ảnh hợp lệ để công chứng viên xác nhận họ là ai.",
      },
      {
        title: "Mọi người ký trực tiếp",
        body: "Tất cả người ký phải có mặt trực tiếp. Công chứng viên chứng kiến từng chữ ký rồi hoàn tất văn bản công chứng.",
      },
    ],
    faqs: [
      {
        question: "Tôi có nên ký giấy tờ trước khi đến không?",
        answer:
          "Không. Hãy để trống phần chữ ký và ký trước mặt công chứng viên. Nhiệm vụ của công chứng viên là chứng kiến việc ký, nên ký sớm sẽ làm mất ý nghĩa.",
      },
      {
        question: "Tôi cần loại giấy tờ tùy thân nào?",
        answer:
          "Một giấy tờ tùy thân có ảnh hợp lệ do chính phủ cấp cho mỗi người sẽ ký. Nếu một người ký không có giấy tờ tùy thân thông thường, hãy gọi cho chúng tôi trước và chúng tôi sẽ cho biết quý khách có những lựa chọn nào.",
      },
      {
        question: "Một người có thể ký thay cho người khác không thể có mặt không?",
        answer:
          "Chỉ khi họ có thẩm quyền pháp lý phù hợp, chẳng hạn như giấy ủy quyền, và ngay cả khi đó các quy định cũng rất cụ thể. Mọi người ký đều phải có mặt trực tiếp kèm giấy tờ tùy thân. Hãy gọi cho chúng tôi với chi tiết và chúng tôi sẽ cho biết cách nào được.",
      },
      {
        question: "Có thể công chứng những loại giấy tờ nào?",
        answer:
          "Chúng tôi nhận các văn bản thông thường, bản khai hữu thệ, giấy ủy quyền và giấy tờ chuyển nhượng. Nếu quý khách không chắc giấy tờ của mình có phù hợp không, hãy gọi trước và mô tả, và chúng tôi sẽ cho biết trước khi quý khách đến.",
      },
    ],
  },
};

const overrides: Partial<Record<Locale, Record<string, GuideOverride>>> = {
  es,
  vi,
};

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
