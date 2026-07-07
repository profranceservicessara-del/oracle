"use client";

import { useToast } from "@/components/ui/toast";

// Ações de contabilidade ainda sem backend (download/preview/export). Em vez de
// botões que parecem ativos mas não fazem nada, exibimos estado desabilitado
// com selo "Em breve" e feedback claro ao clicar. Sem ação fake.

const disabledButton =
  "inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-slate-50 px-4 text-sm font-semibold text-slate-400 ring-1 ring-black/5 cursor-not-allowed";
const disabledIcon =
  "inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-50 text-slate-300 ring-1 ring-black/5 cursor-not-allowed";
const emBrevePill =
  "inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400";

export function DocActions({ exporter }: { exporter?: boolean }) {
  const { showToast } = useToast();

  function soon() {
    showToast("Este recurso estará disponível em breve.", "info");
  }

  if (exporter) {
    return (
      <button aria-disabled="true" className={disabledButton} onClick={soon} title="Em breve" type="button">
        Exporter
        <span className={emBrevePill}>Em breve</span>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button aria-disabled="true" aria-label="Télécharger (em breve)" className={disabledIcon} onClick={soon} title="Em breve" type="button">
        <svg fill="none" height="18" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="18">
          <path d="M12 3v12" />
          <path d="m7 12 5 5 5-5" />
          <path d="M5 21h14" />
        </svg>
      </button>
      <button aria-disabled="true" className={disabledButton} onClick={soon} title="Em breve" type="button">
        Visualiser
        <span className={emBrevePill}>Em breve</span>
      </button>
    </div>
  );
}
