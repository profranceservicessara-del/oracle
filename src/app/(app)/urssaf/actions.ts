"use server";

import { revalidatePath } from "next/cache";
import { fetchRevenueBookRows } from "@/lib/accounting-data";
import { requiresPaidPlan } from "@/lib/plan-matrix";
import { createClient } from "@/lib/supabase/server";
import type { AdvisorRequestContext, DeclarationLineStatus, Payment } from "@/lib/types";

// Preparação de base de declaração URSSAF. NUNCA envia nada à URSSAF e não
// calcula contribuições — só agrega recebimentos reais do período.
//
// Regra oficial implementada:
// - Base = somente payments com date_encaissement dentro do período.
// - Linha `confirmed`: recebimento validado (fatura + categoria identificadas,
//   valor > 0). Só essas entram no total da base.
// - Linha `needs_review`: recebimento sem fatura/categoria identificável ou
//   valor <= 0 (ajuste/estorno). NUNCA entra automaticamente na base.
// - Linha `excluded`: excluída manualmente na revisão.

type ActionResult = { error?: string; draftId?: string };

const PERIODICITES = new Set(["mensal", "trimestral"]);
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

async function recalcDraftTotal(supabase: ReturnType<typeof createClient>, draftId: string) {
  const { data: lines } = await supabase
    .from("urssaf_declaration_lines")
    .select("montant, status")
    .eq("draft_id", draftId);
  const total = ((lines ?? []) as Array<{ montant: number; status: string }>)
    .filter((l) => l.status === "confirmed")
    .reduce((s, l) => s + (Number(l.montant) || 0), 0);
  await supabase.from("urssaf_declaration_drafts").update({ total_confirmed: total }).eq("id", draftId);
  return total;
}

export async function prepareDeclarationAction(
  periodStart: string,
  periodEnd: string,
  periodicite: string
): Promise<ActionResult> {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };
  if (!ISO_DATE.test(periodStart) || !ISO_DATE.test(periodEnd) || periodStart > periodEnd) {
    return { error: "Período inválido." };
  }
  if (!PERIODICITES.has(periodicite)) return { error: "Periodicidade inválida." };

  // Draft já confirmado é snapshot travado — não recalcular por cima.
  const { data: existing } = await supabase
    .from("urssaf_declaration_drafts")
    .select("id, status")
    .eq("user_id", user.id)
    .eq("period_start", periodStart)
    .eq("period_end", periodEnd)
    .maybeSingle();
  if (existing?.status === "confirmed") {
    return { error: "Esta base já foi confirmada. Ela fica travada como registro." };
  }

  // Deriva a base real: mesmo helper do livro de receitas (payments -> docs ->
  // categorias). Payments do período sem linha derivada = não identificáveis.
  const [rows, paymentsRes] = await Promise.all([
    fetchRevenueBookRows(supabase, { start: periodStart, end: periodEnd, userId: user.id }),
    supabase
      .from("payments")
      .select("id, date_encaissement, montant, moyen, reference")
      .gte("date_encaissement", periodStart)
      .lte("date_encaissement", periodEnd)
  ]);
  const payments = (paymentsRes.data ?? []) as Pick<Payment, "id" | "date_encaissement" | "montant" | "moyen" | "reference">[];
  const matchedPaymentIds = new Set(rows.map((r) => r.id.replace(/-(vente|service_bic|service_bnc)$/, "")));

  type NewLine = {
    draft_id: string;
    user_id: string;
    payment_id: string | null;
    document_id: string | null;
    date_encaissement: string;
    montant: number;
    client_name: string | null;
    numero: string | null;
    categorie: string | null;
    moyen: string | null;
    status: DeclarationLineStatus;
    reason: string;
  };

  // Garante o draft (upsert por período) e zera as linhas antigas.
  const draftId =
    existing?.id ??
    ((
      await supabase
        .from("urssaf_declaration_drafts")
        .insert({ user_id: user.id, period_start: periodStart, period_end: periodEnd, periodicite, status: "ready" })
        .select("id")
        .single()
    ).data?.id as string | undefined);
  if (!draftId) return { error: "Não foi possível criar o rascunho." };

  if (existing?.id) {
    await supabase.from("urssaf_declaration_drafts").update({ status: "ready", confirmed_at: null }).eq("id", draftId);
  }
  await supabase.from("urssaf_declaration_lines").delete().eq("draft_id", draftId);

  const newLines: NewLine[] = [];
  for (const r of rows) {
    const paymentId = r.id.replace(/-(vente|service_bic|service_bnc)$/, "");
    const positive = Number(r.montant) > 0;
    newLines.push({
      draft_id: draftId,
      user_id: user.id,
      payment_id: paymentId,
      document_id: r.documentId,
      date_encaissement: r.date,
      montant: Number(r.montant) || 0,
      client_name: r.clientName || null,
      numero: r.numero || null,
      categorie: r.category,
      moyen: r.moyen ?? null,
      status: positive ? "confirmed" : "needs_review",
      reason: positive
        ? "Recebimento validado: fatura e categoria identificadas."
        : "Valor negativo/ajuste — revise antes de incluir."
    });
  }
  for (const p of payments) {
    if (matchedPaymentIds.has(p.id)) continue;
    newLines.push({
      draft_id: draftId,
      user_id: user.id,
      payment_id: p.id,
      document_id: null,
      date_encaissement: p.date_encaissement,
      montant: Number(p.montant) || 0,
      client_name: null,
      numero: p.reference ?? null,
      categorie: null,
      moyen: p.moyen ?? null,
      status: "needs_review",
      reason: "Recebimento sem fatura/categoria identificável — revise antes de incluir."
    });
  }

  if (newLines.length > 0) {
    const { error: insertError } = await supabase.from("urssaf_declaration_lines").insert(newLines);
    if (insertError) return { error: "Não foi possível gravar as linhas da base." };
  }
  await recalcDraftTotal(supabase, draftId);

  revalidatePath("/urssaf");
  return { draftId };
}

