"use client";

import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";

// Gestão > Meu Conselheiro. Frontend-safe: não há backend de contato/mensagem no
// projeto, então o envio mostra um estado de sucesso local (nada é persistido).

export default function ConselheiroPage() {
  const { showToast } = useToast();
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [sent, setSent] = useState(false);

  function submit() {
    if (!message.trim()) {
      setError(true);
      return;
    }
    setError(false);
    setMessage("");
    setSent(true);
    showToast("Mensagem enviada. Nosso time entrará em contato em até 48 horas.", "success");
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <p className="text-sm font-semibold text-brand">Gestão</p>
        <h1 className="mt-1 text-2xl font-semibold text-ink">Meu Conselheiro</h1>
        <p className="mt-2 text-sm text-muted">Envie sua dúvida e receba orientação personalizada para sua atividade.</p>
      </div>

      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5 sm:p-8">
        <h2 className="text-xl font-semibold text-ink">Envie-nos uma mensagem</h2>
        <p className="mt-1 text-sm text-muted">Entraremos em contato com você em até 48 horas! Envie sua pergunta.</p>

        {sent ? (
          <div className="mt-6 flex items-start gap-3 rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-200">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-xs text-white">✓</span>
            <div>
              <p className="font-semibold text-emerald-800">Mensagem enviada.</p>
              <p className="mt-1 text-sm text-emerald-700">Nosso time entrará em contato em até 48 horas.</p>
              <button className="mt-2 text-sm font-semibold text-emerald-700 underline-offset-2 hover:underline" onClick={() => setSent(false)} type="button">
                Enviar outra mensagem
              </button>
            </div>
          </div>
        ) : (
          <form
            className="mt-6"
            onSubmit={(event) => {
              event.preventDefault();
              submit();
            }}
          >
            <label className="block text-sm font-medium text-ink" htmlFor="conselheiro-msg">
              Digite sua mensagem aqui
            </label>
            <Textarea
              className="mt-2 min-h-48"
              id="conselheiro-msg"
              onChange={(event) => {
                setMessage(event.target.value);
                if (error) setError(false);
              }}
              placeholder="Digite sua mensagem aqui"
              value={message}
            />
            {error ? <p className="mt-1.5 text-sm text-red-600">Escreva sua mensagem antes de enviar.</p> : null}

            <div className="mt-4 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-md text-xs leading-5 text-muted">
                O portal Auto-Entrepreneur coleta e processa seus dados pessoais. Para mais informações, consulte nossa{" "}
                <a className="font-medium text-brand hover:underline" href="/configuracoes/dados">política de privacidade clicando aqui</a>.
              </p>
              <button
                className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-[#5B4BE0] to-[#3B5BFF] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!message.trim()}
                type="submit"
              >
                Envie minha mensagem ⚡
              </button>
            </div>
          </form>
        )}
      </section>

      <div className="mt-4 flex items-start gap-3 rounded-2xl bg-white p-4 text-sm shadow-sm ring-1 ring-black/5">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EAF0FF] text-[#1D4ED8]">💡</span>
        <p className="text-muted">
          Para questões urgentes, verifique também seus documentos, declarações e dados fiscais antes de enviar sua pergunta.
        </p>
      </div>
    </main>
  );
}
