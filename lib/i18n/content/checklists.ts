/**
 * Localized "what to bring" checklists.
 *
 * English stays the single source of truth in lib/checklists.ts (it also feeds
 * the staff console and SEO, which are English). This module overlays the
 * Spanish text, keyed by the same slugs and item ids, and a resolver returns a
 * fully localized copy for the customer UI. A missing Spanish key falls back to
 * the English original, so the site never shows a blank.
 *
 * Adding a language: add its block to `overrides` below.
 */
import {
  getTransactionPath,
  transactionPaths,
  type TransactionPath,
} from "@/lib/checklists";
import type { Locale } from "../config";

export interface LocalizedChecklistItem {
  id: string;
  label: string;
  detail?: string;
}

export interface LocalizedTransactionPath {
  slug: string;
  label: string;
  blurb: string;
  items: LocalizedChecklistItem[];
}

interface ChecklistOverride {
  label: string;
  blurb: string;
  /** Item id -> translated label/detail. */
  items: Record<string, { label: string; detail?: string }>;
}

const es: Record<string, ChecklistOverride> = {
  "title-transfer": {
    label: "Transferencia de título",
    blurb: "Comprar o vender un vehículo usado entre particulares.",
    items: {
      "title-signed": {
        label: "El título del vehículo, firmado a su favor",
        detail:
          "El vendedor completa la sección de cesión o transferencia al reverso.",
      },
      "bill-of-sale": {
        label: "Una factura de venta",
        detail:
          "Que muestre el precio, la fecha y a ambas partes. Podemos notarizarla.",
      },
      "photo-id": {
        label: "Su identificación con foto",
        detail: "Licencia de conducir o identificación estatal de Luisiana.",
      },
      insurance: {
        label: "Comprobante de seguro de Luisiana",
        detail: "Cobertura de responsabilidad civil vigente a su nombre.",
      },
      odometer: {
        label: "Declaración del odómetro",
        detail:
          "Requerida para la mayoría de los vehículos de menos de 20 años.",
      },
    },
  },
  "new-to-louisiana": {
    label: "Recién llegado a Luisiana",
    blurb: "Registrar un vehículo que trae de otro estado.",
    items: {
      "oos-title": {
        label: "Su título de otro estado",
        detail:
          "Si está financiado, traiga el nombre de su acreedor y el número de cuenta.",
      },
      "oos-registration": { label: "Su registro vigente de otro estado" },
      "photo-id": { label: "Su identificación con foto" },
      insurance: { label: "Comprobante de seguro de Luisiana" },
      vin: {
        label: "El vehículo, para una revisión del VIN",
        detail:
          "Algunas transferencias requieren una verificación física del VIN y del odómetro.",
      },
    },
  },
  "duplicate-title": {
    label: "Título duplicado",
    blurb: "Reemplazar un título de Luisiana perdido, robado o dañado.",
    items: {
      "photo-id": { label: "Su identificación con foto" },
      "vehicle-info": {
        label: "Los datos de su vehículo",
        detail: "El VIN, el número de placa o el número del título anterior.",
      },
      affidavit: {
        label: "El motivo del reemplazo",
        detail:
          "Podemos notarizar una declaración jurada de pérdida o robo en el momento.",
      },
      "lien-release": {
        label: "Una liberación de gravamen, si aplica",
        detail: "Tráigala si se pagó un préstamo sobre el vehículo.",
      },
    },
  },
  "inherited-vehicle": {
    label: "Vehículo heredado",
    blurb: "Transferir un vehículo después del fallecimiento del propietario.",
    items: {
      title: { label: "El título del vehículo" },
      "death-cert": { label: "Un certificado de defunción certificado" },
      succession: {
        label: "Documentos de sucesión o de herederos",
        detail:
          "Un auto de posesión judicial, o una declaración jurada de herederos para sucesiones que califiquen.",
      },
      "heir-id": { label: "La identificación con foto del heredero" },
      insurance: { label: "Comprobante de seguro de Luisiana" },
    },
  },
  "registration-renewal": {
    label: "Renovación del registro",
    blurb: "Renovar el registro de un vehículo que ya tiene.",
    items: {
      "renewal-notice": { label: "Su aviso de renovación o su registro vigente" },
      "photo-id": { label: "Su identificación con foto" },
      insurance: { label: "Comprobante de seguro vigente" },
      "plate-number": { label: "El número de su placa" },
    },
  },
  plates: {
    label: "Placas",
    blurb: "Transferir, reemplazar o pedir placas especializadas.",
    items: {
      "photo-id": { label: "Su identificación con foto" },
      registration: { label: "Su registro vigente" },
      "existing-plate": {
        label: "Su placa actual",
        detail: "Necesaria para una transferencia o reemplazo de placa.",
      },
      insurance: { label: "Comprobante de seguro" },
    },
  },
  notary: {
    label: "Notaría",
    blurb: "Notarizar actos, declaraciones juradas y autorizaciones.",
    items: {
      documents: {
        label: "El o los documentos a notarizar",
        detail: "Deje la firma en blanco. Firme frente al notario.",
      },
      "signer-id": {
        label: "Identificación con foto válida para cada firmante",
      },
      "signers-present": { label: "Todos los firmantes, presentes en persona" },
    },
  },
};

