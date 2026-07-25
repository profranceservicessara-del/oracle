"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FormModal } from "@/components/ui/form-modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import { priceListSchema } from "../validation";
import { PRICE_MODE_LABELS, type PriceAmountMode, type PriceList } from "../types";

type FormState = { name: string; amount_mode: PriceAmountMode };
const emptyForm: FormState = { name: "", amount_mode: "ht" };

// TODO (próxima rodada): a atribuição de preços por item + variação usa a
// tabela `item_prices` (index único item_id + variant_id + price_list_id).
// A UI dessa atribuição vai morar na ficha do produto (rodada seguinte).
// Por ora, esta aba só faz CRUD dos cabeçalhos das listas.

export function PrecosClient({
  priceLists,
  userId
}: {
  priceLists: PriceList[];
  userId: string;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { showToast } = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PriceList | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!modalOpen) return;
    if (editing) {
      setForm({ name: editing.name, amount_mode: editing.amount_mode });
    } else {
      setForm(emptyForm);
    }
    setErrors({});
  }, [modalOpen, editing]);

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }
  function openEdit(list: PriceList) {
    setEditing(list);
    setModalOpen(true);
  }

  async function save() {
    const parsed = priceListSchema.safeParse(form);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        next[issue.path[0]?.toString() ?? "form"] = issue.message;
      });
      setErrors(next);
      return;
    }
    setSaving(true);
    const payload = { user_id: userId, ...parsed.data };
    const request = editing
      ? supabase.from("price_lists").update(payload).eq("id", editing.id)
      : supabase.from("price_lists").insert(payload);
    const { error } = await request;
    setSaving(false);
    if (error) {
      showToast("Não foi possível salvar a lista.", "error");
      return;
    }
    showToast(editing ? "Lista atualizada." : "Lista criada.", "success");
    setModalOpen(false);
    router.refresh();
  }

  async function remove(list: PriceList) {
    const ok = window.confirm(
      `Excluir a lista "${list.name}"? Isso remove também os preços atribuídos a itens nesta lista.`
    );
    if (!ok) return;
    const { error } = await supabase.from("price_lists").delete().eq("id", list.id);
    if (error) {
      showToast("Não foi possível excluir a lista.", "error");
      return;
    }
    showToast("Lista excluída.", "success");
    router.refresh();
  }

  return (
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-ink">Listas de preço</h2>
          <p className="mt-1 text-sm text-muted">
            Categorias tarifárias (ex.: público, revenda). A atribuição de preços por item
            fica na ficha do produto (em breve).
          </p>
        </div>
        <Button onClick={openCreate} type="button">
          + Nova lista
        </Button>
      </div>

      {priceLists.length === 0 ? (
        <div className="mt-6 flex flex-col items-center rounded-2xl bg-white px-6 py-14 text-center shadow-sm ring-1 ring-black/5">
          <p className="text-lg font-semibold text-ink">Nenhuma lista de preço.</p>
          <p className="mt-2 max-w-md text-sm text-muted">
            Crie uma lista para diferenciar preços por canal (público, revenda, VIP).
          </p>
          <Button className="mt-6" onClick={openCreate} type="button">
            + Nova lista
          </Button>
        </div>
      ) : (
        <section className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
          <div className="flex items-center justify-between gap-3 border-b border-line bg-slate-50 px-5 py-3">
            <h3 className="text-sm font-semibold text-ink">Listas de preço</h3>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-600">
              {priceLists.length}
            </span>
          </div>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-5 py-2.5">Nome</th>
                <th className="px-5 py-2.5">Modo</th>
                <th className="px-5 py-2.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {priceLists.map((list) => (
                <tr className="border-b border-line last:border-b-0 hover:bg-slate-50" key={list.id}>
                  <td className="px-5 py-2.5 font-medium text-ink">{list.name}</td>
                  <td className="px-5 py-2.5 text-slate-600">
                    {PRICE_MODE_LABELS[list.amount_mode]}
                  </td>
                  <td className="px-5 py-2.5">
                    <div className="flex flex-wrap justify-end gap-1.5">
                      <button
                        className="rounded px-2 py-1 text-xs font-semibold text-slate-600 ring-1 ring-inset ring-slate-200 transition hover:bg-slate-50"
                        onClick={() => openEdit(list)}
                        type="button"
                      >
                        Editar
                      </button>
                      <button
                        className="rounded px-2 py-1 text-xs font-semibold text-rose-600 ring-1 ring-inset ring-rose-200 transition hover:bg-rose-50"
                        onClick={() => void remove(list)}
                        type="button"
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <FormModal
        description="Cabeçalho da lista de preço. Preços por item ficam na ficha do produto (em breve)."
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Editar lista de preço" : "Nova lista de preço"}
      >
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
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
            Modo dos valores
            <Select
              className="mt-2"
              onChange={(e) =>
                setForm({ ...form, amount_mode: e.target.value as PriceAmountMode })
              }
              value={form.amount_mode}
            >
              <option value="ht">HT (sem TVA)</option>
              <option value="ttc">TTC (com TVA)</option>
            </Select>
          </label>
          <div className="flex justify-end gap-2">
            <Button onClick={() => setModalOpen(false)} type="button" variant="secondary">
              Cancelar
            </Button>
            <Button disabled={saving} type="submit">
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </FormModal>
    </div>
  );
}
