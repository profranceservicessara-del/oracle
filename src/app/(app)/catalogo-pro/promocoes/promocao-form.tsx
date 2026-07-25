"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormModal } from "@/components/ui/form-modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import { promotionSchema } from "../validation";
import {
  computePromotionStatus,
  DISCOUNT_TYPE_LABELS,
  type CatalogProItem,
  type DiscountType,
  type ItemCategory,
  type Promotion,
  type PromotionKind,
  type PromotionStatus,
  type PromotionTarget,
  type PromotionTargetType
} from "../types";

type FormState = {
  name: string;
  description: string;
  kind: PromotionKind;
  code: string;
  insert_note_in_documents: boolean;
  usable_on_sales_documents: boolean;
  starts_at: string;
  ends_at: string;
  never_expires: boolean;
  discount_type: DiscountType;
  discount_value: string;
  status: PromotionStatus;
  target_type: PromotionTargetType;
  target_ids: string[];
};

function nowLocalInput(): string {
  const d = new Date();
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0, 16);
}

function isoToLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0, 16);
}

const emptyForm: FormState = {
  name: "",
  description: "",
  kind: "catalog",
  code: "",
  insert_note_in_documents: true,
  usable_on_sales_documents: true,
  starts_at: nowLocalInput(),
  ends_at: "",
  never_expires: false,
  discount_type: "percent",
  discount_value: "0",
  status: "scheduled",
  target_type: "all",
  target_ids: []
};

