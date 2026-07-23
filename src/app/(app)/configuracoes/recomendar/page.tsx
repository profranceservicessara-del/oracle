"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

// Configurações > Recomendar (indicação). Frontend-only: sem backend de referral,
// convites e estatísticas são placeholders seguros. O link é montado no cliente a
// partir do origin. Cópia usa navigator.clipboard quando disponível.

const REFERRAL_CODE = "REF-OMD429HD";
const STATS = [
  { label: "Convites enviados", value: "0", tone: "bg-amber-50 text-amber-600", hint: "Recomende a Oracle." },
  { label: "Contas criadas", value: "0", tone: "bg-rose-50 text-rose-600", hint: "Quem se inscreveu." },
  { label: "Clientes ativos", value: "0", tone: "bg-emerald-50 text-emerald-600", hint: "Muito obrigado!" }
];

export default function RecomendarPage() {
  const { showToast } = useToast();
  const [email, setEmail] = useState("");
  const [link, setLink] = useState(`https://app.oracle/?ref=${REFERRAL_CODE}`);

  useEffect(() => {
    setLink(`${window.location.origin}/?ref=${REFERRAL_CODE}`);
  }, []);

  function invite() {
    const value = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      showToast("Informe um e-mail válido.", "error");
      return;
    }
    setEmail("");
    showToast("Convite registrado. O envio será ativado em breve.", "success");
  }

  async function copyLink() {
    try {
      if (!navigator.clipboard) throw new Error("no clipboard");
      await navigator.clipboard.writeText(link);
      showToast("Link copiado.", "success");
    } catch {
      showToast("Não foi possível copiar o link.", "error");
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-1 py-2 md:py-0">
      <div className="mb-6 flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#EAF0FF] text-[#1D4ED8]">
          <svg fill="none" height="18" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" width="18">
            <rect height="5" rx="1" width="20" x="2" y="7" /><path d="M12 22V7" /><path d="M4 12v9a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-9" />
            <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" /><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
          </svg>
        </span>
        <div>
          <p className="text-sm font-semibold text-brand">Configurações</p>
          <h1 className="text-2xl font-semibold text-ink">Recomendar</h1>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-2xl bg-[#00153A] p-6 text-white shadow-sm">
          <span className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
          <span className="pointer-events-none absolute -bottom-12 right-6 h-28 w-28 rounded-full bg-[#F97316]/30" />
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold ring-1 ring-white/20">
            <svg fill="none" height="14" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" width="14">
              <rect height="5" rx="1" width="20" x="2" y="7" /><path d="M12 22V7" /><path d="M4 12v9a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-9" />
            </svg>
            Recomende a Oracle
          </span>
          <p className="relative mt-4 text-xl font-semibold leading-snug">Recomende a Oracle aos seus contatos</p>
          <p className="relative mt-2 text-sm text-white/70">Convide seus amigos, clientes ou parceiros para criar uma conta.</p>
        </div>

        {/* Invite */}
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
          <h2 className="font-semibold text-ink">Convide seus contatos</h2>
          <p className="mt-1 text-sm text-muted">Envie um convite por e-mail.</p>
          <div className="mt-3 flex gap-2">
            <Input
              className="flex-1"
              onChange={(event) => setEmail(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  invite();
                }
              }}
              placeholder="E-mail"
              type="email"
              value={email}
            />
            <Button onClick={invite} type="button">Convidar</Button>
          </div>
          <p className="mt-4 text-sm font-medium text-ink">Ou compartilhe seu link</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600 ring-1 ring-black/5" title={link}>
              {link}
            </span>
            <button
              aria-label="Copiar link"
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-brand ring-1 ring-inset ring-slate-200 transition hover:bg-slate-50"
              onClick={() => void copyLink()}
              type="button"
            >
              <svg fill="none" height="15" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" viewBox="0 0 24 24" width="15">
                <rect height="13" rx="2" ry="2" width="13" x="9" y="9" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              Copiar
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        {STATS.map((stat) => (
          <div className="rounded-2xl bg-white p-5 text-center shadow-sm ring-1 ring-black/5" key={stat.label}>
            <span className={`mx-auto flex h-11 w-11 items-center justify-center rounded-full text-lg font-bold ${stat.tone}`}>
              {stat.value}
            </span>
            <p className="mt-3 font-semibold text-ink">{stat.label}</p>
            <p className="mt-0.5 text-xs text-muted">{stat.hint}</p>
          </div>
        ))}
      </div>

      <p className="mt-4 px-1 text-xs text-muted">
        Programa de indicação em pré-visualização — os convites e recompensas serão ativados em breve.
      </p>
    </main>
  );
}
