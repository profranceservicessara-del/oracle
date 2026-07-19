"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import type { AdvisorRequest, AdvisorRequestStatus } from "@/lib/types";

const MIN_LEN = 10;

const statusMeta: Record<AdvisorRequestStatus, { label: string; badge: string }> = {
  received: { label: "Recebida", badge: "bg-sky-50 text-sky-700 ring-sky-200" },
  in_review: { label: "Em análise", badge: "bg-amber-50 text-amber-700 ring-amber-200" },
  answered: { label: "Respondida", badge: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  closed: { label: "Encerrada", badge: "bg-slate-100 text-slate-600 ring-slate-200" }
};

function formatDate(iso: string): string {
  // yyyy-mm-dd -> dd/mm/yyyy (sem depender de locale do runtime)
  const d = iso.slice(0, 10).split("-");
  return d.length === 3 ? `${d[2]}/${d[1]}/${d[0]}` : iso;
}

export function ConselheiroClient({ initialRequests }: { initialRequests: AdvisorRequest[] }) {
  const supabase = useMemo(() => createClient(), []);
  const { showToast } = useToast();
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [requests, setRequests] = useState<AdvisorRequest[]>(initialRequests);

  const trimmed = message.trim();
  const tooShort = trimmed.length > 0 && trimmed.length < MIN_LEN;

  async function submit() {
    if (trimmed.length < MIN_LEN) {
      showToast(`Escreva ao menos ${MIN_LEN} caracteres.`, "error");
      return;
    }
    setSending(true);
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) {
      setSending(false);
      showToast("Sessão expirada. Faça login novamente.", "error");
      return;
    }
    const { data, error } = await supabase
      .from("advisor_requests")
      .insert({ user_id: user.id, message: trimmed })
      .select("*")
      .single();
    setSending(false);
    if (error || !data) {
      showToast("Não foi possível enviar. Tente novamente.", "error");
      return;
    }
    setRequests((cur) => [data as AdvisorRequest, ...cur]);
    setMessage("");
    showToast("Mensagem enviada. Responderemos em até 48 horas.", "success");
    // Notifica a equipe por email (best-effort). Não afeta o fluxo do cliente
    // se o email falhar ou o Resend não estiver configurado.
    void fetch("/api/advisor/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: trimmed })
    }).catch(() => {});
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Gestão</p>
        <h1 className="mt-1 text-2xl font-semibold text-ink">Meu Conselheiro</h1>
        <p className="mt-1 text-sm text-muted">Precisa de ajuda ou orientação? Envie uma mensagem e nossa equipe responde.</p>
      </div>

      {/* Card de envio */}
      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
        <h2 className="text-lg font-semibold text-ink">Envie-nos uma mensagem</h2>
        <p className="mt-1 text-sm text-muted">Entraremos em contato com você em até 48 horas. Envie sua pergunta.</p>

        <label className="mt-5 block text-sm font-medium text-ink" htmlFor="advisor-message">
          Digite sua mensagem aqui
        </label>
        <textarea
          className="mt-2 min-h-[160px] w-full resize-y rounded-xl border border-line bg-white px-4 py-3 text-sm text-ink shadow-sm outline-none transition placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/20"
          id="advisor-message"
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Digite sua mensagem aqui"
          value={message}
        />
        {tooShort ? <p className="mt-1 text-xs text-red-600">Escreva ao menos {MIN_LEN} caracteres.</p> : null}

        <div className="mt-4 flex justify-end">
          <Button disabled={sending || trimmed.length < MIN_LEN} onClick={() => void submit()} type="button">
            {sending ? "Enviando…" : "Enviar minha mensagem"}
          </Button>
        </div>

        <p className="mt-4 text-xs text-muted">
          O Oracle coleta e processa seus dados para responder à sua solicitação. Consulte nossa{" "}
          <Link className="font-medium text-brand hover:underline" href="/politique-de-confidentialite">política de privacidade</Link> para mais informações.
        </p>
      </section>

      {/* Histórico */}
      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold text-ink">Minhas solicitações</h2>
        {requests.length === 0 ? (
          <div className="rounded-2xl bg-white px-6 py-10 text-center shadow-sm ring-1 ring-black/5">
            <p className="text-sm text-muted">Você ainda não enviou nenhuma solicitação.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {requests.map((r) => {
              const meta = statusMeta[r.status];
              return (
                <li className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5" key={r.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs text-muted">{formatDate(r.created_at)}</p>
                      {r.kind === "declaration_review" ? (
                        <span className="rounded-full bg-[#EEF2FF] px-2 py-0.5 text-[10px] font-semibold text-[#4F46E5] ring-1 ring-inset ring-[#E0E7FF]">Revisão de declaração</span>
                      ) : null}
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${meta.badge}`}>{meta.label}</span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-ink">{r.message}</p>
                  {r.kind === "declaration_review" && r.context ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {r.context.periodo ? <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">Período: {r.context.periodo}</span> : null}
                      {r.context.total_confirmado ? <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">Total: {r.context.total_confirmado}</span> : null}
                      {typeof r.context.confianca === "number" ? <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">Confiança: {r.context.confianca}%</span> : null}
                      {typeof r.context.pendencias === "number" ? <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">Pendências: {r.context.pendencias}</span> : null}
                    </div>
                  ) : null}
                  {r.admin_response ? (
                    <div className="mt-3 rounded-xl bg-slate-50 p-3 ring-1 ring-black/5">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Resposta da equipe</p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-ink">{r.admin_response}</p>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
