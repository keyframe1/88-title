/**
 * Localized service-fee menu.
 *
 * English stays the single source in lib/services.ts. This module overlays the
 * Spanish labels/descriptions/notes by id, preserving every amount and flag
 * (locked, passThrough, unconfirmed) untouched — the numbers and compliance
 * flags are language-neutral and must not drift.
 *
 * COMPLIANCE: the $23 public-tag-fee disclosure is money-decision text. It is
 * translated plainly here and flagged for native Spanish and Vietnamese review
 * before launch (see the task summary). The convenience-fee note is now a plain,
 * neutral statutory citation (R.S. 47:532.1), not a pricing hedge.
 */
import {
  OMV_DISCLOSURE,
  PUBLIC_TAG_FEE,
  serviceFees,
  type ServiceLineItem,
} from "@/lib/services";
import type { Locale } from "../config";

export type LocalizedFee = ServiceLineItem;

interface FeeText {
  label: string;
  description?: string;
  note?: string;
}

/** Spanish disclosure shown wherever the $23 fee appears. High-stakes. */
const ES_OMV_DISCLOSURE =
  "Usted puede obtener su placa (tag) directamente en la Oficina de Vehículos Motorizados (OMV) de Luisiana sin pagar el cargo por conveniencia de 88 Title.";

const esTagFee: FeeText = {
  label: "Cargo de placa pública",
  description: "El cargo estatal de placa (tag), fijado por ley.",
  note: ES_OMV_DISCLOSURE,
};

const esServiceFees: Record<string, FeeText> = {
  notary: {
    label: "Notaría",
    description:
      "Notarizar su título, factura de venta o documentos de transferencia.",
  },
  "title-service": {
    label: "Servicio de título",
    description: "Preparar y tramitar su transferencia o solicitud de título.",
  },
  "lien-holder-service": {
    label: "Servicio de gravamen",
    description: "Registrar o liberar un gravamen sobre el título.",
  },
  "handling-registration": {
    label: "Gestión / Registro",
    description: "Gestionar su trámite de registro ante la OMV.",
  },
  "plate-disposal": {
    label: "Entrega de placa",
    description: "Entregar correctamente una placa que ya no necesita.",
  },
  "convenience-expedite": {
    label: "Conveniencia / Trámite expedito",
    description: "Manejo más rápido y prioritario de su trámite.",
    note: "Cargo por conveniencia autorizado por la ley de Luisiana R.S. 47:532.1.",
  },
};

/** Vietnamese disclosure shown wherever the $23 fee appears. High-stakes. */
const VI_OMV_DISCLOSURE =
  "Quý khách có thể lấy bảng số xe (tag) trực tiếp tại Văn phòng Quản lý Xe cơ giới Louisiana (OMV) mà không phải trả phí tiện lợi của 88 Title.";

const viTagFee: FeeText = {
  label: "Phí bảng số công",
  description: "Phí bảng số xe (tag) của tiểu bang, do luật định.",
  note: VI_OMV_DISCLOSURE,
};

const viServiceFees: Record<string, FeeText> = {
  notary: {
    label: "Công chứng",
    description:
      "Công chứng giấy chủ quyền xe, giấy mua bán hoặc giấy tờ chuyển nhượng của quý khách.",
  },
  "title-service": {
    label: "Dịch vụ giấy chủ quyền xe",
    description:
      "Chuẩn bị và xử lý hồ sơ chuyển nhượng hoặc đăng ký giấy chủ quyền xe của quý khách.",
  },
  "lien-holder-service": {
    label: "Dịch vụ thế chấp",
    description: "Ghi nhận hoặc giải chấp khoản thế chấp trên giấy chủ quyền xe.",
  },
  "handling-registration": {
    label: "Xử lý / Đăng ký",
    description: "Lo thủ tục đăng ký của quý khách với OMV.",
  },
  "plate-disposal": {
    label: "Trả lại bảng số",
    description: "Nộp trả đúng cách bảng số mà quý khách không còn cần.",
  },
  "convenience-expedite": {
    label: "Tiện lợi / Làm nhanh",
    description: "Xử lý nhanh hơn, ưu tiên cho thủ tục của quý khách.",
    note: "Phí tiện lợi được cho phép theo luật Louisiana R.S. 47:532.1.",
  },
};

const overrides: Partial<
  Record<
    Locale,
    { disclosure: string; tagFee: FeeText; fees: Record<string, FeeText> }
  >
> = {
  es: { disclosure: ES_OMV_DISCLOSURE, tagFee: esTagFee, fees: esServiceFees },
  vi: { disclosure: VI_OMV_DISCLOSURE, tagFee: viTagFee, fees: viServiceFees },
};

function apply(fee: ServiceLineItem, text: FeeText | undefined): LocalizedFee {
  if (!text) return fee;
  return {
    ...fee,
    label: text.label,
    description: text.description ?? fee.description,
    note: text.note ?? fee.note,
  };
}

/** The selectable 88 Title service fees, localized (amounts unchanged). */
export function getLocalizedServiceFees(locale: Locale): LocalizedFee[] {
  const table = overrides[locale];
  return serviceFees.map((fee) => apply(fee, table?.fees[fee.id]));
}

/** The statutory $23 public tag fee, localized (amount and lock unchanged). */
export function getLocalizedPublicTagFee(locale: Locale): LocalizedFee {
  return apply(PUBLIC_TAG_FEE, overrides[locale]?.tagFee);
}

/** The OMV disclosure string for the active locale. */
export function getOmvDisclosure(locale: Locale): string {
  return overrides[locale]?.disclosure ?? OMV_DISCLOSURE;
}
