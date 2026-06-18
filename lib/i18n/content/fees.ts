/**
 * Localized service-fee menu.
 *
 * English stays the single source in lib/services.ts. This module overlays the
 * Spanish labels/descriptions/notes by id, preserving every amount and flag
 * (locked, passThrough, unconfirmed) untouched — the numbers and compliance
 * flags are language-neutral and must not drift.
 *
 * COMPLIANCE: the $23 public-tag-fee disclosure and the convenience-fee note are
 * money-decision text. They are translated plainly here and flagged for native
 * Spanish review before launch (see the task summary).
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
    note: "Monto de muestra. Este cargo por conveniencia (R.S. 47:532.1) se confirmará con la oficina.",
  },
};

const overrides: Partial<
  Record<
    Locale,
    { disclosure: string; tagFee: FeeText; fees: Record<string, FeeText> }
  >
> = {
  es: { disclosure: ES_OMV_DISCLOSURE, tagFee: esTagFee, fees: esServiceFees },
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
