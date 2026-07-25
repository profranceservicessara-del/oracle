// Tipos e constantes do módulo Catálogo pro. Espelham as tabelas estendidas
// em catalog_items + as tabelas novas da migration 20260727120000_catalog_pro.
// Não inventa colunas: só o que existe no banco.

import type { ActivityCategory } from "@/lib/types";

export type ItemKind = "product" | "service";
export type PriceAmountMode = "ht" | "ttc";

// Row completa de catalog_items (base antiga + colunas novas do catalog_pro).
// Mantém compat com CatalogItem em @/lib/types (base antiga é subset disso).
export type CatalogProItem = {
  id: string;
  user_id: string;
  designation: string;
  description: string | null;
  prix_unitaire_ht: number;
  unite: string;
  categorie: ActivityCategory;
  archived: boolean;
  created_at: string;
  updated_at: string;
  // Novas
  item_kind: ItemKind;
  reference: string | null;
  barcode: string | null;
  vat_rate: number;
  price_amount_mode: PriceAmountMode;
  purchase_price_excl_vat: number;
  sales_accounting_code: string | null;
  purchase_accounting_code: string | null;
  category_id: string | null;
  has_variants: boolean;
  usual_quantity: number;
  append_name_to_description: boolean;
  note: string | null;
};

export type ItemCategory = {
  id: string;
  user_id: string;
  parent_id: string | null;
  name: string;
  position: number;
  created_at: string;
};

export type VariantAxis = {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
};

export type VariantValue = {
  id: string;
  user_id: string;
  axis_id: string;
  value: string;
  position: number;
  created_at: string;
};

export type ItemVariant = {
  id: string;
  user_id: string;
  item_id: string;
  sku: string | null;
  barcode: string | null;
  reference_price: number | null;
  purchase_price_excl_vat: number | null;
  is_archived: boolean;
  created_at: string;
};

export type PriceList = {
  id: string;
  user_id: string;
  name: string;
  amount_mode: PriceAmountMode;
  created_at: string;
};

export type ItemPrice = {
  id: string;
  user_id: string;
  item_id: string;
  variant_id: string | null;
  price_list_id: string;
  price: number;
  created_at: string;
};

export type ItemPhoto = {
  id: string;
  user_id: string;
  item_id: string;
  storage_path: string;
  position: number;
  is_default: boolean;
  created_at: string;
};

export type ItemFile = {
  id: string;
  user_id: string;
  item_id: string;
  storage_path: string;
  filename: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
};

export type ItemSpecification = {
  id: string;
  user_id: string;
  item_id: string;
  label: string;
  value: string | null;
  is_default: boolean;
  created_at: string;
};

export type PromotionKind = "catalog" | "promo_code";
export type PromotionStatus = "scheduled" | "active" | "expired" | "disabled";
export type DiscountType = "percent" | "fixed_amount" | "fixed_price";

export type Promotion = {
  id: string;
  user_id: string;
  kind: PromotionKind;
  name: string;
  description: string | null;
  insert_note_in_documents: boolean;
  starts_at: string | null;
  ends_at: string | null;
  never_expires: boolean;
  usable_on_sales_documents: boolean;
  status: PromotionStatus;
  code: string | null;
  discount_type: DiscountType;
  discount_value: number;
  created_at: string;
  updated_at: string;
};

export type PromotionTargetType = "item" | "category" | "all";

export type PromotionTarget = {
  id: string;
  user_id: string;
  promotion_id: string;
  target_type: PromotionTargetType;
  target_id: string | null;
  created_at: string;
};

export type AccountingCode = {
  id: string;
  code: string;
  label: string;
  is_active: boolean;
};

// ==== Rótulos e helpers de UI ============================================

// Unidades usuais. Chave fica em inglês (bate com a nomenclatura do banco),
// rótulo em pt-BR aparece na UI.
export const UNIT_LABELS: Record<string, string> = {
  unit: "Unidade",
  flat_rate: "Forfait",
  m2: "m²",
  kg: "kg",
  meter: "Metro",
  day: "Dia",
  hour: "Hora",
  minute: "Minuto"
};

export const ITEM_KIND_LABELS: Record<ItemKind, string> = {
  product: "Produto",
  service: "Serviço"
};

export const PRICE_MODE_LABELS: Record<PriceAmountMode, string> = {
  ht: "HT",
  ttc: "TTC"
};

export const PROMOTION_KIND_LABELS: Record<PromotionKind, string> = {
  catalog: "Catálogo",
  promo_code: "Código promocional"
};

export const PROMOTION_STATUS_META: Record<
  PromotionStatus,
  { label: string; badge: string }
> = {
  scheduled: { label: "Agendada", badge: "bg-sky-50 text-sky-700 ring-sky-200" },
  active: { label: "Ativa", badge: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  expired: { label: "Expirada", badge: "bg-slate-100 text-slate-600 ring-slate-200" },
  disabled: { label: "Desativada", badge: "bg-rose-50 text-rose-700 ring-rose-200" }
};

export const DISCOUNT_TYPE_LABELS: Record<DiscountType, string> = {
  percent: "Percentual (%)",
  fixed_amount: "Valor fixo (€)",
  fixed_price: "Preço fixo (€)"
};

// Helper de moeda EUR em pt-BR. Único ponto de formatação de preço.
export const eurFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "EUR"
});

export function formatPrice(value: number | null | undefined): string {
  return eurFormatter.format(Number(value ?? 0));
}

// Calcula status derivado da promoção a partir de datas + flag disabled.
// Regra: se explicitamente disabled, prevalece; senão janela por now.
export function computePromotionStatus(
  input: {
    starts_at: string | null;
    ends_at: string | null;
    never_expires: boolean;
    // Se a promoção estiver marcada como disabled manualmente, retorne
    // "disabled" antes de chamar essa função (não temos flag separada).
  },
  now: Date = new Date()
): Exclude<PromotionStatus, "disabled"> {
  const start = input.starts_at ? new Date(input.starts_at) : null;
  const end = input.ends_at ? new Date(input.ends_at) : null;
  if (start && now < start) return "scheduled";
  if (input.never_expires) return "active";
  if (end && now <= end) return "active";
  if (end && now > end) return "expired";
  // Sem data de início nem fim informados: considera ativa (usável já).
  return "active";
}
