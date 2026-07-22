"use client";

import { useState } from "react";

const field =
  "h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-ink outline-none transition placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/20";

export function ContactForm({ initialTipo }: { initialTipo: "ae" | "btp" }) {
  const [nome, setNome] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [tipo, setTipo] = useState<"ae" | "btp">(initialTipo);
  const [mensagem, setMensagem] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState("");

  async function submit() {
    setError("");
    if (!nome.trim() || !email.trim() || !telefone.trim()) {
      setError("Preencha nome, email e telefone.");
      return;
    }
    setStatus("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, empresa, email, telefone, tipo, mensagem })
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok && res.status !== 200) {
        setStatus("idle");
        setError(data.error ?? "Não foi possível enviar. Tente novamente em instantes.");
        return;
      }
      setStatus("done");
    } catch {
      setStatus("idle");
      setError("Não foi possível enviar. Verifique sua conexão e tente de novo.");
    }
  }

  if (status === "done") {
    return (
      <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-black/5">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <svg fill="none" height="24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" viewBox="0 0 24 24" width="24"><path d="M20 6 9 17l-5-5" /></svg>
        </span>
        <h2 className="mt-4 text-xl font-semibold text-ink">Pedido enviado!</h2>
        <p className="mt-2 text-sm text-muted">
          Nossa equipe vai entrar em contato pelo email ou telefone que você informou. Obrigado.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5 sm:p-8">
      <h2 className="text-center text-xl font-semibold text-ink">Solicite seu contato</h2>
      <p className="mt-1 text-center text-sm text-muted">Nossa equipe retorna para agendar uma conversa.</p>
      <form
        className="mt-6 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <label className="block text-sm font-medium text-ink">
          Nome
          <input className={`mt-1.5 ${field}`} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome" value={nome} />
        </label>
        <label className="block text-sm font-medium text-ink">
          Empresa
          <input className={`mt-1.5 ${field}`} onChange={(e) => setEmpresa(e.target.value)} placeholder="Nome da empresa (opcional)" value={empresa} />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-ink">
            Email
            <input autoComplete="email" className={`mt-1.5 ${field}`} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" type="email" value={email} />
          </label>
          <label className="block text-sm font-medium text-ink">
            Telefone
            <input className={`mt-1.5 ${field}`} onChange={(e) => setTelefone(e.target.value)} placeholder="+33 ..." value={telefone} />
          </label>
        </div>
        <label className="block text-sm font-medium text-ink">
          Qual gestão completa você quer?
          <select className={`mt-1.5 ${field}`} onChange={(e) => setTipo(e.target.value as "ae" | "btp")} value={tipo}>
            <option value="ae">Gestão completa para AE (auto-entrepreneur)</option>
            <option value="btp">Gestão completa para BTP (construção)</option>
          </select>
        </label>
        <label className="block text-sm font-medium text-ink">
          Mensagem
          <textarea className="mt-1.5 min-h-[96px] w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-ink outline-none transition placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/20" onChange={(e) => setMensagem(e.target.value)} placeholder="Conte um pouco sobre seu negócio (opcional)" value={mensagem} />
        </label>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <button
          className="h-12 w-full rounded-2xl bg-brand text-sm font-semibold text-white shadow-sm ring-1 ring-[#002D72]/20 transition hover:bg-[#003a94] active:bg-[#001F4D] disabled:opacity-60"
          disabled={status === "sending"}
          type="submit"
        >
          {status === "sending" ? "Enviando…" : "Enviar pedido de contato"}
        </button>
        <p className="text-center text-xs text-muted">Sem compromisso. Seus dados são usados só para este contato.</p>
      </form>
    </div>
  );
}