const vi: Record<string, ChecklistOverride> = {
  "title-transfer": {
    label: "Chuyển nhượng giấy chủ quyền xe",
    blurb: "Mua hoặc bán xe đã qua sử dụng giữa các cá nhân.",
    items: {
      "title-signed": {
        label: "Giấy chủ quyền xe, đã ký sang tên cho quý khách",
        detail: "Người bán điền phần sang nhượng hoặc chuyển nhượng ở mặt sau.",
      },
      "bill-of-sale": {
        label: "Giấy mua bán",
        detail:
          "Ghi rõ giá, ngày và cả hai bên. Chúng tôi có thể công chứng giúp.",
      },
      "photo-id": {
        label: "Giấy tờ tùy thân có ảnh của quý khách",
        detail: "Bằng lái xe hoặc thẻ căn cước tiểu bang Louisiana.",
      },
      insurance: {
        label: "Bằng chứng bảo hiểm Louisiana",
        detail: "Bảo hiểm trách nhiệm dân sự còn hiệu lực mang tên quý khách.",
      },
      odometer: {
        label: "Khai báo số dặm (odometer)",
        detail: "Bắt buộc với hầu hết các xe dưới 20 năm tuổi.",
      },
    },
  },
  "new-to-louisiana": {
    label: "Mới chuyển đến Louisiana",
    blurb: "Đăng ký xe mang từ tiểu bang khác đến.",
    items: {
      "oos-title": {
        label: "Giấy chủ quyền xe từ tiểu bang khác của quý khách",
        detail: "Nếu xe đang trả góp, mang theo tên bên cho vay và số tài khoản.",
      },
      "oos-registration": {
        label: "Giấy đăng ký còn hiệu lực từ tiểu bang khác của quý khách",
      },
      "photo-id": { label: "Giấy tờ tùy thân có ảnh của quý khách" },
      insurance: { label: "Bằng chứng bảo hiểm Louisiana" },
      vin: {
        label: "Chiếc xe, để kiểm tra số VIN",
        detail: "Một số trường hợp cần kiểm tra trực tiếp số VIN và số dặm.",
      },
    },
  },
  "duplicate-title": {
    label: "Cấp lại giấy chủ quyền xe",
    blurb: "Thay thế giấy chủ quyền xe Louisiana bị mất, bị đánh cắp hoặc hư hỏng.",
    items: {
      "photo-id": { label: "Giấy tờ tùy thân có ảnh của quý khách" },
      "vehicle-info": {
        label: "Thông tin chiếc xe của quý khách",
        detail: "Số VIN, số bảng số hoặc số giấy chủ quyền cũ.",
      },
      affidavit: {
        label: "Lý do cần cấp lại",
        detail:
          "Chúng tôi có thể công chứng bản khai hữu thệ về việc mất hoặc bị đánh cắp ngay tại chỗ.",
      },
      "lien-release": {
        label: "Giấy giải chấp, nếu có",
        detail: "Mang theo nếu khoản vay trên xe đã được trả hết.",
      },
    },
  },
  "inherited-vehicle": {
    label: "Xe thừa kế",
    blurb: "Chuyển nhượng xe sau khi chủ xe qua đời.",
    items: {
      title: { label: "Giấy chủ quyền xe" },
      "death-cert": { label: "Giấy chứng tử có công chứng" },
      succession: {
        label: "Giấy tờ thừa kế di sản hoặc xác nhận người thừa kế",
        detail:
          "Phán quyết về quyền sở hữu của tòa, hoặc bản khai hữu thệ về quyền thừa kế cho những trường hợp di sản đủ điều kiện.",
      },
      "heir-id": { label: "Giấy tờ tùy thân có ảnh của người thừa kế" },
      insurance: { label: "Bằng chứng bảo hiểm Louisiana" },
    },
  },
  "registration-renewal": {
    label: "Gia hạn đăng ký xe",
    blurb: "Gia hạn đăng ký cho chiếc xe quý khách đang có.",
    items: {
      "renewal-notice": {
        label: "Thông báo gia hạn hoặc giấy đăng ký còn hiệu lực của quý khách",
      },
      "photo-id": { label: "Giấy tờ tùy thân có ảnh của quý khách" },
      insurance: { label: "Bằng chứng bảo hiểm còn hiệu lực" },
      "plate-number": { label: "Số bảng số xe của quý khách" },
    },
  },
  plates: {
    label: "Bảng số xe",
    blurb: "Chuyển, thay thế hoặc đặt bảng số đặc biệt.",
    items: {
      "photo-id": { label: "Giấy tờ tùy thân có ảnh của quý khách" },
      registration: { label: "Giấy đăng ký còn hiệu lực của quý khách" },
      "existing-plate": {
        label: "Bảng số hiện tại của quý khách",
        detail: "Cần thiết khi chuyển hoặc thay thế bảng số.",
      },
      insurance: { label: "Bằng chứng bảo hiểm" },
    },
  },
  notary: {
    label: "Công chứng",
    blurb: "Công chứng văn bản, bản khai hữu thệ và giấy ủy quyền.",
    items: {
      documents: {
        label: "(Các) giấy tờ cần công chứng",
        detail: "Để trống phần chữ ký. Ký trước mặt công chứng viên.",
      },
      "signer-id": {
        label: "Giấy tờ tùy thân có ảnh hợp lệ cho mỗi người ký",
      },
      "signers-present": { label: "Tất cả người ký, có mặt trực tiếp" },
    },
  },
};

