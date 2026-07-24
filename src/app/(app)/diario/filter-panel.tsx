"use client";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import {
  RELATED_KIND_LABELS,
  RELATED_KIND_ORDER,
  type EventCategory,
  type EventCollaborator,
  type EventRelatedKind,
  type RelatedOptions
} from "./types";

// Painel de filtros do Diário: rótulo (categoria) e objeto relacionado.
// A seção de colaboradores só aparece quando existe algum colaborador nos
// eventos carregados.

export type DiarioFilters = {
  categoryIds: string[];
  relatedKind: EventRelatedKind | "all";
  relatedId: string;
  collaboratorIds: string[];
};

export const EMPTY_FILTERS: DiarioFilters = {
  categoryIds: [],
  relatedKind: "all",
  relatedId: "",
  collaboratorIds: []
};

export function countActiveFilters(filters: DiarioFilters): number {
  let count = 0;
  if (filters.categoryIds.length > 0) count += 1;
  if (filters.relatedKind !== "all") count += 1;
  if (filters.relatedId) count += 1;
  if (filters.collaboratorIds.length > 0) count += 1;
  return count;
}

export function FilterPanel({
  categories,
  collaborators,
  filters,
  onChange,
  onClose,
  relatedOptions,
  userId
}: {
  categories: EventCategory[];
  collaborators: EventCollaborator[];
  filters: DiarioFilters;
  onChange: (filters: DiarioFilters) => void;
  onClose: () => void;
  relatedOptions: RelatedOptions;
  userId: string;
}) {
  const uniqueCollaborators = [...new Map(collaborators.map((row) => [row.user_id, row])).values()];
  const relatedList = filters.relatedKind === "all" ? [] : relatedOptions[filters.relatedKind] ?? [];

  function toggleCategory(id: string) {
    const next = filters.categoryIds.includes(id)
      ? filters.categoryIds.filter((value) => value !== id)
      : [...filters.categoryIds, id];
    onChange({ ...filters, categoryIds: next });
  }

  function toggleCollaborator(id: string) {
    const next = filters.collaboratorIds.includes(id)
      ? filters.collaboratorIds.filter((value) => value !== id)
      : [...filters.collaboratorIds, id];
    onChange({ ...filters, collaboratorIds: next });
  }

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-ink">Filtros</h2>
          <p className="mt-1 text-xs text-muted">Combine rótulo e vínculo para reduzir a lista do período.</p>
        </div>
        <Button onClick={onClose} type="button" variant="secondary">
          Fechar
        </Button>
      </div>

      <div className="mt-4 space-y-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Rótulo</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {categories.length === 0 ? (
              <span className="text-xs text-muted">Nenhum rótulo disponível.</span>
            ) : (
              categories.map((category) => {
                const active = filters.categoryIds.includes(category.id);
                return (
                  <button
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      active
                        ? "bg-brand text-white"
                        : "bg-white text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-50"
                    }`}
                    key={category.id}
                    onClick={() => toggleCategory(category.id)}
                    type="button"
                  >
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: active ? "#FFFFFF" : category.color || "#94A3B8" }}
                    />
                    {category.emoji ? <span aria-hidden>{category.emoji}</span> : null}
                    {category.name}
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Objeto relacionado
            </span>
            <Select
              onChange={(event) =>
                onChange({
                  ...filters,
                  relatedKind: event.target.value as EventRelatedKind | "all",
                  relatedId: ""
                })
              }
              value={filters.relatedKind}
            >
              <option value="all">Todos</option>
              {RELATED_KIND_ORDER.map((kind) => (
                <option key={kind} value={kind}>
                  {RELATED_KIND_LABELS[kind]}
                </option>
              ))}
            </Select>
          </label>

          {relatedList.length > 0 ? (
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                {filters.relatedKind === "all" ? "Objeto" : RELATED_KIND_LABELS[filters.relatedKind]}
              </span>
              <Select
                onChange={(event) => onChange({ ...filters, relatedId: event.target.value })}
                value={filters.relatedId}
              >
                <option value="">Todos</option>
                {relatedList.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </label>
          ) : null}
        </div>

        {uniqueCollaborators.length > 0 ? (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Colaboradores</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {uniqueCollaborators.map((collaborator) => {
                const active = filters.collaboratorIds.includes(collaborator.user_id);
                return (
                  <button
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      active
                        ? "bg-brand text-white"
                        : "bg-white text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-50"
                    }`}
                    key={collaborator.user_id}
                    onClick={() => toggleCollaborator(collaborator.user_id)}
                    type="button"
                  >
                    {collaborator.user_id === userId
                      ? "Você"
                      : `Colaborador ${collaborator.user_id.slice(0, 8)}`}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="flex justify-end">
          <Button onClick={() => onChange(EMPTY_FILTERS)} type="button" variant="secondary">
            Limpar filtros
          </Button>
        </div>
      </div>
    </section>
  );
}
