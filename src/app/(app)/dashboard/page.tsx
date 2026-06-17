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
        <span className="text-muted">
          {euroFormatter.format(value)} / {euroFormatter.format(threshold)}
        </span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full bg-brand" style={{ width: `${Math.min(100, percent)}%` }} />
      </div>
      <p className="text-xs text-muted">{percent}%</p>
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
            <rect fill="#0f766e" height={barHeight} rx="4" width={barWidth} x={x} y={y} />
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

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6">
        <p className="text-sm font-semibold text-brand">Dashboard</p>
        <h1 className="mt-2 text-2xl font-semibold text-ink">Painel fiscal</h1>
        <p className="mt-2 text-sm text-muted">
          CA baseado em encaissements, conforme o livre de recettes.
        </p>
      </div>

      {isProfileIncomplete(typedProfile) ? (
        <div className="mb-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
          Complete seu perfil para poder emitir faturas
        </div>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-4">
        <div className="rounded-lg border border-line bg-white p-5 shadow-sm lg:col-span-2">
          <p className="text-sm font-semibold text-brand">CA encaissé {currentYear}</p>
          <p className="mt-2 text-3xl font-semibold text-ink">{euroFormatter.format(annualTotal)}</p>
          <p className="mt-1 text-sm text-muted">
            {annualDelta === null
              ? "Sem base do ano anterior para comparação."
              : `${annualDelta >= 0 ? "+" : ""}${annualDelta}% vs ${previousYear}`}
          </p>
          <div className="mt-4 grid gap-2 text-sm text-muted sm:grid-cols-3">
            <p>Vente: {euroFormatter.format(yearTotals.vente)}</p>
            <p>Service BIC: {euroFormatter.format(yearTotals.service_bic)}</p>
            <p>Service BNC: {euroFormatter.format(yearTotals.service_bnc)}</p>
          </div>
        </div>

        <div className="rounded-lg border border-line bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-brand">Factures en attente</p>
          <p className="mt-2 text-2xl font-semibold text-ink">{pendingFactures.length}</p>
          <p className="text-sm text-muted">{euroFormatter.format(pendingAmount)}</p>
          <Link className="mt-3 inline-flex text-sm font-semibold text-brand" href="/documentos?status=sent">
            Ver documentos
          </Link>
        </div>

        <div className="rounded-lg border border-line bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-brand">Factures en retard</p>
          <p className="mt-2 text-2xl font-semibold text-ink">{lateFactures.length}</p>
          <p className="text-sm text-muted">{euroFormatter.format(lateAmount)}</p>
          <Link className="mt-3 inline-flex text-sm font-semibold text-brand" href="/documentos?status=a_relancer">
            À relancer
          </Link>
        </div>
      </section>

      <section className="mt-6 rounded-lg border border-line bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-brand">CA mensal encaissé</p>
            <h2 className="mt-1 text-xl font-semibold text-ink">12 meses de {currentYear}</h2>
          </div>
          <p className="text-sm text-muted">Projection: {euroFormatter.format(projection)}</p>
        </div>
        {monthlyChart(monthlyValues)}
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-line bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-brand">Seuils micro-entreprise</p>
          <div className="mt-4 space-y-5">
            {activeCategories.map((category) =>
              categoryBar({
                label: `${categoryLabel(category)} · seuil micro`,
                threshold: microThreshold(category),
                value: yearTotals[category]
              })
            )}
          </div>
        </div>

        <div className="rounded-lg border border-line bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-brand">Franchise TVA</p>
          <div className="mt-4 space-y-5">
            {activeCategories.map((category) => {
              const thresholds = tvaThresholds(category);
              const ratio = yearTotals[category] / thresholds.base;
              const tone = alertTone(ratio);

              return (
                <div className="space-y-3" key={category}>
                  {categoryBar({
                    label: `${categoryLabel(category)} · seuil base`,
                    threshold: thresholds.base,
                    value: yearTotals[category]
                  })}
                  {categoryBar({
                    label: `${categoryLabel(category)} · seuil majoré`,
                    threshold: thresholds.increased,
                    value: yearTotals[category]
                  })}
                  {tone ? (
                    <div className={`rounded-md border px-3 py-2 text-sm ${tone}`}>
                      Suivi informativo: o CA dessa categoria aproxima-se do seuil de TVA. Esta indicação não constitui conselho fiscal.{" "}
                      <a className="font-semibold underline" href="#">
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

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-line bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-brand">Cotisations estimées</p>
          <p className="mt-1 text-sm text-muted">
            Période actuelle: {declarationPeriod.label}. Échéance estimée: {deadline} ({deadlineDays} dias).
          </p>
          <div className="mt-4 space-y-3">
            {cotisations.length > 0 ? (
              cotisations.map((row) => (
                <div className="rounded-md border border-line p-3 text-sm" key={row.category}>
                  <p className="font-medium text-ink">{categoryLabel(row.category)}</p>
                  <p className="text-muted">CA: {euroFormatter.format(row.total)}</p>
                  <p className="text-muted">Cotisations: {euroFormatter.format(row.cotisations)}</p>
                  {typedProfile?.versement_liberatoire ? (
                    <p className="text-muted">
                      Versement libératoire: {euroFormatter.format(row.versementLiberatoire)}
                    </p>
                  ) : null}
                  <p className="font-semibold text-ink">Net estimado: {euroFormatter.format(row.net)}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted">Nenhum encaissement no período atual.</p>
            )}
          </div>
          <p className="mt-4 text-xs text-muted">
            Estimation indicative, ne constitue pas un conseil fiscal.
          </p>
        </div>

        <div className="rounded-lg border border-line bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-brand">Centro de ações</p>
          <div className="mt-4 space-y-3 text-sm">
            <ActionItem count={devisExpiring.length} label="Devis expiram nos próximos 7 dias" />
            <ActionItem count={lateFactures.length} label="Factures à relancer" />
            <ActionItem
              count={deadlineDays <= 7 ? 1 : 0}
              label={`Déclaration URSSAF em D-${Math.max(0, deadlineDays)}`}
            />
            <ActionItem count={profileFields.length} label={`Perfil incompleto: ${profileFields.join(", ") || "OK"}`} />
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-line bg-white p-4 shadow-sm">
          <p className="text-sm text-muted">CA encaissé ce trimestre</p>
          <p className="mt-1 text-xl font-semibold">
            {euroFormatter.format(totalCategoryAmount(quarterTotals))}
          </p>
        </div>
        <div className="rounded-lg border border-line bg-white p-4 shadow-sm">
          <p className="text-sm text-muted">Vente</p>
          <p className="mt-1 text-xl font-semibold">{euroFormatter.format(quarterTotals.vente)}</p>
        </div>
        <div className="rounded-lg border border-line bg-white p-4 shadow-sm">
          <p className="text-sm text-muted">Services</p>
          <p className="mt-1 text-xl font-semibold">
            {euroFormatter.format(quarterTotals.service_bic + quarterTotals.service_bnc)}
          </p>
        </div>
      </section>
    </main>
  );
}

function ActionItem({ count, label }: { count: number; label: string }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-line px-3 py-2">
      <span>{label}</span>
      <span className={count > 0 ? "font-semibold text-amber-700" : "font-semibold text-teal-700"}>
        {count > 0 ? count : "OK"}
      </span>
    </div>
  );
}