/** Per-locale override tables. English uses the lib source directly. */
const overrides: Partial<Record<Locale, Record<string, ChecklistOverride>>> = {
  es,
  vi,
};

function localize(
  path: TransactionPath,
  locale: Locale,
): LocalizedTransactionPath {
  const table = overrides[locale];
  const o = table?.[path.slug];
  return {
    slug: path.slug,
    label: o?.label ?? path.label,
    blurb: o?.blurb ?? path.blurb,
    items: path.items.map((item) => {
      const io = o?.items[item.id];
      return {
        id: item.id,
        label: io?.label ?? item.label,
        detail: io?.detail ?? item.detail,
      };
    }),
  };
}

/** All transactions, localized, in the canonical order. */
export function getLocalizedPaths(locale: Locale): LocalizedTransactionPath[] {
  return transactionPaths.map((path) => localize(path, locale));
}

/** One transaction by slug, localized, or undefined if the slug is unknown. */
export function getLocalizedPath(
  slug: string,
  locale: Locale,
): LocalizedTransactionPath | undefined {
  const path = getTransactionPath(slug);
  return path ? localize(path, locale) : undefined;
}

/** A transaction's localized label, with a caller-supplied fallback. */
export function localizedServiceLabel(
  slug: string,
  locale: Locale,
  fallback: string,
): string {
  return getLocalizedPath(slug, locale)?.label ?? fallback;
}
