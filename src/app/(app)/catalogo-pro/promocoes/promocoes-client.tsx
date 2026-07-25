"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import { PromocaoForm } from "./promocao-form";
import {
  computePromotionStatus,
  DISCOUNT_TYPE_LABELS,
  PROMOTION_KIND_LABELS,
  PROMOTION_STATUS_META,
  type CatalogProItem,
  type ItemCategory,
  type Promotion,
  type PromotionKind,
  type PromotionStatus,
  type PromotionTarget
} from "../types";

// Ao carregar, recalcula status derivado. O banco tem status persistido mas
// pode estar desatualizado (uma promo agendada vira ativa quando chega a data).
function refreshStatus(p: Promotion): PromotionStatus {
  if (p.status === "disabled") return "disabled";
  return computePromotionStatus({
    starts_at: p.starts_at,
    ends_at: p.ends_at,
    never_expires: p.never_expires
  });
}

type KindFilter = "all" | PromotionKind;
type StatusFilter = "all" | PromotionStatus;

export function PromocoesClient({
  promotions,
  targets,
  items,
  categories,
  userId
}: {
  promotions: Promotion[];
  targets: PromotionTarget[];
  items: CatalogProItem[];
  categories: ItemCategory[];
  userId: string;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { showToast } = useToast();

  const [kindFilter, setKindFilter] = useState<KindFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Promotion | null>(null);

  // Mapa alvos por promo, útil para a coluna "Alvos" e para o modal.
  const targetsByPromo = useMemo(() => {
    const map = new Map<string, PromotionTarget[]>();
    targets.forEach((t) => {
      const list = map.get(t.promotion_id) ?? [];
      list.push(t);
      map.set(t.promotion_id, list);
    });
    return map;
  }, [targets]);

  const categoryName = useMemo(() => {
    const m = new Map<string, string>();
    categories.forEach((c) => m.set(c.id, c.name));
    return m;
  }, [categories]);
  const itemName = useMemo(() => {
    const m = new Map<string, string>();
    items.forEach((i) => m.set(i.id, i.designation));
    return m;
  }, [items]);

  const rows = useMemo(() => {
    return promotions
      .map((p) => ({ p, status: refreshStatus(p) }))
      .filter(({ p, status }) => {
        if (kindFilter !== "all" && p.kind !== kindFilter) return false;
        if (statusFilter !== "all" && status !== statusFilter) return false;
        return true;
      });
  }, [promotions, kindFilter, statusFilter]);

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }
  function openEdit(p: Promotion) {
    setEditing(p);
    setModalOpen(true);
  }

  async function remove(p: Promotion) {
    const ok = window.confirm(`Excluir a promoção "${p.name}"?`);
    if (!ok) return;
    const { error } = await supabase.from("promotions").delete().eq("id", p.id);
    if (error) {
      showToast("Não foi possível excluir a promoção.", "error");
      return;
    }
    showToast("Promoção excluída.", "success");
    router.refresh();
  }

  function describeTargets(promoId: string): string {
    const list = targetsByPromo.get(promoId) ?? [];
    if (list.length === 0) return "—";
    if (list.some((t) => t.target_type === "all")) return "Tudo do catálogo";
    const names = list
      .map((t) => {
        if (t.target_type === "category" && t.target_id) {
          return categoryName.get(t.target_id) ?? "Categoria";
        }
        if (t.target_type === "item" && t.target_id) {
          return itemName.get(t.target_id) ?? "Item";
        }
        return "";
      })
      .filter(Boolean);
    if (names.length === 0) return "—";
    if (names.length <= 3) return names.join(", ");
    return `${names.slice(0, 3).join(", ")} +${names.length - 3}`;
  }

  function describeDiscount(p: Promotion): string {
    const label = DISCOUNT_TYPE_LABELS[p.discount_type];
    const value = Number(p.discount_value) || 0;
    if (p.discount_type === "percent") return `${value.toFixed(2)} %`;
    if (p.discount_type === "fixed_amount") return `- €${value.toFixed(2)}`;
    return `€${value.toFixed(2)} (${label})`;
  }

  const kindFilters: { key: KindFilter; label: string }[] = [
    { key: "all", label: "Todos os tipos" },
    { key: "catalog", label: "Catálogo" },
    { key: "promo_code", label: "Código promocional" }
  ];
  const statusFilters: { key: StatusFilter; label: string }[] = [
    { key: "all", label: "Todos" },
    { key: "active", label: "Ativas" },
    { key: "scheduled", label: "Agendadas" },
    { key: "expired", label: "Expiradas" },
    { key: "disabled", label: "Desativadas" }
  ];

  return (
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-ink">Promoções</h2>
          <p className="mt-1 text-sm text-muted">
            Descontos automáticos de catálogo e códigos promocionais.
          </p>
        </div>
        <Button onClick={openCreate} type="button">
          + Nova promoção
        </Button>
      </div>

      {/* Filtros */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        {statusFilters.map((f) => (
          <button
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              statusFilter === f.key
                ? "bg-brand text-white"
                : "bg-white text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-50"
            }`}
            key={f.key}
            onClick={() => setStatusFilter(f.key)}
            type="button"
          >
            {f.label}
          </button>
        ))}
        <Select
          aria-label="Tipo"
          className="ml-auto w-56"
          onChange={(e) => setKindFilter(e.target.value as KindFilter)}
          value={kindFilter}
        >
          {kindFilters.map((f) => (
            <option key={f.key} value={f.key}>
              {f.label}
            </option>
          ))}
        </Select>
      </div>

      {/* Tabela / empty */}
      {rows.length === 0 ? (
        <div className="mt-4 flex flex-col items-center rounded-2xl bg-white px-6 py-14 text-center shadow-sm ring-1 ring-black/5">
          <p className="text-lg font-semibold text-ink">Nenhuma promoção neste filtro.</p>
          <p className="mt-2 max-w-md text-sm text-muted">
            Crie uma promoção de catálogo ou um código promocional para começar.
          </p>
          <Button className="mt-6" onClick={openCreate} type="button">
            + Nova promoção
          </Button>
        </div>
      ) : (
        <section className="mt-4 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
          <div className="flex items-center justify-between gap-3 border-b border-line bg-slate-50 px-5 py-3">
            <h3 className="text-sm font-semibold text-ink">Promoções</h3>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-600">
              {rows.length}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-2.5">Nome</th>
                  <th className="px-5 py-2.5">Tipo</th>
                  <th className="px-5 py-2.5">Desconto</th>
                  <th className="px-5 py-2.5">Alvos</th>
                  <th className="px-5 py-2.5">Vigência</th>
                  <th className="px-5 py-2.5">Status</th>
                  <th className="px-5 py-2.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ p, status }) => {
                  const meta = PROMOTION_STATUS_META[status];
                  const start = p.starts_at ? p.starts_at.slice(0, 10) : "—";
                  const end = p.never_expires ? "sem fim" : p.ends_at ? p.ends_at.slice(0, 10) : "—";
                  return (
                    <tr className="border-b border-line last:border-b-0 hover:bg-slate-50" key={p.id}>
                      <td className="px-5 py-2.5">
                        <div className="flex flex-col">
                          <span className="font-medium text-ink">{p.name}</span>
                          {p.code ? (
                            <span className="mt-0.5 inline-block w-fit rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-700">
                              {p.code}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-5 py-2.5 text-slate-600">
                        {PROMOTION_KIND_LABELS[p.kind]}
                      </td>
                      <td className="px-5 py-2.5 tabular-nums text-ink">{describeDiscount(p)}</td>
                      <td className="px-5 py-2.5 text-slate-600">{describeTargets(p.id)}</td>
                      <td className="px-5 py-2.5 tabular-nums text-slate-600">
                        {start} → {end}
                      </td>
                      <td className="px-5 py-2.5">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${meta.badge}`}
                        >
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-5 py-2.5">
                        <div className="flex flex-wrap justify-end gap-1.5">
                          <button
                            className="rounded px-2 py-1 text-xs font-semibold text-slate-600 ring-1 ring-inset ring-slate-200 transition hover:bg-slate-50"
                            onClick={() => openEdit(p)}
                            type="button"
                          >
                            Editar
                          </button>
                          <button
                            className="rounded px-2 py-1 text-xs font-semibold text-rose-600 ring-1 ring-inset ring-rose-200 transition hover:bg-rose-50"
                            onClick={() => void remove(p)}
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

      <PromocaoForm
        categories={categories}
        editing={editing}
        editingTargets={editing ? targetsByPromo.get(editing.id) ?? [] : []}
        isOpen={modalOpen}
        items={items}
        onClose={() => setModalOpen(false)}
        onSaved={() => router.refresh()}
        userId={userId}
      />
    </div>
  );
}
