import Link from "next/link";
import { redirect } from "next/navigation";
import { isProfileIncomplete } from "@/lib/profile-completeness";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

// Gestão > Meu Conselheiro — recomendações operacionais determinísticas
// (rules-based, sem IA) derivadas dos dados existentes: payments, purchases,
// documents, clients, profile. Read-only. Sem tabela nova.

const euro = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "EUR" });

function addDays(base: Date, days: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

type Insight = { tone: "warning" | "info" | "ok"; title: string; detail: string; href?: string; cta?: string };

export default async function ConselheiroPage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const yearPrefix = String(now.getFullYear());
  const soonLimit = addDays(now, 7);

  const [{ data: profile }, { data: payments }, { data: purchases }, { data: openFactures }, { data: paidRows }] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("payments").select("date_encaissement, montant"),
      supabase.from("purchases").select("date_achat, montant"),
      supabase
        .from("documents")
        .select("id, numero, total_ttc, date_echeance, client_id, clients(nom, raison_sociale)")
        .eq("type", "facture")
        .in("status", ["sent", "partial"]),
      supabase.from("payments").select("document_id, montant")
    ]);

  // ---- Derivações (mesmo padrão do dashboard/financeiro) -------------------
  const caEncaisse = ((payments ?? []) as Array<{ date_encaissement: string; montant: number }>)
    .filter((p) => p.date_encaissement?.slice(0, 4) === yearPrefix)
    .reduce((s, p) => s + (Number(p.montant) || 0), 0);

  const depenses = ((purchases ?? []) as Array<{ date_achat: string; montant: number }>)
    .filter((p) => p.date_achat?.slice(0, 4) === yearPrefix)
    .reduce((s, p) => s + (Number(p.montant) || 0), 0);

  const paidByDoc = new Map<string, number>();
  for (const p of (paidRows ?? []) as Array<{ document_id: string; montant: number }>) {
    paidByDoc.set(p.document_id, (paidByDoc.get(p.document_id) ?? 0) + (Number(p.montant) || 0));
  }

  const receivables = ((openFactures ?? []) as unknown as Array<{
    id: string;
    numero: string | null;
    total_ttc: number;
    date_echeance: string | null;
    client_id: string | null;
    clients: { nom: string | null; raison_sociale: string | null } | { nom: string | null; raison_sociale: string | null }[] | null;
  }>)
    .map((f) => {
      const cli = Array.isArray(f.clients) ? f.clients[0] : f.clients;
      return {
        id: f.id,
        numero: f.numero,
        client: cli?.raison_sociale || cli?.nom || null,
        clientId: f.client_id,
        due: (Number(f.total_ttc) || 0) - (paidByDoc.get(f.id) ?? 0),
        echeance: f.date_echeance,
        overdue: Boolean(f.date_echeance && f.date_echeance < today),
        dueSoon: Boolean(f.date_echeance && f.date_echeance >= today && f.date_echeance <= soonLimit)
      };
    })
    .filter((r) => r.due > 0.01);

  const aRecevoir = receivables.reduce((s, r) => s + r.due, 0);
  const overdue = receivables.filter((r) => r.overdue);
  const dueSoon = receivables.filter((r) => r.dueSoon);
  const soldeEstime = caEncaisse - depenses + aRecevoir;
  const clientsARelancer = new Set(overdue.map((r) => r.clientId ?? r.numero ?? r.id)).size;
  const profileIncomplete = isProfileIncomplete((profile as Profile | null) ?? null);

  // ---- Insights (rules-based) ---------------------------------------------
  const insights: Insight[] = [];
  if (overdue.length > 0) {
    const amount = overdue.reduce((s, r) => s + r.due, 0);
    insights.push({
      tone: "warning",
      title: `${overdue.length} ${overdue.length === 1 ? "fatura atrasada" : "faturas atrasadas"}`,
      detail: `${euro.format(amount)} vencido${overdue.length === 1 ? "" : "s"}. Vale a pena cobrar esses clientes.`,
      href: "/documentos?status=a_relancer",
      cta: "Ver faturas"
    });
  }
  if (dueSoon.length > 0) {
    insights.push({
      tone: "info",
      title: `${dueSoon.length} ${dueSoon.length === 1 ? "fatura vence" : "faturas vencem"} em 7 dias`,
      detail: "Acompanhe pra receber no prazo.",
      href: "/documentos?status=sent",
      cta: "Ver faturas"
    });
  }
  if (soldeEstime < 0) {
    insights.push({
      tone: "warning",
      title: "Saldo estimado negativo",
      detail: "As saídas superam entradas + a receber neste ano. Confira o fluxo de caixa.",
      href: "/financeiro",
      cta: "Ver fluxo"
    });
  }
  if (profileIncomplete) {
    insights.push({
      tone: "info",
      title: "Complete os dados da empresa",
      detail: "Nome, endereço e SIRET completos evitam bloqueio na emissão de faturas.",
      href: "/configuracoes/empresa",
      cta: "Completar"
    });
  }
  if (insights.length === 0) {
    insights.push({ tone: "ok", title: "Tudo em dia por aqui ✅", detail: "Nenhuma pendência detectada nos seus dados." });
  }

  const cards = [
    { label: "Faturamento recebido", value: euro.format(caEncaisse), tone: "text-emerald-600" },
    { label: "Faturas a receber", value: euro.format(aRecevoir), tone: "text-sky-600" },
    { label: "Despesas recentes", value: euro.format(depenses), tone: "text-rose-600" },
    { label: "Saldo estimado", value: euro.format(soldeEstime), tone: soldeEstime >= 0 ? "text-ink" : "text-rose-600" },
    { label: "Clientes a cobrar", value: String(clientsARelancer), tone: "text-amber-600" }
  ];

  const actions = [
    { label: "Cobrar um cliente", href: "/crm", hint: "Acompanhe e relance no CRM" },
    { label: "Ver faturas em aberto", href: "/documentos?status=sent", hint: "Recebimentos pendentes" },
    { label: "Consultar fluxo de caixa", href: "/financeiro", hint: "Entradas, saídas e saldo" },
    { label: "Atualizar dados da empresa", href: "/configuracoes/empresa", hint: "Nome, SIRET, endereço" }
  ];

  const toneStyles: Record<Insight["tone"], string> = {
    warning: "border-l-amber-400",
    info: "border-l-sky-400",
    ok: "border-l-emerald-400"
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Gestão</p>
        <h1 className="mt-1 text-2xl font-semibold text-ink">Meu Conselheiro</h1>
        <p className="mt-1 text-sm text-muted">O que merece sua atenção hoje, com base nos seus dados. Lembretes operacionais, não aconselhamento fiscal.</p>
      </div>

      {/* Cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((c) => (
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5" key={c.label}>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{c.label}</p>
            <p className={`mt-1 text-lg font-semibold tabular-nums ${c.tone}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Insights */}
      <section className="mb-6">
        <h2 className="mb-3 text-sm font-semibold text-ink">Recomendações</h2>
        <div className="space-y-2">
          {insights.map((ins, i) => (
            <div className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-l-4 border-black/5 bg-white px-5 py-4 shadow-sm ${toneStyles[ins.tone]}`} key={i}>
              <div className="min-w-0">
                <p className="font-medium text-ink">{ins.title}</p>
                <p className="mt-0.5 text-sm text-muted">{ins.detail}</p>
              </div>
              {ins.href ? (
                <Link className="shrink-0 rounded-xl bg-white px-3 py-1.5 text-sm font-semibold text-brand ring-1 ring-inset ring-slate-200 transition hover:bg-slate-50" href={ins.href}>
                  {ins.cta ?? "Abrir"}
                </Link>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      {/* Clientes a cobrar (se houver) */}
      {receivables.length > 0 ? (
        <section className="mb-6 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
          <div className="flex items-center justify-between gap-3 border-b border-line bg-slate-50 px-5 py-3">
            <h2 className="text-sm font-semibold text-ink">Clientes a cobrar</h2>
            <Link className="text-sm font-medium text-brand hover:underline" href="/documentos?status=sent">
              Ver todas
            </Link>
          </div>
          <ul className="divide-y divide-line">
            {receivables.slice(0, 6).map((r) => (
              <li className="flex items-center justify-between gap-3 px-5 py-3 text-sm" key={r.id}>
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink">
                    {r.client ?? "Cliente"}
                    {r.numero ? ` · ${r.numero}` : ""}
                  </p>
                  <p className="text-xs text-muted">
                    {r.echeance ? `Vence ${r.echeance}` : "Sem vencimento"}
                    {r.overdue ? <span className="ml-2 rounded-full bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-600 ring-1 ring-inset ring-rose-200">Atrasada</span> : null}
                  </p>
                </div>
                <span className="shrink-0 font-semibold tabular-nums text-sky-600">{euro.format(r.due)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Ações sugeridas */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-ink">Próximas ações</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {actions.map((a) => (
            <Link className="flex items-center justify-between gap-3 rounded-2xl bg-white px-5 py-4 shadow-sm ring-1 ring-black/5 transition hover:bg-slate-50" href={a.href} key={a.label}>
              <div className="min-w-0">
                <p className="font-medium text-ink">{a.label}</p>
                <p className="text-xs text-muted">{a.hint}</p>
              </div>
              <svg className="shrink-0 text-slate-300" fill="none" height="18" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="18">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
