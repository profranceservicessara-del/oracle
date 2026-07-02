"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

// Configurações > Integrações (rota /configuracoes/dados preservada). Exportação
// de dados e exclusão da conta (RGPD) vivem agora na página Perfil — aqui ficam
// apenas as integrações (VITRINE).
export function DadosClient() {
  const { showToast } = useToast();
  const [vitrineToken, setVitrineToken] = useState("");

  function saveVitrineToken() {
    // TODO: Persistir o token VITRINE (requer coluna nova em profiles + tratamento seguro do segredo no backend).
    showToast("Integração VITRINE será conectada em breve.", "info");
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <p className="text-sm font-semibold text-brand">Configurações</p>
        <h1 className="mt-2 text-2xl font-semibold text-ink">Integrações</h1>
        <p className="mt-2 text-sm text-muted">Conecte o Oracle às suas ferramentas externas.</p>
      </div>

      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Integrações</p>
        <h2 className="mt-1 text-lg font-semibold text-ink">Integração com VITRINE</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          Se você usa a VITRINE, ative esta integração para autorizar o Oracle a recuperar as
          informações das suas missões realizadas na VITRINE e automatizar o tratamento contábil.
        </p>
        <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600 ring-1 ring-black/5">
          <p className="font-medium text-ink">Gere um token na sua conta VITRINE:</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>Acesse “Parâmetros da conta”.</li>
            <li>Abra a aba “API Keys”.</li>
            <li>Gere um novo token e copie.</li>
          </ol>
        </div>
        <div className="mt-4 flex items-start gap-2 rounded-xl bg-[#002D72]/5 p-3 text-sm text-[#002D72] ring-1 ring-[#002D72]/10">
          <svg aria-hidden="true" className="mt-0.5 shrink-0" fill="none" height="18" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" width="18">
            <circle cx="12" cy="12" r="9" />
            <line x1="12" x2="12" y1="11" y2="16" />
            <line x1="12" x2="12" y1="8" y2="8" />
          </svg>
          <span>Apenas as prestações realizadas após o registro do seu RIB na VITRINE serão consideradas.</span>
        </div>
        {/* TODO: Persistir o Token VITRINE (requer coluna nova em profiles + tratamento seguro do segredo no backend). */}
        <label className="mt-4 block text-sm font-medium text-ink">
          Token VITRINE
          <Input
            className="mt-2"
            onChange={(event) => setVitrineToken(event.target.value)}
            placeholder="Cole seu token VITRINE"
            value={vitrineToken}
          />
        </label>
        <div className="mt-4 flex justify-end">
          <Button disabled={!vitrineToken.trim()} onClick={saveVitrineToken} type="button">
            Salvar
          </Button>
        </div>
      </section>
    </main>
  );
}
