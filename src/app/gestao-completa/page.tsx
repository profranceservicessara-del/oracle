import Link from "next/link";
import { ContactForm } from "./contact-form";

// Página pública "Falar com especialistas" (Gestão completa). Sem auth: é um
// formulário de contato para visitantes. O envio vai por email (Resend) na
// rota /api/contact; nada é gravado no banco.
export const dynamic = "force-dynamic";

const trust = [
  "Especialistas dedicados ao seu regime (AE ou BTP)",
  "Do faturamento à declaração da Urssaf, cuidamos de tudo",
  "Suporte humano, em português, quando você precisar"
];

export default function GestaoCompletaPage({ searchParams }: { searchParams: { tipo?: string } }) {
  const tipo = searchParams?.tipo === "btp" ? "btp" : "ae";

  return (
    <div className="min-h-screen bg-[#F7F8FC] text-ink">
      <header className="border-b border-black/5 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <Link className="text-lg font-semibold text-ink" href="/">Oracle</Link>
          <Link className="text-sm font-medium text-muted transition hover:text-ink" href="/planos">Ver planos</Link>
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl items-start gap-10 px-4 py-12 lg:grid-cols-2 lg:py-16">
        <div>
          <span className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-medium text-muted ring-1 ring-black/5">
            Demonstração sem compromisso
          </span>
          <h1 className="mt-4 text-3xl font-semibold leading-tight text-ink sm:text-4xl">
            Escolha um <span className="text-brand">parceiro de confiança</span> para sua gestão
          </h1>
          <p className="mt-4 max-w-md text-sm leading-7 text-muted">
            Prefere delegar a parte administrativa? Nossa equipe cuida da sua gestão completa para você focar no que importa: seus clientes. Deixe seus dados e a gente entra em contato.
          </p>
          <ul className="mt-6 space-y-3">
            {trust.map((item) => (
              <li className="flex items-start gap-2.5 text-sm text-slate-700" key={item}>
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <svg fill="none" height="12" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" viewBox="0 0 24 24" width="12"><path d="M20 6 9 17l-5-5" /></svg>
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <ContactForm initialTipo={tipo} />
      </main>
    </div>
  );
}
