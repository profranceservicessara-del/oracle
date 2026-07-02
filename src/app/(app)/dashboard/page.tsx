import Link from "next/link";
import { redirect } from "next/navigation";
import { fiscalConfig } from "@/config/fiscal";
import {
  activityCategories,
  categoryLabel,
  currentQuarterRange,
  emptyCategoryTotals,
  monthRanges,
  nextUrssafDeadline,
  periodOptions,
  roundCurrency,
  sumCategoryTotals,
  totalCategoryAmount,
  yearRange,
  type CategoryTotals
} from "@/lib/accounting";
import { fetchRevenueBookRows } from "@/lib/accounting-data";
import { calculateResteAVivre } from "@/lib/document-calculations";
import { createClient } from "@/lib/supabase/server";
import type { ActivityCategory, Document, Profile } from "@/lib/types";

const euroFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "EUR"
});

function isProfileIncomplete(profile: Profile | null) {
  if (!profile) {
    return true;
  }

  return (
    !profile.nome ||
    !profile.adresse_rue ||
    !profile.adresse_cp ||
    !profile.adresse_ville ||
    !profile.siret
  );
}

function incompleteProfileFields(profile: Profile | null) {
  if (!profile) {
    return ["nome", "endereço", "SIRET"];
  }

  return [
    !profile.nome ? "nome" : null,
    !profile.adresse_rue ? "rua" : null,
    !profile.adresse_cp ? "código postal" : null,
    !profile.adresse_ville ? "cidade" : null,
    !profile.siret ? "SIRET" : null
  ].filter(Boolean) as string[];
}

function serviceCategory(category: ActivityCategory) {
  return category === "vente" ? "vente" : "service";
}

function microThreshold(category: ActivityCategory) {
  return category === "vente"
    ? fiscalConfig.microEnterpriseThresholds.vente
    : fiscalConfig.microEnterpriseThresholds.service;
}

function tvaThresholds(category: ActivityCategory) {
  const key = serviceCategory(category);
  return fiscalConfig.vatFranchiseThresholds[key];
}

function thresholdPercent(value: number, threshold: number) {
  if (threshold <= 0) {
    return 0;
  }

  return Math.min(100, roundCurrency((value / threshold) * 100));
}

