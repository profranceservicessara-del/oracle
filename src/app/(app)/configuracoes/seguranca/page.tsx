"use client";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export default function SegurancaPage() {
  const { showToast } = useToast();

  // TODO: Conectar backend (alterar senha via supabase.auth.updateUser; listar sessões/dispositivos). UI pronta.
  function notImplemented() {
    showToast("Disponível em breve.", "info");
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <p className="text-sm font-semibold text-brand">Configurações</p>
        <h1 className="mt-2 text-2xl font-semibold text-ink">Segurança</h1>
        <p className="mt-2 text-sm text-muted">Proteja o acesso à sua conta Oracle.</p>
      </div>

      <div className="flex items-start gap-3 rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-200">
        <svg aria-hidden="true" className="mt-0.5 shrink-0 text-emerald-600" fill="none" height="20" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="20">
          <path d="M20 6 9 17l-5-5" />
        </svg>
        <div>
          <p className="font-semibold text-emerald-800">Conta protegida</p>
          <p className="mt-1 text-sm text-emerald-700">Você acessa o Oracle com email e senha.</p>
        </div>
      </div>

      <section className="mt-6">
        <h2 className="text-lg font-semibold text-ink">Segurança da sua conta</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          A segurança da sua conta depende, em primeiro lugar, da sua vigilância. Para reduzir riscos,
          recomendamos ativar as proteções abaixo.
        </p>
        <div className="mt-4 flex items-start gap-3 rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200">
          <svg aria-hidden="true" className="mt-0.5 shrink-0 text-amber-600" fill="none" height="20" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="20">
            <circle cx="12" cy="12" r="9" />
            <line x1="12" x2="12" y1="8" y2="13" />
            <line x1="12" x2="12" y1="16" y2="16" />
          </svg>
          <div>
            <p className="font-semibold text-amber-800">Lembrete</p>
            <p className="mt-1 text-sm text-amber-700">
              A equipe Oracle nunca pedirá informações sensíveis. Se detectarmos algum problema de
              segurança, entraremos em contato por email ou diretamente no aplicativo.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-semibold text-ink">Módulos de segurança</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
            <h3 className="font-semibold text-ink">Senha</h3>
            <p className="mt-2 text-sm leading-6 text-muted">
              Crie ou altere a senha de acesso à sua conta.
            </p>
            <Button className="mt-4" onClick={notImplemented} type="button" variant="secondary">
              Alterar senha
            </Button>
          </div>
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
            <h3 className="font-semibold text-ink">Dispositivos conectados</h3>
            <p className="mt-2 text-sm leading-6 text-muted">
              Veja os dispositivos conectados à sua conta Oracle.
            </p>
            <Button className="mt-4" onClick={notImplemented} type="button" variant="secondary">
              Ver lista
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
