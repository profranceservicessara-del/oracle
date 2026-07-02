"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

// Pagamentos / Assinatura — UI pronta (frontend-only). Sem backend de billing
// ainda; os botões sinalizam "em breve". Renderizada dentro do rail de settings.
export default function PagamentosPage() {
  const { showToast } = useToast();
  const [bannerOpen, setBannerOpen] = useState(true);

  function notImplemented() {
    showToast("Disponível em breve.", "info");
  }

  return (
    <main className="mx-auto max-w-3xl px-1 py-2 md:py-0">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-brand">Configurações</p>
          <h1 className="mt-2 text-2xl font-semibold text-ink">Pagamentos / Assinatura</h1>
          <p className="mt-2 text-sm text-muted">Gerencie seus métodos de pagamento e sua assinatura.</p>
        </div>
        <button
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-2 text-sm font-medium text-ink shadow-sm transition hover:bg-slate-50"
          onClick={notImplemented}
          type="button"
        >
          Saber mais
          <svg fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeWidth="2" viewBox="0 0 24 24" width="16">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      </div>

      {bannerOpen ? (
        <div className="mb-6 flex items-start justify-between gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
          <div>
            <p className="font-semibold text-ink">Configure seus métodos de pagamento e assinatura.</p>
            <p className="mt-1 text-sm text-muted">Adicione um método de pagamento e acompanhe sua assinatura do Oracle.</p>
            <button className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline" onClick={notImplemented} type="button">
              <svg fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" width="16">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
              Como funciona?
            </button>
          </div>
          <button aria-label="Fechar" className="shrink-0 text-slate-400 transition hover:text-ink" onClick={() => setBannerOpen(false)} type="button">
            <svg fill="none" height="18" stroke="currentColor" strokeLinecap="round" strokeWidth="2" viewBox="0 0 24 24" width="18"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>
      ) : null}

      {/* Método de pagamento */}
      <section className="mb-6 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
        <div className="border-b border-line bg-slate-50 px-5 py-3">
          <h2 className="text-base font-semibold text-ink">Método de pagamento</h2>
        </div>
        <div className="flex flex-col items-center gap-4 px-5 py-8 text-center">
          <p className="text-sm text-muted">Você ainda não adicionou um método de pagamento.</p>
          <Button onClick={notImplemented} type="button">Adicionar um método de pagamento</Button>
        </div>
      </section>

      {/* Assinaturas */}
      <section className="mb-6 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
        <div className="flex items-center justify-between gap-3 border-b border-line bg-slate-50 px-5 py-3">
          <h2 className="text-base font-semibold text-ink">Assinaturas</h2>
          <Link className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline" href="/facturation">
            Ver minhas faturas
            <svg fill="none" height="15" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" width="15">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><path d="M15 3h6v6" /><path d="M10 14 21 3" />
            </svg>
          </Link>
        </div>
        <div className="flex flex-col items-center gap-3 px-5 py-10 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#EAF0FF] text-[#1D4ED8]">
            <svg fill="none" height="28" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" viewBox="0 0 24 24" width="28">
              <rect height="14" rx="2" width="20" x="2" y="3" /><line x1="8" x2="16" y1="21" y2="21" /><line x1="12" x2="12" y1="17" y2="21" />
            </svg>
          </span>
          <p className="text-lg font-semibold text-ink">Sem assinatura</p>
          <p className="max-w-sm text-sm text-muted">Você ainda não se inscreveu em uma assinatura.</p>
          <Button className="mt-1" onClick={notImplemented} type="button">
            <svg className="mr-1.5" fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" width="16">
              <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91 0z" /><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" /><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" /><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
            </svg>
            Descubra as nossas ofertas
          </Button>
        </div>
      </section>

      {/* Testes gratuitos */}
      <section className="mb-6 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
        <div className="border-b border-line bg-slate-50 px-5 py-3">
          <h2 className="text-base font-semibold text-ink">Testes gratuitos (sem pagamentos programados)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-5 py-3">Data</th>
                <th className="px-5 py-3">Produto</th>
                <th className="px-5 py-3">Fim do período de teste gratuito</th>
                <th className="px-5 py-3">Estado</th>
                <th className="px-5 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-5 py-8 text-center text-muted" colSpan={5}>
                  Nenhum teste gratuito em andamento.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
