"use client";

import { useState } from "react";
import type { ContractTemplate } from "@/lib/types";

function preview(body: string): string {
  const clean = body.replace(/\s+/g, " ").trim();
  if (!clean) return "Modelo disponível para consulta e download.";
  return clean.length > 130 ? `${clean.slice(0, 130)}...` : clean;
}

function pdfUrl(template: ContractTemplate, download = false): string {
  return `/api/contract-templates/${template.id}/pdf${download ? "?download=1" : ""}`;
}

export function ModelosClient({ initialTemplates }: { initialTemplates: ContractTemplate[] }) {
  const [selected, setSelected] = useState<ContractTemplate | null>(null);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Gestão</p>
        <h1 className="mt-1 text-2xl font-semibold text-ink">Modelos de contrato</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Consulte os modelos disponibilizados pela equipe Oracle e baixe o documento quando precisar.
        </p>
      </div>

      {initialTemplates.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl bg-white px-6 py-16 text-center shadow-sm ring-1 ring-black/5">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 ring-1 ring-black/5">
            <svg fill="none" height="28" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" viewBox="0 0 24 24" width="28">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <path d="M14 2v6h6" />
              <path d="M9 15h6M9 11h6" />
            </svg>
          </span>
          <h2 className="mt-5 text-lg font-semibold text-ink">Nenhum modelo disponível no momento.</h2>
          <p className="mt-2 max-w-sm text-sm text-muted">
            Os modelos serão publicados pela equipe Oracle. Assim que estiverem disponíveis, eles aparecerão aqui para consulta e download.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {initialTemplates.map((template) => (
            <article className="flex min-h-52 flex-col rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5" key={template.id}>
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EEF3FF] text-brand ring-1 ring-[#DCE7FF]">
                  <svg fill="none" height="18" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" viewBox="0 0 24 24" width="18">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <path d="M14 2v6h6" />
                    <path d="M9 15h6M9 11h6" />
                  </svg>
                </span>
                <h2 className="min-w-0 text-base font-semibold leading-snug text-ink">{template.title}</h2>
              </div>
              <p className="mt-4 line-clamp-3 text-sm leading-6 text-muted">{preview(template.body)}</p>
              <div className="mt-auto flex items-center justify-between gap-3 pt-5">
                <button className="inline-flex items-center gap-2 text-sm font-semibold text-brand transition hover:text-[#003a94]" onClick={() => setSelected(template)} type="button">
                  <svg fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" width="16">
                    <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  Consultar
                </button>
                <a className="inline-flex items-center gap-2 text-sm font-semibold text-brand transition hover:text-[#003a94]" href={pdfUrl(template, true)}>
                  <svg fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" width="16">
                    <path d="M12 3v12" />
                    <path d="m7 10 5 5 5-5" />
                    <path d="M5 21h14" />
                  </svg>
                  Download
                </a>
              </div>
            </article>
          ))}
        </div>
      )}

      {selected ? (
        <div aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-8 backdrop-blur-sm" role="dialog">
          <div className="flex max-h-[86vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-2xl ring-1 ring-black/5">
            <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Modelo de contrato</p>
                <h2 className="mt-1 text-lg font-semibold text-ink">{selected.title}</h2>
              </div>
              <button aria-label="Fechar" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-ink" onClick={() => setSelected(null)} type="button">
                <svg fill="none" height="18" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" width="18">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto px-6 py-5">
              <div className="whitespace-pre-wrap rounded-2xl bg-slate-50 p-5 text-sm leading-7 text-slate-700 ring-1 ring-black/5">
                {selected.body || "Este modelo ainda não possui conteúdo de consulta."}
              </div>
            </div>
            <div className="flex flex-wrap justify-end gap-2 border-t border-line px-6 py-4">
              <button className="inline-flex h-10 items-center justify-center rounded-xl bg-white px-4 text-sm font-semibold text-ink shadow-sm ring-1 ring-black/5 transition hover:bg-slate-50" onClick={() => setSelected(null)} type="button">
                Fechar
              </button>
              <a className="inline-flex h-10 items-center justify-center rounded-xl bg-brand px-4 text-sm font-semibold text-white shadow-sm ring-1 ring-[#002D72]/20 transition hover:bg-[#003a94]" href={pdfUrl(selected, true)}>
                Download
              </a>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
