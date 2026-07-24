"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { SHORTCUTS, readVisibleKeys, writeVisibleKeys } from "@/lib/shortcuts";

// Configurações > Gerenciar atalhos. Mostra/oculta atalhos que aparecem na
// sidebar (acima do bloco do usuário). Persistência local (localStorage) via
// helpers de @/lib/shortcuts — sincroniza a sidebar ao vivo em "Para validar".

export default function AtalhosPage() {
  const { showToast } = useToast();
  const [visible, setVisible] = useState<Set<string>>(() => new Set(readVisibleKeys()));

  function toggle(key: string) {
    setVisible((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function cancel() {
    setVisible(new Set(readVisibleKeys()));
    showToast("Alterações descartadas.", "info");
  }

  function validate() {
    writeVisibleKeys(SHORTCUTS.filter((item) => visible.has(item.key)).map((item) => item.key));
    showToast("Atalhos atualizados.", "success");
  }

  const count = SHORTCUTS.filter((item) => visible.has(item.key)).length;

  return (
    <main className="mx-auto max-w-3xl px-1 py-2 md:py-0">
      <div className="mb-6">
        <p className="text-sm font-semibold text-brand">Configurações</p>
        <h1 className="mt-2 text-2xl font-semibold text-ink">Gerenciar atalhos</h1>
        <p className="mt-2 text-sm text-muted">Escolha os atalhos que aparecem na sua barra lateral.</p>
      </div>

      <div className="mb-6 flex items-start gap-3 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EAF0FF] text-[#1D4ED8]">
          <svg fill="none" height="18" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" width="18">
            <circle cx="12" cy="12" r="9" /><line x1="12" x2="12" y1="8" y2="8" /><line x1="12" x2="12" y1="11" y2="16" />
          </svg>
        </span>
        <div>
          <p className="font-semibold text-ink">Mostrar ou ocultar</p>
          <p className="mt-1 text-sm text-muted">Para organizar seus atalhos, acesse o canto inferior esquerdo da tela.</p>
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
        <div className="flex items-center justify-between border-b border-line bg-slate-50 px-5 py-3">
          <h2 className="text-base font-semibold text-ink">Atalhos</h2>
          <span className="text-xs font-semibold text-slate-500">Exibido {count}/{SHORTCUTS.length}</span>
        </div>
        <ul className="divide-y divide-line">
          {SHORTCUTS.map((item) => {
            const on = visible.has(item.key);
            return (
              <li className="flex items-center gap-3 px-5 py-3.5" key={item.key}>
                <span className="cursor-grab text-slate-300" title="Arrastar">
                  <svg fill="none" height="18" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" width="18">
                    <circle cx="9" cy="6" r="1" /><circle cx="9" cy="12" r="1" /><circle cx="9" cy="18" r="1" /><circle cx="15" cy="6" r="1" /><circle cx="15" cy="12" r="1" /><circle cx="15" cy="18" r="1" />
                  </svg>
                </span>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">{item.icon}</span>
                <span className="flex-1 text-sm font-medium text-ink">{item.label}</span>
                <button
                  aria-label={on ? `Ocultar ${item.label}` : `Mostrar ${item.label}`}
                  aria-pressed={on}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition ${on ? "bg-[#1D4ED8]" : "bg-slate-200"}`}
                  onClick={() => toggle(item.key)}
                  type="button"
                >
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
                </button>
              </li>
            );
          })}
        </ul>
        <div className="flex items-center justify-end gap-2 border-t border-line px-5 py-4">
          <Button onClick={cancel} type="button" variant="secondary">Cancelar</Button>
          <button
            className="inline-flex h-11 items-center justify-center rounded bg-emerald-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
            onClick={validate}
            type="button"
          >
            Para validar
          </button>
        </div>
      </section>
    </main>
  );
}
