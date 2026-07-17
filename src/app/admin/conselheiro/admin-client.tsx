"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AdvisorRequest, AdvisorRequestStatus } from "@/lib/types";
import { respondAdvisorRequestAction } from "./actions";

const STATUS_LABELS: Record<AdvisorRequestStatus, string> = {
  received: "Recebida",
  in_review: "Em análise",
  answered: "Respondida",
  closed: "Encerrada"
};

function fmt(iso: string): string {
  const p = iso.slice(0, 10).split("-");
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : iso;
}

function Row({ req }: { req: AdvisorRequest }) {
  const router = useRouter();
  const [response, setResponse] = useState(req.admin_response ?? "");
  const [status, setStatus] = useState<string>(req.status);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function save() {
    startTransition(async () => {
      const r = await respondAdvisorRequestAction(req.id, response, status);
      setMsg(r.error ?? "Salvo.");
      if (r.ok) router.refresh();
    });
  }

  return (
    <li className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted">{fmt(req.created_at)}</span>
          {req.kind === "declaration_review" ? (
            <span className="rounded-full bg-[#EEF2FF] px-2 py-0.5 text-[10px] font-semibold text-[#4F46E5] ring-1 ring-inset ring-[#E0E7FF]">Revisão de declaração</span>
          ) : (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">Suporte</span>
          )}
          <span className="font-mono text-[10px] text-slate-400">user {req.user_id.slice(0, 8)}…</span>
        </div>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">{STATUS_LABELS[req.status]}</span>
      </div>

      <p className="mt-2 whitespace-pre-wrap text-sm text-ink">{req.message}</p>

      {req.kind === "declaration_review" && req.context ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {req.context.periodo ? <span className="rounded-full bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600 ring-1 ring-inset ring-slate-200">Período: {req.context.periodo}</span> : null}
          {req.context.total_confirmado ? <span className="rounded-full bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600 ring-1 ring-inset ring-slate-200">Total: {req.context.total_confirmado}</span> : null}
          {typeof req.context.confianca === "number" ? <span className="rounded-full bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600 ring-1 ring-inset ring-slate-200">Confiança: {req.context.confianca}%</span> : null}
          {typeof req.context.pendencias === "number" ? <span className="rounded-full bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600 ring-1 ring-inset ring-slate-200">Pendências: {req.context.pendencias}</span> : null}
          {req.context.periodicidade ? <span className="rounded-full bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600 ring-1 ring-inset ring-slate-200">Periodicidade: {req.context.periodicidade}</span> : null}
        </div>
      ) : null}

      <div className="mt-3 grid gap-2">
        <textarea
          className="min-h-[70px] w-full resize-y rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
          onChange={(e) => setResponse(e.target.value)}
          placeholder="Resposta ao usuário…"
          value={response}
        />
        <div className="flex flex-wrap items-center gap-2">
          <select className="rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink" onChange={(e) => setStatus(e.target.value)} value={status}>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <button
            className="rounded-xl bg-[#1D4ED8] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1743B8] disabled:opacity-50"
            disabled={pending}
            onClick={save}
            type="button"
          >
            {pending ? "Salvando…" : "Salvar"}
          </button>
          {msg ? <span className="text-xs text-muted">{msg}</span> : null}
        </div>
      </div>
    </li>
  );
}

export function AdminConselheiroClient({ requests, adminEmail }: { requests: AdvisorRequest[]; adminEmail: string }) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Admin · {adminEmail}</p>
        <h1 className="mt-1 text-2xl font-semibold text-ink">Inbox do Conselheiro</h1>
        <p className="mt-1 text-sm text-muted">Solicitações de suporte e revisão de declaração. Responda e atualize o status.</p>
      </div>
      {requests.length === 0 ? (
        <div className="rounded-2xl bg-white px-6 py-12 text-center shadow-sm ring-1 ring-black/5">
          <p className="text-sm text-muted">Nenhuma solicitação ainda.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {requests.map((r) => (
            <Row key={r.id} req={r} />
          ))}
        </ul>
      )}
    </main>
  );
}
