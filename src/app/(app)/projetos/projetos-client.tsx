"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import type { ProjectWithStats } from "@/lib/crm/queries";
import type { CrmProjectStatus } from "@/lib/crm/types";

type ClientOption = { id: string; name: string };

const STATUS_META: Record<CrmProjectStatus, { label: string; className: string }> = {
  active: { label: "Ativo", className: "bg-blue-100 text-blue-700" },
  on_hold: { label: "Em espera", className: "bg-amber-100 text-amber-700" },
  done: { label: "Concluído", className: "bg-emerald-100 text-emerald-700" },
  archived: { label: "Arquivado", className: "bg-slate-100 text-slate-600" }
};

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

const inputCls =
  "h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-ink outline-none transition placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/20";

export function ProjetosClient({
  companyId,
  initialProjects,
  clients
}: {
  companyId: string;
  initialProjects: ProjectWithStats[];
  clients: ClientOption[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const { showToast } = useToast();
  const [projects, setProjects] = useState(initialProjects);
  const [creating, setCreating] = useState(false);

  function handleCreated(project: ProjectWithStats) {
    setProjects((current) => [project, ...current]);
    setCreating(false);
    router.push(`/projetos/${project.id}`);
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Produtividade</p>
          <h1 className="mt-1 text-2xl font-semibold text-ink">Projetos</h1>
          <p className="mt-1 text-sm text-muted">Organize seu trabalho em projetos e acompanhe as tarefas num quadro Kanban.</p>
        </div>
        <button
          className="inline-flex h-10 items-center gap-1.5 rounded-full bg-brand px-4 text-sm font-semibold text-white shadow-sm ring-1 ring-[#002D72]/20 transition hover:bg-[#003a94] active:bg-[#001F4D]"
          onClick={() => setCreating(true)}
          type="button"
        >
          <svg fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeWidth="2" viewBox="0 0 24 24" width="16"><path d="M12 5v14M5 12h14" /></svg>
          Novo projeto
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="rounded-2xl bg-white px-6 py-20 text-center shadow-sm ring-1 ring-black/5">
          <p className="text-sm font-medium text-ink">Nenhum projeto ainda.</p>
          <p className="mt-1 text-sm text-muted">Crie seu primeiro projeto para começar a organizar as tarefas.</p>
          <button className="mt-4 inline-flex h-10 items-center gap-1.5 rounded-full bg-brand px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#003a94]" onClick={() => setCreating(true)} type="button">
            <svg fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeWidth="2" viewBox="0 0 24 24" width="16"><path d="M12 5v14M5 12h14" /></svg>
            Novo projeto
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                <th className="px-4 py-3">Projeto</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Início</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 w-56">Progresso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {projects.map((project) => {
                const pct = project.taskCount > 0 ? Math.round((project.doneCount / project.taskCount) * 100) : 0;
                return (
                  <tr className="cursor-pointer transition hover:bg-slate-50" key={project.id} onClick={() => router.push(`/projetos/${project.id}`)}>
                    <td className="px-4 py-3 font-medium text-ink">
                      <Link className="hover:text-brand hover:underline" href={`/projetos/${project.id}`} onClick={(e) => e.stopPropagation()}>
                        {project.name || "Projeto sem nome"}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted">{project.crm_clients?.name ?? "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted">{fmtDate(project.start_date)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded px-2 py-0.5 text-[11px] font-semibold ${STATUS_META[project.status].className}`}>
                        {STATUS_META[project.status].label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="w-16 shrink-0 text-right text-xs tabular-nums text-muted">{project.doneCount}/{project.taskCount}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {creating ? (
        <NewProjectModal clients={clients} companyId={companyId} onClose={() => setCreating(false)} onCreated={handleCreated} supabase={supabase} showToast={showToast} />
      ) : null}
    </main>
  );
}

function NewProjectModal({
  companyId,
  clients,
  supabase,
  showToast,
  onClose,
  onCreated
}: {
  companyId: string;
  clients: ClientOption[];
  supabase: ReturnType<typeof createClient>;
  showToast: (message: string, tone?: "success" | "error" | "info") => void;
  onClose: () => void;
  onCreated: (project: ProjectWithStats) => void;
}) {
  const [name, setName] = useState("");
  const [clientId, setClientId] = useState("");
  const [status, setStatus] = useState<CrmProjectStatus>("active");
  const [startDate, setStartDate] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!companyId) {
      showToast("Empresa não encontrada. Recarregue a página.", "error");
      return;
    }
    if (!name.trim()) {
      showToast("Dê um nome ao projeto.", "error");
      return;
    }
    setSaving(true);
    const { data, error } = await supabase
      .from("crm_projects")
      .insert({
        company_id: companyId,
        client_id: clientId || null,
        name: name.trim(),
        status,
        start_date: startDate || null
      })
      .select("*, crm_clients(name)")
      .single();
    setSaving(false);
    if (error || !data) {
      showToast("Não foi possível criar o projeto.", "error");
      return;
    }
    showToast("Projeto criado.", "success");
    onCreated({ ...(data as ProjectWithStats), taskCount: 0, doneCount: 0 });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button aria-label="Fechar" className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={onClose} type="button" />
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-lg font-bold text-ink">Novo projeto</h2>
          <button aria-label="Fechar" className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 ring-1 ring-black/5 transition hover:bg-slate-50 hover:text-ink" onClick={onClose} type="button"><svg fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeWidth="2" viewBox="0 0 24 24" width="16"><path d="M18 6 6 18M6 6l12 12" /></svg></button>
        </header>
        <div className="space-y-4 px-5 py-5">
          <Field label="Nome do projeto"><input autoFocus className={inputCls} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Site do cliente X" value={name} /></Field>
          <Field label="Cliente">
            <select className={inputCls} onChange={(e) => setClientId(e.target.value)} value={clientId}>
              <option value="">Sem cliente</option>
              {clients.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Data de início"><input className={inputCls} onChange={(e) => setStartDate(e.target.value)} type="date" value={startDate} /></Field>
            <Field label="Status">
              <select className={inputCls} onChange={(e) => setStatus(e.target.value as CrmProjectStatus)} value={status}>
                <option value="active">Ativo</option>
                <option value="on_hold">Em espera</option>
                <option value="done">Concluído</option>
                <option value="archived">Arquivado</option>
              </select>
            </Field>
          </div>
        </div>
        <footer className="flex items-center justify-end gap-2 border-t border-line px-5 py-4">
          <button className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 px-5 text-sm font-semibold text-ink transition hover:bg-slate-50" onClick={onClose} type="button">Cancelar</button>
          <button className="inline-flex h-11 items-center justify-center rounded-full bg-brand px-5 text-sm font-semibold text-white shadow-sm ring-1 ring-[#002D72]/20 transition hover:bg-[#003a94] disabled:opacity-60" disabled={saving} onClick={() => void save()} type="button">{saving ? "Criando…" : "Criar projeto"}</button>
        </footer>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (<label className="block"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>{children}</label>);
}
