import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DocumentsNav } from "@/components/app/documents-nav";
import { DocActions } from "@/components/app/document-row-actions";
import { createClient } from "@/lib/supabase/server";

const secondaryButton =
  "inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-white px-4 text-sm font-semibold text-ink shadow-sm ring-1 ring-black/5 transition hover:bg-slate-50 active:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

function DocRow({ icon, name, actions }: { icon: ReactNode; name: string; actions: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white px-5 py-4 shadow-sm ring-1 ring-black/5">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F9F7EC] text-slate-600 ring-1 ring-black/5">
          {icon}
        </span>
        <span className="font-semibold text-ink">{name}</span>
      </div>
      {actions}
    </div>
  );
}

export default async function DocumentsPage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const exercice = new Date().getFullYear();

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-col gap-6 lg:flex-row">
        <DocumentsNav active="comptabilite" />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-semibold text-ink">Contabilidade</h1>
            {/* TODO: Connect exercise selector to real fiscal years. */}
            <button className={secondaryButton} type="button">
              Exercício {exercice}
              <svg aria-hidden="true" fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeWidth="2" viewBox="0 0 24 24" width="16">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-rose-50 p-5 ring-1 ring-rose-200">
            <div className="min-w-0">
              <span className="inline-flex rounded-full bg-rose-500 px-2.5 py-0.5 text-xs font-semibold text-white">
                Exclusivo para assinantes
              </span>
              <p className="mt-3 text-sm font-medium text-rose-900">
                <span className="font-semibold">Assine</span> para consultar e baixar seus documentos sempre
                que precisar.
              </p>
              {/* Voir nos offres -> página de offres existente. */}
              <Link className={`mt-4 ${secondaryButton}`} href="/offres">
                Ver nossos planos
              </Link>
            </div>
            <span aria-hidden="true" className="hidden text-rose-300 sm:block">
              <svg fill="none" height="56" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width="56">
                <rect height="11" rx="2" width="18" x="3" y="11" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </span>
          </div>

          <div className="mt-4 grid gap-3">
            <DocRow
              actions={<DocActions />}
              icon={
                <svg fill="none" height="18" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" width="18">
                  <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                </svg>
              }
              name="Livro Razão"
            />
            <DocRow
              actions={<DocActions />}
              icon={
                <svg fill="none" height="18" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" width="18">
                  <path d="M12 3v18" />
                  <path d="M3 7h18" />
                  <path d="M7 7 4 13a3 3 0 0 0 6 0z" />
                  <path d="m17 7-3 6a3 3 0 0 0 6 0z" />
                </svg>
              }
              name="Balanço"
            />
            <DocRow
              actions={<DocActions />}
              icon={
                <svg fill="none" height="18" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" width="18">
                  <rect height="13" rx="2" width="18" x="3" y="7" />
                  <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              }
              name="FEC"
            />
            <DocRow
              actions={<DocActions exporter />}
              icon={
                <svg fill="none" height="18" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" width="18">
                  <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                </svg>
              }
              name="Exportação contábil"
            />
          </div>
        </div>
      </div>
    </main>
  );
}
