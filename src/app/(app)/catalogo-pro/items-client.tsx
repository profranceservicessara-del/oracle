"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import { ItemForm } from "./item-form";
import {
  formatPrice,
  ITEM_KIND_LABELS,
  UNIT_LABELS,
  type AccountingCode,
  type CatalogProItem,
  type ItemCategory,
  type ItemKind
} from "./types";

type ArchivedFilter = "no" | "yes" | "all";

// Client shared por Produtos e Serviços. Recebe `kind` para variar rótulos e
// filtros padrão. Toda mutação é via Supabase client + RLS.
export function ItemsClient({
  kind,
  items,
  categories,
  accountingCodes,
  userId
}: {
  kind: ItemKind;
  items: CatalogProItem[];
  categories: ItemCategory[];
  accountingCodes: AccountingCode[];
  userId: string;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { showToast } = useToast();

  const [search, setSearch] = useState("");
  const [archivedFilter, setArchivedFilter] = useState<ArchivedFilter>("no");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<string>("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CatalogProItem | null>(null);
  const [duplicating, setDuplicating] = useState<CatalogProItem | null>(null);

  const kindLabelSingular = ITEM_KIND_LABELS[kind].toLowerCase();
  const kindLabelPlural = kind === "product" ? "produtos" : "serviços";
  const newLabel = kind === "product" ? "Novo produto" : "Novo serviço";

  const categoryName = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [categories]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((it) => {
      if (archivedFilter === "no" && it.archived) return false;
      if (archivedFilter === "yes" && !it.archived) return false;
      if (categoryFilter && it.category_id !== categoryFilter) return false;
      if (q) {
        const hay = [it.designation, it.reference ?? "", it.barcode ?? ""]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [items, search, archivedFilter, categoryFilter]);

  const totalItems = items.length;
  const activeItems = items.filter((i) => !i.archived).length;
  const archivedItems = items.filter((i) => i.archived).length;

  const kpis = [
    { label: `Total de ${kindLabelPlural}`, value: String(totalItems), tone: "text-ink" },
    { label: "Ativos", value: String(activeItems), tone: "text-emerald-600" },
    {
      label: "Arquivados",
      value: String(archivedItems),
      tone: archivedItems > 0 ? "text-amber-600" : "text-ink"
    }
  ];

  function openCreate() {
    setEditing(null);
    setDuplicating(null);
    setModalOpen(true);
  }
  function openEdit(item: CatalogProItem) {
    setEditing(item);
    setDuplicating(null);
    setModalOpen(true);
  }
  function openDuplicate(item: CatalogProItem) {
    setEditing(null);
    setDuplicating(item);
    setModalOpen(true);
  }

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleAll() {
    if (selected.size === rows.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(rows.map((r) => r.id)));
    }
  }

  async function archiveItem(item: CatalogProItem, value: boolean) {
    const { error } = await supabase
      .from("catalog_items")
      .update({ archived: value })
      .eq("id", item.id);
    if (error) {
      showToast("Não foi possível atualizar o item.", "error");
      return;
    }
    showToast(value ? "Item arquivado." : "Item desarquivado.", "success");
    router.refresh();
  }

  async function deleteItem(item: CatalogProItem) {
    const confirmed = window.confirm(
      `Excluir "${item.designation}"? Essa ação não pode ser desfeita.`
    );
    if (!confirmed) return;
    const { error } = await supabase.from("catalog_items").delete().eq("id", item.id);
    if (error) {
      showToast("Não foi possível excluir o item.", "error");
      return;
    }
    showToast("Item excluído.", "success");
    router.refresh();
  }

  async function runBulk() {
    if (!bulkAction || selected.size === 0) return;
    const ids = Array.from(selected);
    if (bulkAction === "archive" || bulkAction === "unarchive") {
      const value = bulkAction === "archive";
      const { error } = await supabase
        .from("catalog_items")
        .update({ archived: value })
        .in("id", ids);
      if (error) {
        showToast("Não foi possível aplicar a ação em massa.", "error");
        return;
      }
      showToast(value ? "Itens arquivados." : "Itens desarquivados.", "success");
    } else if (bulkAction === "delete") {
      const ok = window.confirm(
        `Excluir ${ids.length} item(ns) selecionado(s)? Ação irreversível.`
      );
      if (!ok) return;
      const { error } = await supabase.from("catalog_items").delete().in("id", ids);
      if (error) {
        showToast("Não foi possível excluir os itens.", "error");
        return;
      }
      showToast("Itens excluídos.", "success");
    }
    setSelected(new Set());
    setBulkAction("");
    router.refresh();
  }

  function exportCsv() {
    const header = ["Referência", "Nome", "Preço HT", "TVA %", "Categoria", "Unidade", "Arquivado"];
    const body = rows.map((it) => [
      (it.reference ?? "").replace(/"/g, "'"),
      it.designation.replace(/"/g, "'"),
      (Number(it.prix_unitaire_ht) || 0).toFixed(2),
      (Number(it.vat_rate) || 0).toFixed(2),
      (categoryName.get(it.category_id ?? "") ?? "").replace(/"/g, "'"),
      UNIT_LABELS[it.unite] ?? it.unite,
      it.archived ? "sim" : "nao"
    ]);
    const csv = [header, ...body]
      .map((line) => line.map((c) => `"${c}"`).join(";"))
      .join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `catalogo-${kindLabelPlural}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const archivedOptions: { key: ArchivedFilter; label: string }[] = [
    { key: "no", label: "Ativos" },
    { key: "yes", label: "Arquivados" },
    { key: "all", label: "Todos" }
  ];

  const allChecked = rows.length > 0 && selected.size === rows.length;

  return (
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-ink capitalize">{kindLabelPlural}</h2>
          <p className="mt-1 text-sm text-muted">
            Itens do catálogo do tipo {kindLabelSingular}.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            disabled={rows.length === 0}
            onClick={exportCsv}
            type="button"
            variant="secondary"
          >
            Exportar CSV
          </Button>
          <Button onClick={openCreate} type="button">
            + {newLabel}
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {kpis.map((k) => (
          <div
            className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5"
            key={k.label}
          >
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              {k.label}
            </p>
            <p className={`mt-1 text-lg font-semibold tabular-nums ${k.tone}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        {archivedOptions.map((f) => (
          <button
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              archivedFilter === f.key
                ? "bg-brand text-white"
                : "bg-white text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-50"
            }`}
            key={f.key}
            onClick={() => setArchivedFilter(f.key)}
            type="button"
          >
            {f.label}
          </button>
        ))}
        <Select
          aria-label="Categoria"
          className="ml-auto w-56"
          onChange={(e) => setCategoryFilter(e.target.value)}
          value={categoryFilter}
        >
          <option value="">Todas as categorias</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Input
          aria-label="Buscar"
          className="w-64"
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome, referência ou código de barras"
          value={search}
        />
      </div>

      {/* Ações em massa */}
      {selected.size > 0 ? (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl bg-sky-50 px-4 py-3 text-sm text-sky-900 ring-1 ring-inset ring-sky-200">
          <span className="font-semibold">{selected.size} selecionado(s)</span>
          <Select
            aria-label="Ação em massa"
            className="w-56"
            onChange={(e) => setBulkAction(e.target.value)}
            value={bulkAction}
          >
            <option value="">Escolher ação</option>
            <option value="archive">Arquivar</option>
            <option value="unarchive">Desarquivar</option>
            <option value="delete">Excluir</option>
          </Select>
          <Button disabled={!bulkAction} onClick={() => void runBulk()} type="button">
            Aplicar
          </Button>
          <button
            className="text-xs font-semibold text-slate-600 underline hover:text-ink"
            onClick={() => setSelected(new Set())}
            type="button"
          >
            Limpar seleção
          </button>
        </div>
      ) : null}

      {/* Tabela / empty */}
      {rows.length === 0 ? (
        <div className="mt-4 flex flex-col items-center rounded-2xl bg-white px-6 py-14 text-center shadow-sm ring-1 ring-black/5">
          <p className="text-lg font-semibold text-ink">Nenhum item neste filtro.</p>
          <p className="mt-2 max-w-md text-sm text-muted">
            Crie um novo {kindLabelSingular} ou ajuste os filtros para ver outros itens.
          </p>
          <Button className="mt-6" onClick={openCreate} type="button">
            + {newLabel}
          </Button>
        </div>
      ) : (
        <section className="mt-4 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
          <div className="flex items-center justify-between gap-3 border-b border-line bg-slate-50 px-5 py-3">
            <h3 className="text-sm font-semibold text-ink capitalize">{kindLabelPlural}</h3>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-600">
              {rows.length}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <th className="w-10 px-4 py-2.5">
                    <input
                      aria-label="Selecionar todos"
                      checked={allChecked}
                      onChange={toggleAll}
                      type="checkbox"
                    />
                  </th>
                  <th className="px-4 py-2.5">Referência</th>
                  <th className="px-4 py-2.5">Nome</th>
                  <th className="px-4 py-2.5 text-right">Preço HT</th>
                  <th className="px-4 py-2.5 text-right">TVA %</th>
                  <th className="px-4 py-2.5">Categoria</th>
                  <th className="px-4 py-2.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((it) => {
                  const checked = selected.has(it.id);
                  return (
                    <tr
                      className={`border-b border-line transition last:border-b-0 hover:bg-slate-50 ${
                        it.archived ? "opacity-70" : ""
                      }`}
                      key={it.id}
                    >
                      <td className="px-4 py-2.5">
                        <input
                          aria-label={`Selecionar ${it.designation}`}
                          checked={checked}
                          onChange={() => toggleRow(it.id)}
                          type="checkbox"
                        />
                      </td>
                      <td className="px-4 py-2.5 font-medium tabular-nums text-slate-600">
                        {it.reference || "—"}
                      </td>
                      <td className="px-4 py-2.5 text-ink">
                        <div className="flex flex-col">
                          <span className="font-medium">{it.designation}</span>
                          {it.archived ? (
                            <span className="mt-0.5 inline-block w-fit rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-200">
                              Arquivado
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-ink">
                        {formatPrice(it.prix_unitaire_ht)}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">
                        {(Number(it.vat_rate) || 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-2.5 text-slate-600">
                        {categoryName.get(it.category_id ?? "") || "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-wrap justify-end gap-1.5">
                          <button
                            className="rounded px-2 py-1 text-xs font-semibold text-slate-600 ring-1 ring-inset ring-slate-200 transition hover:bg-slate-50"
                            onClick={() => openEdit(it)}
                            type="button"
                          >
                            Editar
                          </button>
                          <button
                            className="rounded px-2 py-1 text-xs font-semibold text-slate-600 ring-1 ring-inset ring-slate-200 transition hover:bg-slate-50"
                            onClick={() => openDuplicate(it)}
                            type="button"
                          >
                            Duplicar
                          </button>
                          <button
                            className="rounded px-2 py-1 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-200 transition hover:bg-amber-50"
                            onClick={() => void archiveItem(it, !it.archived)}
                            type="button"
                          >
                            {it.archived ? "Desarquivar" : "Arquivar"}
                          </button>
                          <button
                            className="rounded px-2 py-1 text-xs font-semibold text-rose-600 ring-1 ring-inset ring-rose-200 transition hover:bg-rose-50"
                            onClick={() => void deleteItem(it)}
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

      <ItemForm
        accountingCodes={accountingCodes}
        categories={categories}
        duplicating={duplicating}
        editing={editing}
        isOpen={modalOpen}
        kind={kind}
        onClose={() => setModalOpen(false)}
        onSaved={() => router.refresh()}
        userId={userId}
      />
    </div>
  );
}