export function PromocaoForm({
  isOpen,
  editing,
  editingTargets,
  items,
  categories,
  userId,
  onClose,
  onSaved
}: {
  isOpen: boolean;
  editing: Promotion | null;
  editingTargets: PromotionTarget[];
  items: CatalogProItem[];
  categories: ItemCategory[];
  userId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const { showToast } = useToast();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (editing) {
      const firstType = editingTargets[0]?.target_type ?? "all";
      const ids = editingTargets
        .filter((t) => t.target_type !== "all" && t.target_id)
        .map((t) => t.target_id as string);
      setForm({
        name: editing.name,
        description: editing.description ?? "",
        kind: editing.kind,
        code: editing.code ?? "",
        insert_note_in_documents: editing.insert_note_in_documents,
        usable_on_sales_documents: editing.usable_on_sales_documents,
        starts_at: isoToLocalInput(editing.starts_at),
        ends_at: isoToLocalInput(editing.ends_at),
        never_expires: editing.never_expires,
        discount_type: editing.discount_type,
        discount_value: String(editing.discount_value ?? 0),
        status: editing.status,
        target_type: firstType,
        target_ids: ids
      });
    } else {
      setForm(emptyForm);
    }
    setErrors({});
  }, [isOpen, editing, editingTargets]);

  async function save() {
    // Zod primeiro (regras de negócio: code obrigatório se promo_code, etc).
    const parsed = promotionSchema.safeParse({
      name: form.name,
      description: form.description,
      kind: form.kind,
      code: form.kind === "promo_code" ? form.code : null,
      insert_note_in_documents: form.insert_note_in_documents,
      usable_on_sales_documents: form.usable_on_sales_documents,
      starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
      ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
      never_expires: form.never_expires,
      discount_type: form.discount_type,
      discount_value: form.discount_value
    });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        next[issue.path[0]?.toString() ?? "form"] = issue.message;
      });
      setErrors(next);
      return;
    }
    if (form.target_type !== "all" && form.target_ids.length === 0) {
      setErrors({ target_ids: "Selecione ao menos um alvo." });
      return;
    }

    // Status: se o usuário deixou como "disabled" manualmente, mantém.
    // Caso contrário, deriva do janela de datas.
    const derived = computePromotionStatus({
      starts_at: parsed.data.starts_at,
      ends_at: parsed.data.ends_at,
      never_expires: parsed.data.never_expires
    });
    const finalStatus: PromotionStatus =
      form.status === "disabled" ? "disabled" : derived;

    setSaving(true);
    const payload = {
      user_id: userId,
      name: parsed.data.name,
      description: parsed.data.description,
      kind: parsed.data.kind,
      code: parsed.data.code,
      insert_note_in_documents: parsed.data.insert_note_in_documents,
      usable_on_sales_documents: parsed.data.usable_on_sales_documents,
      starts_at: parsed.data.starts_at,
      ends_at: parsed.data.ends_at,
      never_expires: parsed.data.never_expires,
      discount_type: parsed.data.discount_type,
      discount_value: parsed.data.discount_value,
      status: finalStatus
    };

    let promotionId: string | null = editing?.id ?? null;
    if (editing) {
      const { error } = await supabase
        .from("promotions")
        .update(payload)
        .eq("id", editing.id);
      if (error) {
        setSaving(false);
        showToast("Não foi possível salvar a promoção.", "error");
        return;
      }
    } else {
      const { data: created, error } = await supabase
        .from("promotions")
        .insert(payload)
        .select("id")
        .single();
      if (error || !created) {
        setSaving(false);
        showToast("Não foi possível criar a promoção.", "error");
        return;
      }
      promotionId = (created as { id: string }).id;
    }

    if (!promotionId) {
      setSaving(false);
      showToast("Erro ao vincular alvos.", "error");
      return;
    }

    // Alvos: reescrevemos completamente (delete + insert). Mais simples e
    // suficiente para a rodada; RLS garante escopo.
    const { error: delError } = await supabase
      .from("promotion_targets")
      .delete()
      .eq("promotion_id", promotionId);
    if (delError) {
      setSaving(false);
      showToast("Promoção salva, mas houve erro ao atualizar os alvos.", "error");
      return;
    }
    const targets: Array<{
      user_id: string;
      promotion_id: string;
      target_type: PromotionTargetType;
      target_id: string | null;
    }> =
      form.target_type === "all"
        ? [
            {
              user_id: userId,
              promotion_id: promotionId,
              target_type: "all",
              target_id: null
            }
          ]
        : form.target_ids.map((id) => ({
            user_id: userId,
            promotion_id: promotionId as string,
            target_type: form.target_type,
            target_id: id
          }));
    if (targets.length > 0) {
      const { error: insError } = await supabase.from("promotion_targets").insert(targets);
      if (insError) {
        setSaving(false);
        showToast("Promoção salva, mas houve erro ao gravar os alvos.", "error");
        return;
      }
    }

    setSaving(false);
    showToast(editing ? "Promoção atualizada." : "Promoção criada.", "success");
    onClose();
    onSaved();
  }

  const targetOptions =
    form.target_type === "item"
      ? items.map((i) => ({ id: i.id, label: `${i.designation}${i.reference ? ` · ${i.reference}` : ""}` }))
      : form.target_type === "category"
      ? categories.map((c) => ({ id: c.id, label: c.name }))
      : [];

  function toggleTargetId(id: string) {
    setForm((prev) => {
      const set = new Set(prev.target_ids);
      if (set.has(id)) set.delete(id);
      else set.add(id);
      return { ...prev, target_ids: Array.from(set) };
    });
  }

  return (
    <FormModal
      description="Configure a promoção e escolha os alvos (tudo, categorias ou itens específicos)."
      isOpen={isOpen}
      onClose={onClose}
      title={editing ? "Editar promoção" : "Nova promoção"}
    >
      <form
        className="grid gap-6"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <section className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-ink">
              Nome
              <Input
                className="mt-2"
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                value={form.name}
              />
              {errors.name ? (
                <span className="mt-1 block text-xs text-rose-600">{errors.name}</span>
              ) : null}
            </label>
            <label className="text-sm font-medium text-ink">
              Tipo
              <Select
                className="mt-2"
                onChange={(e) => setForm({ ...form, kind: e.target.value as PromotionKind })}
                value={form.kind}
              >
                <option value="catalog">Catálogo (aplica automaticamente)</option>
                <option value="promo_code">Código promocional</option>
              </Select>
            </label>
          </div>
          {form.kind === "promo_code" ? (
            <label className="text-sm font-medium text-ink">
              Código promocional
              <Input
                className="mt-2"
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="Ex.: VERAO25"
                value={form.code}
              />
              {errors.code ? (
                <span className="mt-1 block text-xs text-rose-600">{errors.code}</span>
              ) : null}
            </label>
          ) : null}
          <label className="text-sm font-medium text-ink">
            Descrição
            <Textarea
              className="mt-2"
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              value={form.description}
            />
          </label>
        </section>

        <section className="grid gap-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Vigência
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-ink">
              Início
              <Input
                className="mt-2"
                onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
                type="datetime-local"
                value={form.starts_at}
              />
              {errors.starts_at ? (
                <span className="mt-1 block text-xs text-rose-600">{errors.starts_at}</span>
              ) : null}
            </label>
            <label className="text-sm font-medium text-ink">
              Fim
              <Input
                className="mt-2"
                disabled={form.never_expires}
                onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
                type="datetime-local"
                value={form.ends_at}
              />
              {errors.ends_at ? (
                <span className="mt-1 block text-xs text-rose-600">{errors.ends_at}</span>
              ) : null}
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              checked={form.never_expires}
              onChange={(e) => setForm({ ...form, never_expires: e.target.checked })}
              type="checkbox"
            />
            Nunca expira
          </label>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              checked={form.usable_on_sales_documents}
              onChange={(e) =>
                setForm({ ...form, usable_on_sales_documents: e.target.checked })
              }
              type="checkbox"
            />
            Utilizável em documentos de venda (faturas, orçamentos)
          </label>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              checked={form.insert_note_in_documents}
              onChange={(e) =>
                setForm({ ...form, insert_note_in_documents: e.target.checked })
              }
              type="checkbox"
            />
            Inserir nota da promoção nos documentos
          </label>
          <label className="text-sm font-medium text-ink">
            Status
            <Select
              className="mt-2"
              onChange={(e) => setForm({ ...form, status: e.target.value as PromotionStatus })}
              value={form.status}
            >
              <option value="scheduled">Deixar o sistema calcular (agendada/ativa/expirada)</option>
              <option value="disabled">Desativar manualmente</option>
            </Select>
          </label>
        </section>

        <section className="grid gap-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Desconto
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-ink">
              Tipo de desconto
              <Select
                className="mt-2"
                onChange={(e) =>
                  setForm({ ...form, discount_type: e.target.value as DiscountType })
                }
                value={form.discount_type}
              >
                {Object.entries(DISCOUNT_TYPE_LABELS).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </Select>
            </label>
            <label className="text-sm font-medium text-ink">
              Valor
              <Input
                className="mt-2"
                min="0"
                onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
                step="0.01"
                type="number"
                value={form.discount_value}
              />
              {errors.discount_value ? (
                <span className="mt-1 block text-xs text-rose-600">{errors.discount_value}</span>
              ) : null}
            </label>
          </div>
        </section>

        <section className="grid gap-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Alvos
          </h3>
          <div className="flex flex-wrap gap-3 text-sm text-ink">
            <label className="flex items-center gap-2">
              <input
                checked={form.target_type === "all"}
                name="target_type"
                onChange={() => setForm({ ...form, target_type: "all", target_ids: [] })}
                type="radio"
              />
              Tudo do catálogo
            </label>
            <label className="flex items-center gap-2">
              <input
                checked={form.target_type === "category"}
                name="target_type"
                onChange={() => setForm({ ...form, target_type: "category", target_ids: [] })}
                type="radio"
              />
              Categorias específicas
            </label>
            <label className="flex items-center gap-2">
              <input
                checked={form.target_type === "item"}
                name="target_type"
                onChange={() => setForm({ ...form, target_type: "item", target_ids: [] })}
                type="radio"
              />
              Itens específicos
            </label>
          </div>
          {form.target_type !== "all" ? (
            <div className="max-h-48 overflow-y-auto rounded-2xl border border-line bg-white p-2">
              {targetOptions.length === 0 ? (
                <p className="p-2 text-xs text-muted">
                  Nenhuma opção disponível. Cadastre {form.target_type === "item" ? "itens" : "categorias"} primeiro.
                </p>
              ) : (
                <ul className="grid gap-1">
                  {targetOptions.map((opt) => {
                    const checked = form.target_ids.includes(opt.id);
                    return (
                      <li key={opt.id}>
                        <label className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm text-ink hover:bg-slate-50">
                          <input
                            checked={checked}
                            onChange={() => toggleTargetId(opt.id)}
                            type="checkbox"
                          />
                          {opt.label}
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
              {errors.target_ids ? (
                <p className="mt-2 text-xs text-rose-600">{errors.target_ids}</p>
              ) : null}
            </div>
          ) : null}
        </section>

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
