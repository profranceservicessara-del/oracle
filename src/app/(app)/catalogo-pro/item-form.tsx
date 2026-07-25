"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormModal } from "@/components/ui/form-modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import { itemSchema, type ItemInput } from "./validation";
import {
  formatPrice,
  ITEM_KIND_LABELS,
  UNIT_LABELS,
  type AccountingCode,
  type CatalogProItem,
  type ItemCategory,
  type ItemKind,
  type PriceAmountMode
} from "./types";

// Legado da tabela catalog_items: a coluna `categorie` (vente/service_bic/
// service_bnc) é usada pelo editor de faturas para cálculos URSSAF. Não
// removemos: escolhemos default coerente ao kind e deixamos o usuário mudar
// no CRM antigo se precisar (o form aqui esconde a escolha, mas mantém).
function defaultLegacyCategoryFor(kind: ItemKind): "vente" | "service_bic" | "service_bnc" {
  return kind === "product" ? "vente" : "service_bic";
}

type FormState = {
  designation: string;
  reference: string;
  description: string;
  append_name_to_description: boolean;
  usual_quantity: string;
  unite: string;
  category_id: string;
  prix_unitaire_ht: string;
  price_amount_mode: PriceAmountMode;
  vat_rate: string;
  purchase_price_excl_vat: string;
  sales_accounting_code: string;
  purchase_accounting_code: string;
};

function makeEmptyForm(kind: ItemKind): FormState {
  return {
    designation: "",
    reference: "",
    description: "",
    append_name_to_description: false,
    usual_quantity: "1",
    unite: kind === "product" ? "unit" : "hour",
    category_id: "",
    prix_unitaire_ht: "0",
    price_amount_mode: "ht",
    vat_rate: "0",
    purchase_price_excl_vat: "0",
    sales_accounting_code: kind === "product" ? "707000" : "706000",
    purchase_accounting_code: "601000"
  };
}

function toFormState(item: CatalogProItem): FormState {
  return {
    designation: item.designation,
    reference: item.reference ?? "",
    description: item.description ?? "",
    append_name_to_description: !!item.append_name_to_description,
    usual_quantity: String(item.usual_quantity ?? 1),
    unite: item.unite || "unit",
    category_id: item.category_id ?? "",
    prix_unitaire_ht: String(item.prix_unitaire_ht ?? 0),
    price_amount_mode: (item.price_amount_mode ?? "ht") as PriceAmountMode,
    vat_rate: String(item.vat_rate ?? 0),
    purchase_price_excl_vat: String(item.purchase_price_excl_vat ?? 0),
    sales_accounting_code: item.sales_accounting_code ?? "",
    purchase_accounting_code: item.purchase_accounting_code ?? ""
  };
}

