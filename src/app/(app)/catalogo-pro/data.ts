// Helpers server-side de carregamento do módulo Catálogo pro. Escopo garantido
// por RLS (user_id = auth.uid()). Redireciona ao login se não houver sessão.
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type {
  AccountingCode,
  CatalogProItem,
  ItemCategory,
  ItemKind,
  PriceList,
  Promotion,
  PromotionTarget,
  VariantAxis,
  VariantValue
} from "./types";

export async function requireUserId(): Promise<{ userId: string }> {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }
  return { userId: user.id };
}

export type ItemsFilter = {
  kind?: ItemKind;
  categoryId?: string;
  archived?: boolean;
};

export async function loadItems(
  userId: string,
  filter: ItemsFilter = {}
): Promise<CatalogProItem[]> {
  const supabase = createClient();
  let query = supabase
    .from("catalog_items")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (filter.kind) query = query.eq("item_kind", filter.kind);
  if (filter.categoryId) query = query.eq("category_id", filter.categoryId);
  if (typeof filter.archived === "boolean") query = query.eq("archived", filter.archived);

  const { data } = await query;
  return (data ?? []) as CatalogProItem[];
}

export async function loadCategories(userId: string): Promise<ItemCategory[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("item_categories")
    .select("*")
    .eq("user_id", userId)
    .order("position", { ascending: true })
    .order("name", { ascending: true });
  return (data ?? []) as ItemCategory[];
}

export async function loadVariantAxes(userId: string): Promise<VariantAxis[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("variant_axes")
    .select("*")
    .eq("user_id", userId)
    .order("name", { ascending: true });
  return (data ?? []) as VariantAxis[];
}

export async function loadVariantValues(userId: string): Promise<VariantValue[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("variant_values")
    .select("*")
    .eq("user_id", userId)
    .order("position", { ascending: true });
  return (data ?? []) as VariantValue[];
}

export async function loadPriceLists(userId: string): Promise<PriceList[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("price_lists")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  return (data ?? []) as PriceList[];
}

export async function loadPromotions(userId: string): Promise<Promotion[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("promotions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return (data ?? []) as Promotion[];
}

export async function loadPromotionTargets(userId: string): Promise<PromotionTarget[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("promotion_targets")
    .select("*")
    .eq("user_id", userId);
  return (data ?? []) as PromotionTarget[];
}

// Códigos contábeis 6xx (compra) e 7xx (venda). accounting_codes é global
// (read-only). Filtramos os planos usados pelo catálogo.
export async function loadAccountingCodes(): Promise<AccountingCode[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("accounting_codes")
    .select("id,code,label,is_active")
    .eq("is_active", true)
    .or("code.like.6%,code.like.7%")
    .order("code", { ascending: true });
  return (data ?? []) as AccountingCode[];
}
