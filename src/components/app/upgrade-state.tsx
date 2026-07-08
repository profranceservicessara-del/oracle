import Link from "next/link";
import { planLabels, type PlanTier } from "@/lib/plan";

// Estado de upgrade premium — renderizado no lugar da feature bloqueada.
// Calmo, sem paywall agressivo. CTA -> /configuracoes/pagamentos.

export function UpgradeState({
  requiredPlan,
  title,
  description
}: {
  requiredPlan: PlanTier;
  title?: string;
  description?: string;
}) {
  const planName = planLabels[requiredPlan];
  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <div className="flex flex-col items-center rounded-2xl bg-white px-6 py-12 text-center shadow-sm ring-1 ring-black/5">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#EAF1FF] to-[#EEEAFF] text-[#4F46E5] ring-1 ring-black/5">
          <svg fill="none" height="26" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" viewBox="0 0 24 24" width="26">
            <rect height="11" rx="2" width="18" x="3" y="11" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </span>
        <span className="mt-4 rounded-full bg-[#EEF2FF] px-3 py-1 text-xs font-semibold text-[#4F46E5] ring-1 ring-inset ring-[#E0E7FF]">
          Plano {planName}
        </span>
        <h1 className="mt-3 text-xl font-semibold text-ink">{title ?? `Recurso do plano ${planName}`}</h1>
        <p className="mt-2 max-w-sm text-sm text-muted">
          {description ?? `Faça upgrade para o plano ${planName} e desbloqueie este recurso.`}
        </p>
        <Link
          className="mt-6 inline-flex items-center justify-center rounded-xl bg-[#1D4ED8] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1743B8]"
          href="/configuracoes/pagamentos"
        >
          Ver planos
        </Link>
      </div>
    </main>
  );
}