function alertTone(ratio: number) {
  if (ratio >= fiscalConfig.monitoring.tvaCriticalRatio) {
    return "border-red-200 bg-red-50 text-red-800";
  }

  if (ratio >= fiscalConfig.monitoring.tvaWarningRatio) {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  if (ratio >= fiscalConfig.monitoring.tvaInfoRatio) {
    return "border-sky-200 bg-sky-50 text-sky-800";
  }

  return null;
}

function daysUntil(date: string) {
  const today = new Date();
  const target = new Date(`${date}T00:00:00`);
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  return Math.ceil((target.getTime() - today.getTime()) / millisecondsPerDay);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next.toISOString().slice(0, 10);
}

function devisExpirationDate(document: Document) {
  if (!document.date_emission || document.validite_jours === null) {
    return null;
  }

  return addDays(new Date(`${document.date_emission}T00:00:00`), document.validite_jours);
}

function categoryBar({
  label,
  threshold,
  value
}: {
  label: string;
  threshold: number;
  value: number;
}) {
  const percent = thresholdPercent(value, threshold);

  return (
    <div className="space-y-2">
      <div className="flex justify-between gap-3 text-sm">
        <span className="font-medium text-ink">{label}</span>
        <span className="tabular-nums text-muted">
          {euroFormatter.format(value)} / {euroFormatter.format(threshold)}
        </span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full bg-brand" style={{ width: `${Math.min(100, percent)}%` }} />
      </div>
      <p className="text-xs tabular-nums text-muted">{percent}%</p>
    </div>
  );
}

function monthlyChart(monthlyValues: number[]) {
  const width = 720;
  const height = 180;
  const baseline = 150;
  const max = Math.max(...monthlyValues, 1);
  const barWidth = 38;
  const gap = 20;

  return (
    <svg className="h-auto w-full" role="img" viewBox={`0 0 ${width} ${height}`}>
      <line stroke="#d8dee4" x1="0" x2={width} y1={baseline} y2={baseline} />
      {monthlyValues.map((value, index) => {
        const barHeight = (value / max) * 120;
        const x = index * (barWidth + gap) + 10;
        const y = baseline - barHeight;

        return (
          <g key={index}>
            <rect fill="#002D72" height={barHeight} rx="4" width={barWidth} x={x} y={y} />
            <text fill="#65727f" fontSize="10" textAnchor="middle" x={x + barWidth / 2} y="170">
              {index + 1}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const now = new Date();
  const currentYear = now.getFullYear();
  const previousYear = currentYear - 1;

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  const typedProfile = profile as Profile | null;
  const periodicite = typedProfile?.declaration_periodicite ?? "trimestral";
  const today = now.toISOString().slice(0, 10);
  const declarationPeriod =
    periodOptions(currentYear, periodicite).find(
      (period) => today >= period.start && today <= period.end
    ) ?? periodOptions(currentYear, periodicite)[0];

  const [
    yearRows,
    previousYearRows,
    declarationRows,
    quarterRows,
    documentsResponse,
    paymentsResponse
  ] = await Promise.all([
    fetchRevenueBookRows(supabase, yearRange(currentYear)),
    fetchRevenueBookRows(supabase, yearRange(previousYear)),
    fetchRevenueBookRows(supabase, { end: declarationPeriod.end, start: declarationPeriod.start }),
    fetchRevenueBookRows(supabase, currentQuarterRange(now)),
    supabase
      .from("documents")
      .select("*")
      .in("type", ["devis", "facture"])
      .in("status", ["sent", "partial"])
      .order("date_echeance", { ascending: true }),
    supabase.from("payments").select("document_id,montant")
  ]);

  const documents = (documentsResponse.data ?? []) as Document[];
  const payments = (paymentsResponse.data ?? []) as Array<{ document_id: string; montant: number }>;
  const paidByDocument = payments.reduce((map, payment) => {
    map.set(payment.document_id, (map.get(payment.document_id) ?? 0) + Number(payment.montant));
    return map;
  }, new Map<string, number>());

  const yearTotals = sumCategoryTotals(yearRows);
  const previousTotals = sumCategoryTotals(previousYearRows);
  const declarationTotals = sumCategoryTotals(declarationRows);
  const quarterTotals = sumCategoryTotals(quarterRows);
  const annualTotal = totalCategoryAmount(yearTotals);
  const previousTotal = totalCategoryAmount(previousTotals);
  const annualDelta = previousTotal === 0 ? null : roundCurrency(((annualTotal - previousTotal) / previousTotal) * 100);

  const monthlyLabels = monthRanges(currentYear);
  const monthlyValues = monthlyLabels.map((month) =>
    totalCategoryAmount(
      sumCategoryTotals(yearRows.filter((row) => row.date >= month.start && row.date <= month.end))
    )
  );
  const projection = roundCurrency((annualTotal / Math.max(1, now.getMonth() + 1)) * 12);

  const pendingFactures = documents.filter(
    (document) => document.type === "facture" && ["sent", "partial"].includes(document.status)
  );
  const lateFactures = pendingFactures.filter(
    (document) => document.status === "sent" && document.date_echeance && document.date_echeance < today
  );
  const pendingAmount = pendingFactures.reduce(
    (sum, document) => sum + Math.max(0, Number(document.total_ttc) - (paidByDocument.get(document.id) ?? 0)),
    0
  );
  const lateAmount = lateFactures.reduce(
    (sum, document) => sum + Math.max(0, Number(document.total_ttc) - (paidByDocument.get(document.id) ?? 0)),
    0
  );

  const devisExpiring = documents.filter((document) => {
    if (document.type !== "devis" || document.status !== "sent") {
      return false;
    }

    const expiresAt = devisExpirationDate(document);
    return Boolean(expiresAt && expiresAt >= today && expiresAt <= addDays(now, 7));
  });
  const deadline = nextUrssafDeadline(periodicite, now);
  const deadlineDays = daysUntil(deadline);
  const profileFields = incompleteProfileFields(typedProfile);
  const activeCategories = activityCategories.filter(
    (category) => yearTotals[category] > 0 || typedProfile?.activite_principale === category
  );
  const cotisations = calculateResteAVivre(declarationTotals, typedProfile);

  const actionItems = [
    { count: devisExpiring.length, label: "Orçamentos expiram nos próximos 7 dias" },
    { count: lateFactures.length, label: "Faturas a cobrar" },
    { count: deadlineDays <= 7 ? 1 : 0, label: `Declaração URSSAF em D-${Math.max(0, deadlineDays)}` },
    { count: profileFields.length, label: `Perfil incompleto: ${profileFields.join(", ")}` }
  ].filter((item) => item.count > 0);

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#111F3B] via-[#182C57] to-[#231E44] px-6 py-7 shadow-sm ring-1 ring-white/10">
        {/* Discreet corner light shapes (decorative, non-interactive). */}
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/[0.05] blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-28 -right-24 h-96 w-96 rounded-full bg-[#3E4E9A]/15 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-[#1B2A55]/40 blur-3xl" />
        <div className="relative z-10">
        <h1 className="text-2xl font-medium text-white">
          Bienvenue{typedProfile?.prenom || typedProfile?.nome ? `, ${typedProfile?.prenom || typedProfile?.nome}` : ""} ! 👋
        </h1>
        <p className="mt-1.5 max-w-xl text-sm text-white/75">
          Aqui está o seu painel de controle. Acompanhe suas atividades.
        </p>
        <p className="mt-1 text-xs text-white/55">Pronto para expandir seu negócio? 🚀</p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl bg-white/10 p-4 ring-1 ring-white/15">
            <p className="text-[11px] font-medium uppercase tracking-wide text-white/60">Faturamento recebido {currentYear}</p>
            <p className="mt-2 text-2xl font-medium tabular-nums text-white">{euroFormatter.format(annualTotal)}</p>
            <p className="mt-1 text-xs text-white/60">
              {annualDelta === null
                ? "Sem base do ano anterior."
                : `${annualDelta >= 0 ? "+" : ""}${annualDelta}% vs ${previousYear}`}
            </p>
          </div>

          <Link
            className="rounded-xl bg-white/10 p-4 ring-1 ring-white/15 transition hover:bg-white/15"
            href="/documentos?status=sent"
          >
            <p className="text-[11px] font-medium uppercase tracking-wide text-white/60">Faturas em aberto</p>
            <p className="mt-2 text-2xl font-medium tabular-nums text-white">{pendingFactures.length}</p>
            <p className="mt-1 text-xs tabular-nums text-white/60">{euroFormatter.format(pendingAmount)}</p>
          </Link>

          <Link
            className="rounded-xl bg-white/10 p-4 ring-1 ring-white/15 transition hover:bg-white/15"
            href="/documentos?status=a_relancer"
          >
            <p className="text-[11px] font-medium uppercase tracking-wide text-white/60">Faturas em atraso</p>
            <p className="mt-2 text-2xl font-medium tabular-nums text-white">{lateFactures.length}</p>
            <p className="mt-1 text-xs tabular-nums text-white/60">{euroFormatter.format(lateAmount)}</p>
          </Link>

          <div className="rounded-xl bg-white/10 p-4 ring-1 ring-white/15">
            <p className="text-[11px] font-medium uppercase tracking-wide text-white/60">Projeção {currentYear}</p>
            <p className="mt-2 text-2xl font-medium tabular-nums text-white">{euroFormatter.format(projection)}</p>
            <p className="mt-1 text-xs text-white/60">Estimativa anual</p>
          </div>
        </div>

        <div className="mt-5 grid gap-2 border-t border-white/10 pt-4 text-xs text-white/60 sm:grid-cols-3">
          <p>
            Vente: <span className="tabular-nums text-white/80">{euroFormatter.format(yearTotals.vente)}</span>
          </p>
          <p>
            Service BIC: <span className="tabular-nums text-white/80">{euroFormatter.format(yearTotals.service_bic)}</span>
          </p>
          <p>
            Service BNC: <span className="tabular-nums text-white/80">{euroFormatter.format(yearTotals.service_bnc)}</span>
          </p>
        </div>
        </div>
      </section>

      {isProfileIncomplete(typedProfile) ? (
        <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 ring-1 ring-amber-200">
          Complete seu perfil para poder emitir faturas
        </div>
      ) : null}

      {actionItems.length > 0 ? (
        <section className="rounded-2xl bg-rose-50 p-4 shadow-sm ring-1 ring-rose-200">
          <p className="text-[11px] font-medium uppercase tracking-wide text-rose-500">Ação necessária</p>
          <div className="mt-3 flex flex-wrap gap-3">
            {actionItems.map((item) => (
              <div
                className="flex flex-1 basis-[260px] items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 text-sm ring-1 ring-rose-100"
                key={item.label}
              >
                <span className="text-slate-700">{item.label}</span>
                <span className="inline-flex min-w-[1.75rem] justify-center rounded-full bg-rose-100 px-2 py-0.5 text-sm font-medium tabular-nums text-rose-700">
                  {item.count}
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
        <div className="mb-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Faturamento mensal recebido</p>
          <h2 className="mt-1 text-xl font-medium text-ink">12 meses de {currentYear}</h2>
        </div>
        {monthlyValues.some((value) => value > 0) ? (
          monthlyChart(monthlyValues)
        ) : (
          <div className="flex h-28 flex-col items-center justify-center gap-1 rounded-xl bg-slate-50 text-center ring-1 ring-black/5">
            <p className="text-sm font-medium text-slate-500">Sem recebimentos registrados em {currentYear}</p>
            <p className="text-xs text-slate-400">O gráfico aparece assim que houver receita lançada.</p>
          </div>
        )}
      </section>

      <div className="space-y-4 pt-2">
        <p className="px-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">Acompanhamento fiscal</p>

        <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Limites micro-entreprise</p>
          {activeCategories.length > 0 ? (
            <div className="mt-4 space-y-5">
              {activeCategories.map((category) =>
                categoryBar({
                  label: `${categoryLabel(category)} · limite micro`,
                  threshold: microThreshold(category),
                  value: yearTotals[category]
                })
              )}
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-400">
              Defina sua atividade principal ou registre receita para acompanhar os limites da micro-entreprise.
            </p>
          )}
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Franchise TVA</p>
          {activeCategories.length === 0 ? (
            <p className="mt-4 text-sm text-slate-400">
              O acompanhamento da franchise TVA aparece quando houver categoria de atividade ativa.
            </p>
          ) : null}
          <div className="mt-4 space-y-5">
            {activeCategories.map((category) => {
              const thresholds = tvaThresholds(category);
              const ratio = yearTotals[category] / thresholds.base;
              const tone = alertTone(ratio);

              return (
                <div className="space-y-3" key={category}>
                  {categoryBar({
                    label: `${categoryLabel(category)} · limite base`,
                    threshold: thresholds.base,
                    value: yearTotals[category]
                  })}
                  {categoryBar({
                    label: `${categoryLabel(category)} · limite majorado`,
                    threshold: thresholds.increased,
                    value: yearTotals[category]
                  })}
                  {tone ? (
                    <div className={`rounded-xl border px-3 py-2 text-sm ${tone}`}>
                      Acompanhamento informativo: o faturamento dessa categoria aproxima-se do limite de TVA. Esta indicação não constitui aconselhamento fiscal.{" "}
                      <a className="font-medium underline" href="#">
                        Saiba mais
                      </a>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Contribuições estimadas</p>
        <p className="mt-1 text-sm text-muted">
          Período atual: {declarationPeriod.label}. Vencimento estimado: {deadline} ({deadlineDays} dias).
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {cotisations.length > 0 ? (
            cotisations.map((row) => (
              <div className="rounded-xl p-4 text-sm ring-1 ring-black/5" key={row.category}>
                <p className="font-medium text-ink">{categoryLabel(row.category)}</p>
                <p className="tabular-nums text-muted">Faturamento: {euroFormatter.format(row.total)}</p>
                <p className="tabular-nums text-muted">Contribuições: {euroFormatter.format(row.cotisations)}</p>
                {typedProfile?.versement_liberatoire ? (
                  <p className="tabular-nums text-muted">
                    Versement libératoire: {euroFormatter.format(row.versementLiberatoire)}
                  </p>
                ) : null}
                <p className="mt-1 font-medium tabular-nums text-brand">
                  Net estimado: {euroFormatter.format(row.net)}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted">Nenhum encaissement no período atual.</p>
          )}
        </div>
        <p className="mt-4 text-xs text-muted">
          Estimativa indicativa, não constitui aconselhamento fiscal.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Faturamento recebido no trimestre</p>
          <p className="mt-1 text-xl font-medium tabular-nums text-slate-700">
            {euroFormatter.format(totalCategoryAmount(quarterTotals))}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Vente</p>
          <p className="mt-1 text-xl font-medium tabular-nums text-slate-700">{euroFormatter.format(quarterTotals.vente)}</p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Services</p>
          <p className="mt-1 text-xl font-medium tabular-nums text-slate-700">
            {euroFormatter.format(quarterTotals.service_bic + quarterTotals.service_bnc)}
          </p>
        </div>
      </section>
      </div>
    </main>
  );
}
