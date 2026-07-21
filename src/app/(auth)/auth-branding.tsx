// Painel esquerdo de branding compartilhado entre /login e /cadastro:
// foto de fundo com véu escuro e a proposta de valor. Server component.

const FEATURES = [
  "Faturas e orçamentos conformes",
  "Livro de receitas automático",
  "Declaração URSSAF preparada",
  "Conselheiro humano em até 48h"
];

export function AuthBranding() {
  return (
    <aside className="relative hidden w-1/2 overflow-hidden bg-gradient-to-br from-[#020D2C] via-[#0A2352] to-[#122C6E] lg:flex lg:flex-col lg:justify-between lg:p-12">
      {/* Foto de fundo. O gradiente do <aside> permanece como fallback. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-cover"
        style={{
          backgroundImage: "url('/illustrations/login-hero.jpg')",
          // Foco no rosto: o painel é vertical, então o corte é horizontal.
          backgroundPosition: "58% center"
        }}
      />
      {/* Véu escuro: garante contraste do texto branco sobre a foto clara. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#020D2C]/95 via-[#031339]/80 to-[#0A2352]/35" />
      <div className="relative z-10">
        <p className="text-xl font-semibold tracking-tight text-white">Oracle</p>
        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/50">Sistema financeiro</p>
      </div>
      <div className="relative z-10">
        <h2 className="max-w-md text-3xl font-semibold leading-tight text-white">
          Gestão fiscal francesa, em português.
        </h2>
        <ul className="mt-6 space-y-3">
          {FEATURES.map((f) => (
            <li className="flex items-center gap-3 text-sm text-white/85" key={f}>
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 ring-1 ring-inset ring-white/20">
                <svg fill="none" height="13" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" viewBox="0 0 24 24" width="13"><path d="M20 6 9 17l-5-5" /></svg>
              </span>
              {f}
            </li>
          ))}
        </ul>
      </div>
      <p className="relative z-10 text-xs text-white/45">
        Feito para autoempreendedores brasileiros na França.
      </p>
    </aside>
  );
}