export function ItemForm({
  isOpen,
  editing,
  duplicating,
  kind,
  categories,
  accountingCodes,
  userId,
  onClose,
  onSaved
}: {
  isOpen: boolean;
  editing: CatalogProItem | null;
  duplicating: CatalogProItem | null;
  kind: ItemKind;
  categories: ItemCategory[];
  accountingCodes: AccountingCode[];
  userId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const { showToast } = useToast();
  const [form, setForm] = useState<FormState>(makeEmptyForm(kind));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (editing) {
      setForm(toFormState(editing));
    } else if (duplicating) {
      const base = toFormState(duplicating);
      // Duplicar: nome recebe "(cópia)" e a referência é limpa (unique-friendly).
      setForm({ ...base, designation: `${base.designation} (cópia)`, reference: "" });
    } else {
      setForm(makeEmptyForm(kind));
    }
    setErrors({});
  }, [isOpen, editing, duplicating, kind]);

  const salesCodes = accountingCodes.filter((c) => c.code.startsWith("7"));
  const purchaseCodes = accountingCodes.filter((c) => c.code.startsWith("6"));

  // Preço TTC calculado ao vivo a partir do modo escolhido.
  const previewHtTtc = (() => {
    const price = Number(form.prix_unitaire_ht) || 0;
    const vat = Number(form.vat_rate) || 0;
    const factor = 1 + vat / 100;
    if (form.price_amount_mode === "ttc") {
      const ht = factor > 0 ? price / factor : price;
      return { ht, ttc: price };
    }
    return { ht: price, ttc: price * factor };
  })();

  async function save() {
    const parsed = itemSchema.safeParse({
      item_kind: kind,
      designation: form.designation,
      reference: form.reference,
      description: form.description,
      append_name_to_description: form.append_name_to_description,
      usual_quantity: form.usual_quantity,
      unite: form.unite,
      category_id: form.category_id || null,
      prix_unitaire_ht: form.prix_unitaire_ht,
      price_amount_mode: form.price_amount_mode,
      vat_rate: form.vat_rate,
      purchase_price_excl_vat: form.purchase_price_excl_vat,
      sales_accounting_code: form.sales_accounting_code,
      purchase_accounting_code: form.purchase_accounting_code,
      categorie: editing?.categorie ?? defaultLegacyCategoryFor(kind)
    });

    if (!parsed.success) {
      const next: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        next[issue.path[0]?.toString() ?? "form"] = issue.message;
      });
      setErrors(next);
      return;
    }

    setSaving(true);
    const data: ItemInput = parsed.data;
    const payload = {
      user_id: userId,
      designation: data.designation,
      description: data.description,
      prix_unitaire_ht: data.prix_unitaire_ht,
      unite: data.unite,
      categorie: data.categorie,
      item_kind: data.item_kind,
      reference: data.reference,
      vat_rate: data.vat_rate,
      price_amount_mode: data.price_amount_mode,
      purchase_price_excl_vat: data.purchase_price_excl_vat,
      sales_accounting_code: data.sales_accounting_code,
      purchase_accounting_code: data.purchase_accounting_code,
      category_id: data.category_id,
      usual_quantity: data.usual_quantity,
      append_name_to_description: data.append_name_to_description
    };

    // Regra: upsert por reference se a referência já existir para este user
    // (e não estamos editando o próprio item). Senão insert/update simples.
    if (editing) {
      const { error } = await supabase
        .from("catalog_items")
        .update(payload)
        .eq("id", editing.id);
      if (error) {
        setSaving(false);
        showToast("Não foi possível salvar o item.", "error");
        return;
      }
    } else {
      let existingId: string | null = null;
      if (payload.reference) {
        const { data: found } = await supabase
          .from("catalog_items")
          .select("id")
          .eq("user_id", userId)
          .eq("reference", payload.reference)
          .maybeSingle();
        existingId = (found as { id: string } | null)?.id ?? null;
      }
      const request = existingId
        ? supabase.from("catalog_items").update(payload).eq("id", existingId)
        : supabase.from("catalog_items").insert(payload);
      const { error } = await request;
      if (error) {
        setSaving(false);
        showToast("Não foi possível salvar o item.", "error");
        return;
      }
      if (existingId) {
        showToast("Item com essa referência já existia. Atualizado.", "info");
      }
    }

    setSaving(false);
    showToast(editing ? "Item atualizado." : "Item criado.", "success");
    onClose();
    onSaved();
  }

  const kindLabel = ITEM_KIND_LABELS[kind];
  const title = editing ? `Editar ${kindLabel.toLowerCase()}` : `Novo ${kindLabel.toLowerCase()}`;

  return (
    <FormModal
      description="Fotos e especificações da ficha ficam para depois; use as abas Categorias e Variações para o resto."
      isOpen={isOpen}
      onClose={onClose}
      title={title}
    >
      <form
        className="grid gap-6"
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        {/* Informações ------------------------------------------------- */}
        <section className="grid gap-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Informações
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-ink">
              Referência
              <Input
                className="mt-2"
                onChange={(e) => setForm({ ...form, reference: e.target.value })}
                placeholder="Ex.: SKU-001"
                value={form.reference}
              />
              {errors.reference ? (
                <span className="mt-1 block text-xs text-rose-600">{errors.reference}</span>
              ) : null}
            </label>
            <label className="text-sm font-medium text-ink">
              Nome comercial
              <Input
                className="mt-2"
                onChange={(e) => setForm({ ...form, designation: e.target.value })}
                value={form.designation}
              />
              {errors.designation ? (
                <span className="mt-1 block text-xs text-rose-600">{errors.designation}</span>
              ) : null}
            </label>
          </div>
          <label className="text-sm font-medium text-ink">
            Descrição
            <Textarea
              className="mt-2"
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              value={form.description}
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              checked={form.append_name_to_description}
              onChange={(e) =>
                setForm({ ...form, append_name_to_description: e.target.checked })
              }
              type="checkbox"
            />
            Adicionar nome comercial à descrição nos documentos
          </label>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="text-sm font-medium text-ink">
              Quantidade usual
              <Input
                className="mt-2"
                min="0"
                onChange={(e) => setForm({ ...form, usual_quantity: e.target.value })}
                step="0.01"
                type="number"
                value={form.usual_quantity}
              />
              {errors.usual_quantity ? (
                <span className="mt-1 block text-xs text-rose-600">{errors.usual_quantity}</span>
              ) : null}
            </label>
            <label className="text-sm font-medium text-ink">
              Unidade
              <Select
                className="mt-2"
                onChange={(e) => setForm({ ...form, unite: e.target.value })}
                value={form.unite}
              >
                {Object.entries(UNIT_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </Select>
              {errors.unite ? (
                <span className="mt-1 block text-xs text-rose-600">{errors.unite}</span>
              ) : null}
            </label>
            <label className="text-sm font-medium text-ink">
              Categoria
              <Select
                className="mt-2"
                onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                value={form.category_id}
              >
                <option value="">Sem categoria</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </label>
          </div>
        </section>

        {/* Preços ------------------------------------------------------ */}
        <section className="grid gap-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Preços</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="text-sm font-medium text-ink">
              Preço de referência
              <Input
                className="mt-2"
                min="0"
                onChange={(e) => setForm({ ...form, prix_unitaire_ht: e.target.value })}
                step="0.01"
                type="number"
                value={form.prix_unitaire_ht}
              />
              {errors.prix_unitaire_ht ? (
                <span className="mt-1 block text-xs text-rose-600">{errors.prix_unitaire_ht}</span>
              ) : null}
            </label>
            <label className="text-sm font-medium text-ink">
              TVA (%)
              <Input
                className="mt-2"
                max="100"
                min="0"
                onChange={(e) => setForm({ ...form, vat_rate: e.target.value })}
                step="0.01"
                type="number"
                value={form.vat_rate}
              />
              {errors.vat_rate ? (
                <span className="mt-1 block text-xs text-rose-600">{errors.vat_rate}</span>
              ) : null}
            </label>
            <label className="text-sm font-medium text-ink">
              Preço de compra HT
              <Input
                className="mt-2"
                min="0"
                onChange={(e) => setForm({ ...form, purchase_price_excl_vat: e.target.value })}
                step="0.01"
                type="number"
                value={form.purchase_price_excl_vat}
              />
              {errors.purchase_price_excl_vat ? (
                <span className="mt-1 block text-xs text-rose-600">
                  {errors.purchase_price_excl_vat}
                </span>
              ) : null}
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              checked={form.price_amount_mode === "ht"}
              onChange={(e) =>
                setForm({ ...form, price_amount_mode: e.target.checked ? "ht" : "ttc" })
              }
              type="checkbox"
            />
            Valor de referência expresso em HT (desmarque para TTC)
          </label>
          <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600 ring-1 ring-inset ring-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>Prévia dos valores</span>
              <span className="tabular-nums">
                HT {formatPrice(previewHtTtc.ht)} · TTC {formatPrice(previewHtTtc.ttc)}
              </span>
            </div>
          </div>
        </section>

        {/* Contabilidade ---------------------------------------------- */}
        <section className="grid gap-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Contabilidade
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-ink">
              Código contábil de venda (7xx)
              <Select
                className="mt-2"
                onChange={(e) => setForm({ ...form, sales_accounting_code: e.target.value })}
                value={form.sales_accounting_code}
              >
                <option value="">Sem código</option>
                {salesCodes.map((c) => (
                  <option key={c.id} value={c.code}>
                    {c.code} · {c.label}
                  </option>
                ))}
              </Select>
            </label>
            <label className="text-sm font-medium text-ink">
              Código contábil de compra (6xx)
              <Select
                className="mt-2"
                onChange={(e) => setForm({ ...form, purchase_accounting_code: e.target.value })}
                value={form.purchase_accounting_code}
              >
                <option value="">Sem código</option>
                {purchaseCodes.map((c) => (
                  <option key={c.id} value={c.code}>
                    {c.code} · {c.label}
                  </option>
                ))}
              </Select>
            </label>
          </div>
        </section>

        {/*
          TODO: Fotos (item_photos, bucket 'item-media') e especificações
          (item_specifications) ficam para a próxima rodada. Deixar TODO
          consciente aqui em vez de esconder a decisão.
        */}

        <div className="flex justify-end gap-2">
          <Button onClick={onClose} type="button" variant="secondary">
            Cancelar
          </Button>
          <Button disabled={saving} type="submit">
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </form>
    </FormModal>
  );
}
