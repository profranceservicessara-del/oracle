"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FormModal } from "@/components/ui/form-modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import { categorySchema } from "../validation";
import type { ItemCategory } from "../types";

type FormState = {
  name: string;
  parent_id: string;
  position: string;
};

const emptyForm: FormState = { name: "", parent_id: "", position: "0" };

// Monta lista hierárquica (nível 0 primeiro, depois filhos por pai). Duas
// camadas são o comum; se aninhar mais fundo a UI ainda funciona (indent).
function flattenTree(
  categories: ItemCategory[]
): Array<{ cat: ItemCategory; depth: number }> {
  const byParent = new Map<string | null, ItemCategory[]>();
  categories.forEach((c) => {
    const key = c.parent_id ?? null;
    const list = byParent.get(key) ?? [];
    list.push(c);
    byParent.set(key, list);
  });
  const result: Array<{ cat: ItemCategory; depth: number }> = [];
  function walk(parent: string | null, depth: number) {
    const children = byParent.get(parent) ?? [];
    children.forEach((c) => {
      result.push({ cat: c, depth });
      walk(c.id, depth + 1);
    });
  }
  walk(null, 0);
  return result;
}

export function CategoriasClient({
  categories,
  itemCounts,
  userId
}: {
  categories: ItemCategory[];
  itemCounts: Record<string, number>;
  userId: string;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { showToast } = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ItemCategory | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!modalOpen) return;
    if (editing) {
      setForm({
        name: editing.name,
        parent_id: editing.parent_id ?? "",
        position: String(editing.position ?? 0)
      });
    } else {
      setForm(emptyForm);
    }
    setErrors({});
  }, [modalOpen, editing]);

  const tree = useMemo(() => flattenTree(categories), [categories]);

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }
  function openEdit(c: ItemCategory) {
    setEditing(c);
    setModalOpen(true);
  }

  async function save() {
    const parsed = categorySchema.safeParse({
      name: form.name,
      parent_id: form.parent_id || null,
      position: form.position
    });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        next[issue.path[0]?.toString() ?? "form"] = issue.message;
      });
      setErrors(next);
      return;
    }
    // Evita ciclo trivial: uma categoria não pode ser pai dela mesma.
    if (editing && parsed.data.parent_id === editing.id) {
      setErrors({ parent_id: "A categoria não pode ser pai de si mesma." });
      return;
    }
    setSaving(true);
    const payload = { user_id: userId, ...parsed.data };
    const request = editing
      ? supabase.from("item_categories").update(payload).eq("id", editing.id)
      : supabase.from("item_categories").insert(payload);
    const { error } = await request;
    setSaving(false);
    if (error) {
      showToast("Não foi possível salvar a categoria.", "error");
      return;
    }
    showToast(editing ? "Categoria atualizada." : "Categoria criada.", "success");
    setModalOpen(false);
    router.refresh();
  }

  async function remove(c: ItemCategory) {
    const count = itemCounts[c.id] ?? 0;
    if (count > 0) {
      showToast(
        `Não é possível excluir: ${count} item(ns) vinculado(s) a esta categoria.`,
        "error"
      );
      return;
    }
    const hasChildren = categories.some((x) => x.parent_id === c.id);
    if (hasChildren) {
      showToast("Remova ou realoque as subcategorias antes de excluir.", "error");
      return;
    }
    const ok = window.confirm(`Excluir a categoria "${c.name}"?`);
    if (!ok) return;
    const { error } = await supabase.from("item_categories").delete().eq("id", c.id);
    if (error) {
      showToast("Não foi possível excluir a categoria.", "error");
      return;
    }
    showToast("Categoria excluída.", "success");
    router.refresh();
  }

  return (
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-ink">Categorias</h2>
          <p className="mt-1 text-sm text-muted">
            Organize produtos e serviços em categorias hierárquicas.
          </p>
        </div>
        <Button onClick={openCreate} type="button">
          + Nova categoria
        </Button>
      </div>

      {tree.length === 0 ? (
        <div className="mt-6 flex flex-col items-center rounded-2xl bg-white px-6 py-14 text-center shadow-sm ring-1 ring-black/5">
          <p className="text-lg font-semibold text-ink">Nenhuma categoria cadastrada.</p>
          <p className="mt-2 max-w-md text-sm text-muted">
            Crie categorias para agrupar itens no catálogo e nos documentos.
          </p>
          <Button className="mt-6" onClick={openCreate} type="button">
            + Nova categoria
          </Button>
        </div>
      ) : (
        <section className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
          <div className="flex items-center justify-between gap-3 border-b border-line bg-slate-50 px-5 py-3">
            <h3 className="text-sm font-semibold text-ink">Categorias</h3>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-600">
              {categories.length}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-2.5">Nome</th>
                  <th className="px-5 py-2.5 text-right">Itens</th>
                  <th className="px-5 py-2.5 text-right">Posição</th>
                  <th className="px-5 py-2.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {tree.map(({ cat, depth }) => {
                  const count = itemCounts[cat.id] ?? 0;
                  return (
                    <tr
                      className="border-b border-line last:border-b-0 hover:bg-slate-50"
                      key={cat.id}
                    >
                      <td className="px-5 py-2.5 text-ink">
                        <span style={{ paddingLeft: `${depth * 16}px` }}>
                          {depth > 0 ? <span className="text-slate-400">└ </span> : null}
                          <span className="font-medium">{cat.name}</span>
                        </span>
                      </td>
                      <td className="px-5 py-2.5 text-right tabular-nums text-slate-600">
                        {count}
                      </td>
                      <td className="px-5 py-2.5 text-right tabular-nums text-slate-500">
                        {cat.position}
                      </td>
                      <td className="px-5 py-2.5">
                        <div className="flex flex-wrap justify-end gap-1.5">
                          <button
                            className="rounded px-2 py-1 text-xs font-semibold text-slate-600 ring-1 ring-inset ring-slate-200 transition hover:bg-slate-50"
                            onClick={() => openEdit(cat)}
                            type="button"
                          >
                            Editar
                          </button>
                          <button
                            className="rounded px-2 py-1 text-xs font-semibold text-rose-600 ring-1 ring-inset ring-rose-200 transition hover:bg-rose-50"
                            onClick={() => void remove(cat)}
                            type="button"
                          >
                            Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <FormModal
        description="Categoria hierárquica: pode ter uma categoria pai."
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Editar categoria" : "Nova categoria"}
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
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-ink">
              Categoria pai
              <Select
                className="mt-2"
                onChange={(e) => setForm({ ...form, parent_id: e.target.value })}
                value={form.parent_id}
              >
                <option value="">Sem pai (nível raiz)</option>
                {categories
                  .filter((c) => !editing || c.id !== editing.id)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </Select>
              {errors.parent_id ? (
                <span className="mt-1 block text-xs text-rose-600">{errors.parent_id}</span>
              ) : null}
            </label>
            <label className="text-sm font-medium text-ink">
              Posição
              <Input
                className="mt-2"
                min="0"
                onChange={(e) => setForm({ ...form, position: e.target.value })}
                type="number"
                value={form.position}
              />
              {errors.position ? (
                <span className="mt-1 block text-xs text-rose-600">{errors.position}</span>
              ) : null}
            </label>
          </div>
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