export async function setDeclarationLineStatusAction(
  lineId: string,
  status: DeclarationLineStatus
): Promise<ActionResult> {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };
  if (!["confirmed", "needs_review", "excluded"].includes(status)) return { error: "Status inválido." };

  const { data: line } = await supabase
    .from("urssaf_declaration_lines")
    .select("id, draft_id, categorie")
    .eq("id", lineId)
    .maybeSingle();
  if (!line) return { error: "Linha não encontrada." };
  // Sem categoria identificada não há como declarar o valor no campo certo:
  // só pode ser excluída (ou corrigida na fatura e recalculada).
  if (status === "confirmed" && !line.categorie) {
    return { error: "Sem categoria identificada. Corrija a fatura de origem e recalcule, ou exclua a linha." };
  }

  const { data: draft } = await supabase
    .from("urssaf_declaration_drafts")
    .select("id, status")
    .eq("id", line.draft_id)
    .maybeSingle();
  if (!draft) return { error: "Rascunho não encontrado." };
  if (draft.status === "confirmed") return { error: "Base confirmada é travada. Prepare um novo período." };

  const reason =
    status === "confirmed"
      ? "Incluído manualmente após revisão."
      : status === "excluded"
        ? "Excluído manualmente na revisão."
        : "Reaberto para revisão.";
  const { error } = await supabase.from("urssaf_declaration_lines").update({ status, reason }).eq("id", lineId);
  if (error) return { error: "Não foi possível atualizar a linha." };

  await recalcDraftTotal(supabase, draft.id);
  revalidatePath("/urssaf");
  return { draftId: draft.id };
}

