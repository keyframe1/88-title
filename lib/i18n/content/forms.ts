/**
 * Localized public forms.
 *
 * English stays the single source of truth in lib/forms-library.ts (it also feeds
 * SEO, which is English). This module overlays the Spanish and Vietnamese text
 * for the one-line descriptions ONLY, keyed by the same slugs; the form number
 * and title stay English everywhere (they are the document's official name). A
 * missing translation falls back to the English original, so the site never
 * shows a blank.
 *
 * Descriptions stay strictly factual — what the form IS, from the form's own text
 * (see the COPY BOUNDARY note in lib/forms-library.ts). No requirements guidance.
 *
 * Adding a language: add its block to `descriptions` below.
 */
import { publicForms, type FormSlug } from "@/lib/forms-library";
import type { Locale } from "../config";

/** A public form resolved for one locale (number/title English, description localized). */
export interface LocalizedForm {
  slug: FormSlug;
  number: string;
  title: string;
  file: string;
  description: string;
}

/** Spanish (Latin American) descriptions, pending native review before launch. */
const es: Partial<Record<FormSlug, string>> = {
  "dpsmv-1806":
    "Un permiso firmado para que una persona designada realice un trámite específico ante la Oficina de Vehículos Motorizados (OMV). No es un poder notarial.",
  "dpsmv-1966":
    "La certificación de un examinador médico sobre la discapacidad de movilidad del solicitante, para una placa o colgante (hangtag) de movilidad reducida.",
  "dpsmv-1606":
    "La declaración de odómetro, exigida por ley estatal y federal, que hace constar el millaje del vehículo al transferir la propiedad.",
};

/** Vietnamese descriptions, pending native review before launch. */
const vi: Partial<Record<FormSlug, string>> = {
  "dpsmv-1806":
    "Giấy cho phép có ký tên để một người được chỉ định thực hiện một thủ tục cụ thể với Văn phòng Quản lý Xe cơ giới (OMV). Đây không phải là giấy ủy quyền.",
  "dpsmv-1966":
    "Giấy chứng nhận của bác sĩ giám định về tình trạng suy giảm khả năng đi lại của người nộp đơn, để xin bảng số hoặc thẻ treo (hangtag) dành cho người suy giảm khả năng đi lại.",
  "dpsmv-1606":
    "Bản khai số dặm (odometer) theo luật tiểu bang và liên bang, ghi lại số dặm của xe khi chuyển quyền sở hữu.",
};

/** Per-locale description overrides. English uses the library source directly. */
const descriptions: Partial<Record<Locale, Partial<Record<FormSlug, string>>>> = {
  es,
  vi,
};

/** All public forms, localized, in catalog order. */
export function getLocalizedPublicForms(locale: Locale): LocalizedForm[] {
  const table = descriptions[locale];
  return publicForms.map((form) => ({
    slug: form.slug,
    number: form.number,
    title: form.title,
    file: form.file,
    description: table?.[form.slug] ?? form.description,
  }));
}
