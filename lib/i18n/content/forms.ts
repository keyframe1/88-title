/**
 * Localized public forms.
 *
 * English stays the single source of truth in lib/forms-library.ts (it also feeds
 * SEO, which is English). This module overlays the Spanish and Vietnamese text
 * for the one-line description and the `completedBy` role, keyed by the same
 * slugs; the form number and title stay English everywhere (they are the
 * document's official name). A missing translation falls back to the English
 * original, so the site never shows a blank.
 *
 * The form's `services` cross-links are resolved here too: each transaction slug
 * becomes a localized label (via the checklist resolver) and a /services href, so
 * the "Used for: Title transfer" line reads in the visitor's language.
 *
 * Descriptions and roles stay strictly factual — what the form IS and who fills
 * it, from the form's own text (see the COPY BOUNDARY note in
 * lib/forms-library.ts). No requirements guidance.
 *
 * Adding a language: add its block to `overrides` below.
 */
import { getTransactionPath } from "@/lib/checklists";
import { publicForms, type FormSlug } from "@/lib/forms-library";
import type { Locale } from "../config";
import { localizedServiceLabel } from "./checklists";

/** A resolved cross-link to a related transaction service. */
export interface LocalizedFormService {
  slug: string;
  /** Localized transaction label, e.g. "Title transfer" / "Transferencia de título". */
  label: string;
  /** Route to the service page, e.g. "/services/title-transfer". */
  href: string;
}

/** A public form resolved for one locale (number/title English, prose localized). */
export interface LocalizedForm {
  slug: FormSlug;
  /** English form number, or "" for a document with no DPSMV number. */
  number: string;
  title: string;
  /** Blank PDF path, or null when no blank is published yet (pending state). */
  file: string | null;
  description: string;
  completedBy: string;
  /** Related service cross-links (0–2), localized. Empty for cross-cutting forms. */
  services: LocalizedFormService[];
}

/** The localizable fields of one form. Any omitted field falls back to English. */
interface FormOverride {
  description?: string;
  completedBy?: string;
}

/** Spanish (Latin American) copy, pending native review before launch. */
const es: Partial<Record<FormSlug, FormOverride>> = {
  "dpsmv-1799": {
    description:
      "La solicitud de Luisiana para tramitar el título y registrar un vehículo.",
    completedBy: "La completa el solicitante",
  },
  "bill-of-sale": {
    description:
      "Deja constancia del precio, la fecha y ambas partes en una venta entre particulares.",
    completedBy: "La completan el comprador y el vendedor",
  },
  "act-of-donation": {
    description:
      "Deja constancia de la donación de un vehículo de un donante a un donatario, con su parentesco y el valor declarado.",
    completedBy: "La completan el donante y el donatario",
  },
  "dpsmv-1806": {
    description:
      "Un permiso firmado para que una persona designada realice un trámite específico ante la Oficina de Vehículos Motorizados (OMV). No es un poder notarial.",
    completedBy: "La firma el propietario",
  },
  "dpsmv-1606": {
    description:
      "La declaración de odómetro, exigida por ley estatal y federal, que hace constar el millaje del vehículo al transferir la propiedad.",
    completedBy: "La completan el comprador y el vendedor",
  },
  "dpsmv-1966": {
    description:
      "La certificación de un examinador médico sobre la discapacidad de movilidad del solicitante, para una placa o colgante (hangtag) de movilidad reducida.",
    completedBy: "La completa un médico",
  },
};

/** Vietnamese copy, pending native review before launch. */
const vi: Partial<Record<FormSlug, FormOverride>> = {
  "dpsmv-1799": {
    description:
      "Đơn của Louisiana để xin cấp giấy chủ quyền và đăng ký một chiếc xe.",
    completedBy: "Do người nộp đơn điền",
  },
  "bill-of-sale": {
    description:
      "Ghi lại giá bán, ngày bán và cả hai bên trong một giao dịch mua bán giữa các cá nhân.",
    completedBy: "Do bên mua và bên bán điền",
  },
  "act-of-donation": {
    description:
      "Ghi lại việc tặng một chiếc xe từ bên tặng (donor) cho bên nhận (donee), kèm mối quan hệ giữa họ và giá trị được khai.",
    completedBy: "Do bên tặng và bên nhận điền",
  },
  "dpsmv-1806": {
    description:
      "Giấy cho phép có ký tên để một người được chỉ định thực hiện một thủ tục cụ thể với Văn phòng Quản lý Xe cơ giới (OMV). Đây không phải là giấy ủy quyền.",
    completedBy: "Do chủ xe ký",
  },
  "dpsmv-1606": {
    description:
      "Bản khai số dặm (odometer) theo luật tiểu bang và liên bang, ghi lại số dặm của xe khi chuyển quyền sở hữu.",
    completedBy: "Do bên mua và bên bán điền",
  },
  "dpsmv-1966": {
    description:
      "Giấy chứng nhận của bác sĩ giám định về tình trạng suy giảm khả năng đi lại của người nộp đơn, để xin bảng số hoặc thẻ treo (hangtag) dành cho người suy giảm khả năng đi lại.",
    completedBy: "Do bác sĩ giám định điền",
  },
};

/** Per-locale overrides. English uses the library source directly. */
const overrides: Partial<Record<Locale, Partial<Record<FormSlug, FormOverride>>>> =
  {
    es,
    vi,
  };

/** Resolve a form's `services` slugs to localized labels + /services hrefs. */
function localizeServices(
  slugs: readonly string[],
  locale: Locale,
): LocalizedFormService[] {
  return slugs.map((slug) => ({
    slug,
    label: localizedServiceLabel(
      slug,
      locale,
      // English fallback is the transaction's own label from lib/checklists.ts.
      getTransactionPath(slug)?.label ?? slug,
    ),
    href: `/services/${slug}`,
  }));
}

/** All public forms, localized, in catalog order. */
export function getLocalizedPublicForms(locale: Locale): LocalizedForm[] {
  const table = overrides[locale];
  return publicForms.map((form) => {
    const o = table?.[form.slug];
    return {
      slug: form.slug,
      number: form.number,
      title: form.title,
      file: form.file,
      description: o?.description ?? form.description,
      completedBy: o?.completedBy ?? form.completedBy,
      services: localizeServices(form.services, locale),
    };
  });
}