export async function confirmDeclarationDraftAction(draftId: string): Promise<ActionResult> {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { data: draft } = await supabase
    .from("urssaf_declaration_drafts")
    .select("id, status")
    .eq("id", draftId)
    .maybeSingle();
  if (!draft) return { error: "Rascunho não encontrado." };
  if (draft.status === "confirmed") return { error: "Base já confirmada." };

  // Revisão obrigatória: nada incerto entra em silêncio. Todo item pendente
  // precisa ser incluído ou excluído explicitamente antes de confirmar.
  const { count } = await supabase
    .from("urssaf_declaration_lines")
    .select("id", { count: "exact", head: true })
    .eq("draft_id", draftId)
    .eq("status", "needs_review");
  if ((count ?? 0) > 0) {
    return { error: "Resolva os itens pendentes de revisão antes de confirmar a base." };
  }

  const total = await recalcDraftTotal(supabase, draftId);
  const { error } = await supabase
    .from("urssaf_declaration_drafts")
    .update({ status: "confirmed", confirmed_at: new Date().toISOString(), total_confirmed: total })
    .eq("id", draftId);
  if (error) return { error: "Não foi possível confirmar a base." };

  revalidatePath("/urssaf");
  return { draftId };
}

// Fase 4: escala a base preparada ao Conselheiro humano. Premium-only. O
// modelo NÃO cria isto — é o usuário via botão. O contexto é lido do banco
// (nunca do LLM). Não envia nada à URSSAF; só cria uma solicitação de revisão.
export async function requestDeclarationReviewAction(draftId: string): Promise<ActionResult> {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, subscription_status, activite_principale, declaration_periodicite, regime_tva")
    .eq("id", user.id)
    .maybeSingle();
  if (requiresPaidPlan(profile as { plan: string | null; subscription_status: string | null } | null, "premium")) {
    return { error: "A revisão pelo Conselheiro é um recurso Premium." };
  }

  const { data: draft } = await supabase
    .from("urssaf_declaration_drafts")
    .select("id, period_start, period_end, status, total_confirmed")
    .eq("id", draftId)
    .maybeSingle();
  if (!draft) return { error: "Rascunho não encontrado." };

  // Evita escalação duplicada aberta para o mesmo período.
  const { data: openReq } = await supabase
    .from("advisor_requests")
    .select("id")
    .eq("draft_id", draftId)
    .in("status", ["received", "in_review"])
    .maybeSingle();
  if (openReq) return { error: "Já existe uma solicitação de revisão aberta para este período." };

  // Contexto = snapshot do banco (não do modelo, sem dado bancário).
  const { data: lines } = await supabase
    .from("urssaf_declaration_lines")
    .select("status")
    .eq("draft_id", draftId);
  const all = (lines ?? []) as Array<{ status: string }>;
  const confirmadas = all.filter((l) => l.status === "confirmed").length;
  const pendencias = all.filter((l) => l.status === "needs_review").length;
  const base = confirmadas + pendencias;
  const prof = profile as { activite_principale: string | null; declaration_periodicite: string | null; regime_tva: string | null } | null;

  const context: AdvisorRequestContext = {
    periodo: `${draft.period_start} a ${draft.period_end}`,
    total_confirmado: `${(Math.round((Number(draft.total_confirmed) || 0) * 100) / 100).toFixed(2)} €`,
    confianca: base === 0 ? 100 : Math.round((confirmadas / base) * 100),
    pendencias,
    categoria: prof?.activite_principale ?? null,
    periodicidade: prof?.declaration_periodicite ?? null,
    regime_tva: prof?.regime_tva ?? null,
    draft_status: draft.status
  };

  const message = `Solicito revisão da minha base de declaração do período ${context.periodo}. Total confirmado: ${context.total_confirmado}. Pendências: ${pendencias}. Confiança: ${context.confianca}%.`;

  const { error } = await supabase.from("advisor_requests").insert({
    user_id: user.id,
    message,
    status: "received",
    kind: "declaration_review",
    draft_id: draftId,
    context
  });
  if (error) return { error: "Não foi possível enviar a solicitação." };

  revalidatePath("/urssaf");
  revalidatePath("/conselheiro");
  return { draftId };
}
