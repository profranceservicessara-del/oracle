import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DocumentsNav } from "@/components/app/documents-nav";
import { DocActions } from "@/components/app/document-row-actions";
import { createClient } from "@/lib/supabase/server";

const secondaryButton =
  "inline-flex h-11 items-center justify-center gap-2 rounded-full bg-white px-4 text-sm font-semibold text-ink shadow-sm ring-1 ring-black/5 transition hover:bg-slate-50 active:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

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

// Placeholder fiscal declarations (no backend source yet — safe static data).
const declarations = [
  { name: "Declaração de TVA", exporter: false, icon: (<svg fill="none" height="18" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" width="18"><path d="M19 5 5 19" /><circle cx="7.5" cy="7.5" r="2.5" /><circle cx="16.5" cy="16.5" r="2.5" /></svg>) },
  { name: "Declaração URSSAF", exporter: false, icon: (<svg fill="none" height="18" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" width="18"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>) },
  { name: "Déclaration 2042-C-PRO", exporter: false, icon: (<svg fill="none" height="18" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" width="18"><path d="M14 3v4a1 1 0 0 0 1 1h4" /><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z" /><line x1="9" x2="15" y1="13" y2="13" /><line x1="9" x2="13" y1="17" y2="17" /></svg>) },
  { name: "Attestation fiscale", exporter: false, icon: (<svg fill="none" height="18" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" width="18"><circle cx="12" cy="9" r="5" /><path d="m9 13.5-1.5 7L12 18l4.5 2.5L15 13.5" /></svg>) },
  { name: "Exportação fiscal", exporter: true, icon: (<svg fill="none" height="18" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" width="18"><path d="M14 3v4a1 1 0 0 0 1 1h4" /><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z" /><path d="M12 11v6m0 0 2.5-2.5M12 17l-2.5-2.5" /></svg>) }
];

export default async function DeclaracoesFiscaisPage() {
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
        <DocumentsNav active="declarations" />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-semibold text-ink">Declarações fiscais</h1>
            <span className="inline-flex h-11 items-center justify-center rounded-full bg-white px-4 text-sm font-semibold text-muted shadow-sm ring-1 ring-black/5">
              Exercício {exercice}
            </span>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-rose-50 p-5 ring-1 ring-rose-200">
            <div className="min-w-0">
              <span className="inline-flex rounded-full bg-rose-500 px-2.5 py-0.5 text-xs font-semibold text-white">
                Exclusivo para assinantes
              </span>
              <p className="mt-3 text-sm font-medium text-rose-900">
                <span className="font-semibold">Assine</span> para consultar e baixar suas declarações fiscais
                sempre que precisar.
              </p>
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
            {declarations.map((declaration) => (
              <DocRow actions={<DocActions exporter={declaration.exporter} />} icon={declaration.icon} key={declaration.name} name={declaration.name} />
            ))}
          </div>

          <p className="mt-4 px-1 text-xs text-muted">Nenhuma declaração disponível para {exercice}. Assine para gerar e baixar seus documentos fiscais.</p>
        </div>
      </div>
    </main>
  );
}
