// Configurações > Integrações (rota /configuracoes/dados preservada). Exportação
// de dados e exclusão da conta (RGPD) vivem agora na página Perfil, aqui ficam
// apenas as integrações (VITRINE).
//
// A integração ainda não existe: guardar o token exige coluna nova em profiles e
// tratamento seguro do segredo no backend. Até lá a tela não pede o token, para
// ninguém colar um segredo que seria descartado.
export function DadosClient() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <p className="text-sm font-semibold text-brand">Configurações</p>
        <h1 className="mt-2 text-2xl font-semibold text-ink">Integrações</h1>
        <p className="mt-2 text-sm text-muted">Conecte o Oracle às suas ferramentas externas.</p>
      </div>

      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Integrações</p>
            <h2 className="mt-1 text-lg font-semibold text-ink">Integração com VITRINE</h2>
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Em breve
          </span>
        </div>
        <p className="mt-2 text-sm leading-6 text-muted">
          Se você usa a VITRINE, esta integração vai autorizar o Oracle a recuperar as informações das suas missões
          realizadas na VITRINE e automatizar o tratamento contábil.
        </p>
        <p className="mt-3 text-sm leading-6 text-muted">
          Ela ainda não está disponível. Quando estiver, você poderá conectar sua conta por aqui.
        </p>
      </section>
    </main>
  );
}
