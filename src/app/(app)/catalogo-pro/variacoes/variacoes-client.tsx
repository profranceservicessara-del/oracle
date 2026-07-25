"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import { variantAxisSchema, variantValueSchema } from "../validation";
import type { VariantAxis, VariantValue } from "../types";

// CRUD in-place de eixos de variação e seus valores. Sem modal: os formulários
// ficam inline em cada eixo (fluxo mais rápido de cadastro).
export function VariacoesClient({
  axes,
  values,
  userId
}: {
  axes: VariantAxis[];
  values: VariantValue[];
  userId: string;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { showToast } = useToast();

  const [newAxis, setNewAxis] = useState("");
  const [axisError, setAxisError] = useState<string | null>(null);

  // Valores por eixo, ordenados por position.
  const valuesByAxis = useMemo(() => {
    const map = new Map<string, VariantValue[]>();
    values.forEach((v) => {
      const list = map.get(v.axis_id) ?? [];
      list.push(v);
      map.set(v.axis_id, list);
    });
    map.forEach((list) => list.sort((a, b) => a.position - b.position));
    return map;
  }, [values]);

  async function createAxis() {
    const parsed = variantAxisSchema.safeParse({ name: newAxis });
    if (!parsed.success) {
      setAxisError(parsed.error.issues[0]?.message ?? "Nome inválido.");
      return;
    }
    setAxisError(null);
    const { error } = await supabase
      .from("variant_axes")
      .insert({ user_id: userId, name: parsed.data.name });
    if (error) {
      showToast("Não foi possível criar o eixo.", "error");
      return;
    }
    setNewAxis("");
    showToast("Eixo criado.", "success");
    router.refresh();
  }

  async function deleteAxis(axis: VariantAxis) {
    const count = valuesByAxis.get(axis.id)?.length ?? 0;
    const message =
      count > 0
        ? `Excluir o eixo "${axis.name}" e seus ${count} valor(es)?`
        : `Excluir o eixo "${axis.name}"?`;
    const ok = window.confirm(message);
    if (!ok) return;
    const { error } = await supabase.from("variant_axes").delete().eq("id", axis.id);
    if (error) {
      showToast("Não foi possível excluir o eixo.", "error");
      return;
    }
    showToast("Eixo excluído.", "success");
    router.refresh();
  }

  return (
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-ink">Variações</h2>
          <p className="mt-1 text-sm text-muted">
            Eixos de variação (Cor, Tamanho, Material) e seus valores possíveis.
          </p>
        </div>
      </div>

      {/* Criar novo eixo */}
      <div className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
        <h3 className="text-sm font-semibold text-ink">Novo eixo</h3>
        <p className="mt-1 text-xs text-muted">
          Ex.: Cor, Tamanho, Material. Cada eixo agrupa valores possíveis.
        </p>
        <div className="mt-3 flex flex-wrap items-start gap-2">
          <Input
            aria-label="Nome do eixo"
            className="w-64"
            onChange={(e) => setNewAxis(e.target.value)}
            placeholder="Ex.: Cor"
            value={newAxis}
          />
          <Button onClick={() => void createAxis()} type="button">
            Adicionar eixo
          </Button>
        </div>
        {axisError ? <p className="mt-2 text-xs text-rose-600">{axisError}</p> : null}
      </div>

      {/* Lista de eixos */}
      {axes.length === 0 ? (
        <div className="mt-6 flex flex-col items-center rounded-2xl bg-white px-6 py-14 text-center shadow-sm ring-1 ring-black/5">
          <p className="text-lg font-semibold text-ink">Nenhum eixo cadastrado.</p>
          <p className="mt-2 max-w-md text-sm text-muted">
            Crie um eixo acima (ex.: Cor) e depois adicione valores possíveis.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4">
          {axes.map((axis) => (
            <AxisCard
              axis={axis}
              key={axis.id}
              onDelete={() => void deleteAxis(axis)}
              userId={userId}
              values={valuesByAxis.get(axis.id) ?? []}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AxisCard({
  axis,
  values,
  userId,
  onDelete
}: {
  axis: VariantAxis;
  values: VariantValue[];
  userId: string;
  onDelete: () => void;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { showToast } = useToast();

  const [newValue, setNewValue] = useState("");
  const [newPosition, setNewPosition] = useState("0");
  const [valueError, setValueError] = useState<string | null>(null);

  async function addValue() {
    const parsed = variantValueSchema.safeParse({
      axis_id: axis.id,
      value: newValue,
      position: newPosition
    });
    if (!parsed.success) {
      setValueError(parsed.error.issues[0]?.message ?? "Valor inválido.");
      return;
    }
    setValueError(null);
    const { error } = await supabase.from("variant_values").insert({
      user_id: userId,
      axis_id: axis.id,
      value: parsed.data.value,
      position: parsed.data.position
    });
    if (error) {
      showToast("Não foi possível adicionar o valor.", "error");
      return;
    }
    setNewValue("");
    setNewPosition(String((values.length || 0) + 1));
    showToast("Valor adicionado.", "success");
    router.refresh();
  }

  async function removeValue(v: VariantValue) {
    const { error } = await supabase.from("variant_values").delete().eq("id", v.id);
    if (error) {
      showToast("Não foi possível remover o valor.", "error");
      return;
    }
    showToast("Valor removido.", "success");
    router.refresh();
  }

  return (
    <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-slate-50 px-5 py-3">
        <div>
          <h3 className="text-sm font-semibold text-ink">{axis.name}</h3>
          <p className="text-xs text-muted">
            {values.length} valor(es) cadastrado(s).
          </p>
        </div>
        <button
          className="rounded px-2 py-1 text-xs font-semibold text-rose-600 ring-1 ring-inset ring-rose-200 transition hover:bg-rose-50"
          onClick={onDelete}
          type="button"
        >
          Excluir eixo
        </button>
      </div>

      {values.length === 0 ? (
        <p className="px-5 py-4 text-sm text-muted">Nenhum valor cadastrado ainda.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-5 py-2.5">Valor</th>
              <th className="px-5 py-2.5 text-right">Posição</th>
              <th className="px-5 py-2.5 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {values.map((v) => (
              <tr className="border-b border-line last:border-b-0" key={v.id}>
                <td className="px-5 py-2.5 font-medium text-ink">{v.value}</td>
                <td className="px-5 py-2.5 text-right tabular-nums text-slate-500">
                  {v.position}
                </td>
                <td className="px-5 py-2.5 text-right">
                  <button
                    className="rounded px-2 py-1 text-xs font-semibold text-rose-600 ring-1 ring-inset ring-rose-200 transition hover:bg-rose-50"
                    onClick={() => void removeValue(v)}
                    type="button"
                  >
                    Remover
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="border-t border-line bg-slate-50 px-5 py-3">
        <div className="flex flex-wrap items-start gap-2">
          <Input
            aria-label={`Novo valor para ${axis.name}`}
            className="w-56"
            onChange={(e) => setNewValue(e.target.value)}
            placeholder={`Ex.: ${axis.name === "Cor" ? "Azul" : "M"}`}
            value={newValue}
          />
          <Input
            aria-label="Posição"
            className="w-24"
            min="0"
            onChange={(e) => setNewPosition(e.target.value)}
            type="number"
            value={newPosition}
          />
          <Button onClick={() => void addValue()} type="button" variant="secondary">
            Adicionar valor
          </Button>
        </div>
        {valueError ? <p className="mt-2 text-xs text-rose-600">{valueError}</p> : null}
      </div>
    </section>
  );
}
