"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ASSISTANT_INTRO, DECLARATION_FAQ, type FaqEntry } from "@/lib/assistant/declaration-faq";

type ChatMsg =
  | { role: "assistant"; text: string; link?: FaqEntry["link"] }
  | { role: "user"; text: string };

const QUICK_ACTIONS = [
  { label: "Ver minha declaração", href: "/urssaf" },
  { label: "Configurar URSSAF", href: "/urssaf/configuracao" },
  { label: "Falar com o Conselheiro", href: "/conselheiro" }
];

const FALLBACK_MSG =
  "O assistente está indisponível no momento. Você pode usar as perguntas frequentes acima ou falar com o Conselheiro.";

export function AssistenteClient() {
  const faqOk = Array.isArray(DECLARATION_FAQ) && DECLARATION_FAQ.length > 0;
  const [messages, setMessages] = useState<ChatMsg[]>([{ role: "assistant", text: ASSISTANT_INTRO }]);
  const [asked, setAsked] = useState<Set<string>>(new Set());
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const inFlight = useRef(false);

  function ask(entry: FaqEntry) {
    setMessages((cur) => [
      ...cur,
      { role: "user", text: entry.question },
      { role: "assistant", text: entry.answer, link: entry.link }
    ]);
    setAsked((cur) => new Set(cur).add(entry.id));
  }

  async function send() {
    const text = input.trim();
    if (!text || inFlight.current) return;
    inFlight.current = true;
    setStreaming(true);
    setInput("");

    // Histórico enviado ao servidor (só role+content textual).
    const history = [...messages, { role: "user" as const, text }].map((m) => ({ role: m.role, content: m.text }));
    setMessages((cur) => [...cur, { role: "user", text }, { role: "assistant", text: "" }]);

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history })
      });
      if (!res.ok || !res.body) {
        setMessages((cur) => {
          const next = [...cur];
          next[next.length - 1] = { role: "assistant", text: FALLBACK_MSG };
          return next;
        });
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((cur) => {
          const next = [...cur];
          next[next.length - 1] = { role: "assistant", text: acc };
          return next;
        });
      }
      if (!acc.trim()) {
        setMessages((cur) => {
          const next = [...cur];
          next[next.length - 1] = { role: "assistant", text: FALLBACK_MSG };
          return next;
        });
      }
    } catch {
      setMessages((cur) => {
        const next = [...cur];
        next[next.length - 1] = { role: "assistant", text: FALLBACK_MSG };
        return next;
      });
    } finally {
      inFlight.current = false;
      setStreaming(false);
    }
  }

  const remaining = DECLARATION_FAQ.filter((e) => !asked.has(e.id));

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      {/* Header */}
      <div className="mb-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Gestão</p>
          <span className="rounded-full bg-[#EEF2FF] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#4F46E5] ring-1 ring-inset ring-[#E0E7FF]">Premium</span>
        </div>
        <h1 className="mt-1 text-2xl font-semibold text-ink">Assistente de Declarações</h1>
        <p className="mt-1 text-sm text-muted">Entenda sua declaração, revise pendências e prepare suas informações com mais segurança.</p>
      </div>

      {/* Disclaimer */}
      <div className="mb-5 flex items-start gap-2.5 rounded-xl bg-amber-50 p-4 text-sm text-amber-800 ring-1 ring-amber-200">
        <svg className="mt-0.5 shrink-0" fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" width="16">
          <circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" />
        </svg>
        O Assistente ajuda a explicar e organizar as informações do Oracle. Ele não envia declarações à URSSAF e não substitui a revisão do Conselheiro.
      </div>

      {/* Chat */}
      <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
        <div className="flex flex-col gap-3 p-4 sm:p-5">
          {messages.map((m, i) =>
            m.role === "assistant" ? (
              <div className="flex gap-2.5" key={i}>
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#EAF1FF] to-[#EEEAFF] text-[#4F46E5] ring-1 ring-black/5">
                  <svg fill="none" height="15" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" width="15"><path d="M12 8V4M8 8h8a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2Z" /><path d="M9 13h.01M15 13h.01" /></svg>
                </span>
                <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-slate-50 px-4 py-2.5 text-sm text-ink ring-1 ring-black/5">
                  <p className="whitespace-pre-wrap leading-relaxed">{m.text}</p>
                  {m.link ? (
                    <Link className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline" href={m.link.href}>
                      {m.link.label} →
                    </Link>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="flex justify-end" key={i}>
                <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-brand px-4 py-2.5 text-sm font-medium text-white">{m.text}</div>
              </div>
            )
          )}

          {/* Perguntas guiadas */}
          {faqOk ? (
            remaining.length > 0 ? (
              <div className="mt-1 flex flex-col gap-2 border-t border-line pt-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Perguntas frequentes</p>
                <div className="flex flex-wrap gap-2">
                  {remaining.map((e) => (
                    <button
                      className="rounded-full bg-white px-3 py-1.5 text-left text-xs font-semibold text-slate-600 ring-1 ring-inset ring-slate-200 transition hover:bg-slate-50 hover:text-ink"
                      key={e.id}
                      onClick={() => ask(e)}
                      type="button"
                    >
                      {e.question}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-1 border-t border-line pt-3 text-center text-xs text-muted">
                Você viu todas as explicações. Precisa de algo específico? Fale com o Conselheiro.
              </div>
            )
          ) : (
            <div className="mt-1 border-t border-line pt-3 text-center text-sm text-muted">
              As explicações estão indisponíveis no momento. Você ainda pode falar com o Conselheiro.
            </div>
          )}
        </div>

        {/* Pergunta livre (Assistente) */}
        <form
          className="border-t border-line bg-slate-50 px-4 py-4 sm:px-5"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <div className="flex items-end gap-2">
            <textarea
              className="min-h-[44px] w-full resize-none rounded-xl border border-line bg-white px-3 py-2.5 text-sm text-ink shadow-sm outline-none transition placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/20"
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              placeholder="Faça uma pergunta sobre sua declaração…"
              rows={1}
              value={input}
            />
            <button
              className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl bg-[#1D4ED8] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1743B8] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={streaming || input.trim().length === 0}
              type="submit"
            >
              {streaming ? "…" : "Enviar"}
            </button>
          </div>
          <p className="mt-2 text-[11px] text-muted">
            Respostas geradas por IA sobre o funcionamento do Oracle. Para revisão da sua declaração, {""}
            <Link className="font-medium text-brand hover:underline" href="/conselheiro">fale com o Conselheiro</Link> (resposta em até 48h).
          </p>
        </form>
      </section>

      {/* Ações rápidas */}
      <div className="mt-5 grid gap-2 sm:grid-cols-3">
        {QUICK_ACTIONS.map((a) => (
          <Link
            className="flex items-center justify-between gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-medium text-ink shadow-sm ring-1 ring-black/5 transition hover:bg-slate-50"
            href={a.href}
            key={a.href}
          >
            {a.label}
            <svg className="shrink-0 text-slate-300" fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="16"><path d="m9 18 6-6-6-6" /></svg>
          </Link>
        ))}
      </div>
    </main>
  );
}
