// Schemas Zod do módulo Catálogo pro. Compartilhados pelos formulários da UI.
// Valores monetários coagidos p/ number; strings vazias tratadas como opcionais.
import { z } from "zod";

const emptyToNull = (v: unknown) => (v === "" || v === undefined ? null : v);
const nullableString = z.preprocess(emptyToNull, z.string().trim().max(500).nullable());
const nullableUuid = z.preprocess(emptyToNull, z.string().uuid().nullable());

export const itemSchema = z.object({
  item_kind: z.enum(["product", "service"]),
  designation: z.string().trim().min(1, "Informe o nome do item.").max(240),
  reference: z.preprocess(emptyToNull, z.string().trim().max(120).nullable()),
  description: nullableString,
  append_name_to_description: z.coerce.boolean().default(false),
  usual_quantity: z.coerce.number().nonnegative("Quantidade inválida.").default(1),
  unite: z.string().trim().min(1, "Escolha uma unidade.").max(40),
  category_id: nullableUuid,
  // Preços
  prix_unitaire_ht: z.coerce.number("Preço inválido.").nonnegative("Preço inválido.").default(0),
  price_amount_mode: z.enum(["ht", "ttc"]).default("ht"),
  vat_rate: z.coerce.number().min(0, "Taxa inválida.").max(100, "Taxa inválida.").default(0),
  purchase_price_excl_vat: z.coerce.number().nonnegative("Preço inválido.").default(0),
  // Contabilidade
  sales_accounting_code: z.preprocess(emptyToNull, z.string().trim().max(20).nullable()),
  purchase_accounting_code: z.preprocess(emptyToNull, z.string().trim().max(20).nullable()),
  // Categorie legado (necessário p/ compat com catalog_items usada em faturas)
  categorie: z.enum(["vente", "service_bic", "service_bnc"]).default("vente")
});

export type ItemInput = z.infer<typeof itemSchema>;

export const categorySchema = z.object({
  name: z.string().trim().min(1, "Informe o nome da categoria.").max(120),
  parent_id: nullableUuid,
  position: z.coerce.number().int().nonnegative().default(0)
});
export type CategoryInput = z.infer<typeof categorySchema>;

export const variantAxisSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome do eixo.").max(120)
});
export type VariantAxisInput = z.infer<typeof variantAxisSchema>;

export const variantValueSchema = z.object({
  axis_id: z.string().uuid("Escolha um eixo."),
  value: z.string().trim().min(1, "Informe o valor.").max(120),
  position: z.coerce.number().int().nonnegative().default(0)
});
export type VariantValueInput = z.infer<typeof variantValueSchema>;

export const priceListSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome da lista.").max(120),
  amount_mode: z.enum(["ht", "ttc"]).default("ht")
});
export type PriceListInput = z.infer<typeof priceListSchema>;

// Alvo de promoção. target_id só é obrigatório quando target_type !== 'all'.
export const promotionTargetSchema = z
  .object({
    target_type: z.enum(["item", "category", "all"]),
    target_id: nullableUuid
  })
  .refine((v) => (v.target_type === "all" ? true : !!v.target_id), {
    message: "Selecione o alvo.",
    path: ["target_id"]
  });
export type PromotionTargetInput = z.infer<typeof promotionTargetSchema>;

export const promotionSchema = z
  .object({
    name: z.string().trim().min(1, "Informe o nome da promoção.").max(160),
    description: nullableString,
    kind: z.enum(["catalog", "promo_code"]).default("catalog"),
    code: z.preprocess(emptyToNull, z.string().trim().max(60).nullable()),
    insert_note_in_documents: z.coerce.boolean().default(true),
    usable_on_sales_documents: z.coerce.boolean().default(true),
    starts_at: z.preprocess(emptyToNull, z.string().nullable()),
    ends_at: z.preprocess(emptyToNull, z.string().nullable()),
    never_expires: z.coerce.boolean().default(false),
    discount_type: z.enum(["percent", "fixed_amount", "fixed_price"]).default("percent"),
    discount_value: z.coerce.number().nonnegative("Valor inválido.").default(0)
  })
  .refine((v) => (v.kind === "promo_code" ? !!v.code && v.code.trim().length > 0 : true), {
    message: "Informe o código promocional.",
    path: ["code"]
  })
  .refine((v) => v.never_expires || !!v.ends_at, {
    message: "Informe a data de expiração ou marque 'nunca expira'.",
    path: ["ends_at"]
  });
export type PromotionInput = z.infer<typeof promotionSchema>;
