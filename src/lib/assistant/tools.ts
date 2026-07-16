import { fetchRevenueBookRows } from "@/lib/accounting-data";
import { categoryLabels, type ActivityCategory } from "@/lib/types";

// Tools read-only do Assistente (Fase 3). Whitelist FECHADA.
//
// Segurança:
// - Executam com o client Supabase DA SESSÃO do usuário -> RLS decide o que
//   é visível. O modelo NUNCA envia user_id e NUNCA vê o Supabase.
// - Zero escrita: nada de insert/update/delete, nada de confirmar draft.
// - Minimização: SIRET mascarado, sem endereço/email/notes, linhas limitadas.
// - O motor /urssaf continua a única fonte de cálculo: as tools só LEEM o que
//   ele já gravou.

type SupabaseLike = { from: (table: string) => any };

const MAX_ROWS = 20;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const periodSchema = {
  period_start: { type: "string", description: "Início do período, AAAA-MM-DD" },
  period_end: { type: "string", description: "Fim do período, AAAA-MM-DD" }
};

export const TOOL_DEFS = [
  {
    name: "getFiscalProfile",
    description: "Configuração fiscal do usuário no Oracle (categoria de atividade, periodicidade da declaração, regime de TVA, se o SIRET está preenchido).",
    input_schema: { type: "object", properties: {}, required: [] }
  },
  {
    name: "getDeclarationPeriods",
    description: "Lista os períodos de declaração que já têm base preparada no Oracle, com status e total confirmado.",
    input_schema: {
      type: "object",
      properties: { year: { type: "integer", description: "Filtrar por ano (opcional)" } },
      required: []
    }
  },
  {
    name: "getDeclarationDraft",
    description: "Resumo da base de declaração de um período: status, total confirmado, quantidade de linhas confirmadas/pendentes/excluídas e confiança.",
    input_schema: { type: "object", properties: periodSchema, required: ["period_start", "period_end"] }
  },
  {
    name: "getDeclarationPendingItems",
    description: "Itens pendentes de revisão de um período (não entram na base automaticamente), com o motivo de cada um.",
    input_schema: { type: "object", properties: periodSchema, required: ["period_start", "period_end"] }
  },
  {
    name: "getDeclarationLines",
    description: "Linhas da base de um período, opcionalmente filtradas por status (confirmed, needs_review, excluded).",
    input_schema: {
      type: "object",
      properties: {
        ...periodSchema,
        status: { type: "string", enum: ["confirmed", "needs_review", "excluded"], description: "Filtro opcional" }
      },
      required: ["period_start", "period_end"]
    }
  },
  {
    name: "getReceivedRevenueSummary",
    description: "Resumo dos recebimentos registrados num intervalo de datas (total, quantidade e total por categoria). Base do livro de receitas.",
    input_schema: {
      type: "object",
      properties: { start: { type: "string", description: "AAAA-MM-DD" }, end: { type: "string", description: "AAAA-MM-DD" } },
      required: ["start", "end"]
    }
  }
] as const;

const TOOL_NAMES = new Set(TOOL_DEFS.map((t) => t.name));

function maskSiret(siret: string | null): string | null {
  if (!siret) return null;
  const digits = siret.replace(/\D/g, "");
  return digits.length >= 5 ? `••• ••• ••• ${digits.slice(-5)}` : "•••";
}

function euro(n: number): string {
  return `${(Math.round(n * 100) / 100).toFixed(2)} €`;
}

async function findDraft(supabase: SupabaseLike, start: string, end: string) {
  const { data } = await supabase
    .from("urssaf_declaration_drafts")
    .select("id, status, total_confirmed, confirmed_at, periodicite")
    .eq("period_start", start)
    .eq("period_end", end)
    .maybeSingle();
  return data as { id: string; status: string; total_confirmed: number; confirmed_at: string | null; periodicite: string } | null;
}

// Executor. Retorna objeto simples (serializado como tool_result).
export async function runTool(supabase: SupabaseLike, name: string, input: Record<string, unknown>): Promise<unknown> {
  if (!TOOL_NAMES.has(name as (typeof TOOL_DEFS)[number]["name"])) {
    return { erro: "Ferramenta não disponível." };
  }

  const start = typeof input.period_start === "string" ? input.period_start : typeof input.start === "string" ? input.start : "";
  const end = typeof input.period_end === "string" ? input.period_end : typeof input.end === "string" ? input.end : "";

  if (name === "getFiscalProfile") {
    const { data } = await supabase
      .from("profiles")
      .select("siret, activite_principale, declaration_periodicite, regime_tva")
      .maybeSingle();
    const p = data as { siret: string | null; activite_principale: ActivityCategory | null; declaration_periodicite: string; regime_tva: string } | null;
    if (!p) return { erro: "Perfil não encontrado." };
    return {
      categoria_atividade: p.activite_principale ? categoryLabels[p.activite_principale] : null,
      periodicidade: p.declaration_periodicite,
      regime_tva: p.regime_tva === "assujetti" ? "sujeito a TVA" : "franchise de TVA",
      siret_mascarado: maskSiret(p.siret),
      siret_preenchido: Boolean(p.siret)
    };
  }

  if (name === "getDeclarationPeriods") {
    let q = supabase
      .from("urssaf_declaration_drafts")
      .select("period_start, period_end, status, total_confirmed, confirmed_at")
      .order("period_start", { ascending: false });
    if (typeof input.year === "number") {
      q = q.gte("period_start", `${input.year}-01-01`).lte("period_start", `${input.year}-12-31`);
    }
    const { data } = await q;
    const rows = (data ?? []) as Array<{ period_start: string; period_end: string; status: string; total_confirmed: number; confirmed_at: string | null }>;
    if (rows.length === 0) return { periodos: [], nota: "Nenhuma base preparada ainda. O usuário pode preparar em /urssaf." };
    return {
      periodos: rows.slice(0, MAX_ROWS).map((r) => ({
        periodo: `${r.period_start} a ${r.period_end}`,
        status: r.status === "confirmed" ? "confirmada (imutável)" : "preparada, pronta para revisar",
        total_confirmado: euro(Number(r.total_confirmed) || 0)
      }))
    };
  }

  if (!ISO_DATE.test(start) || !ISO_DATE.test(end)) {
    return { erro: "Período inválido. Use AAAA-MM-DD." };
  }

  if (name === "getReceivedRevenueSummary") {
    const rows = await fetchRevenueBookRows(supabase, { start, end });
    const total = rows.reduce((s, r) => s + (Number(r.montant) || 0), 0);
    const porCategoria: Record<string, number> = {};
    rows.forEach((r) => {
      const k = categoryLabels[r.category];
      porCategoria[k] = (porCategoria[k] ?? 0) + (Number(r.montant) || 0);
    });
    return {
      periodo: `${start} a ${end}`,
      total_recebido: euro(total),
      quantidade_recebimentos: rows.length,
      por_categoria: Object.fromEntries(Object.entries(porCategoria).map(([k, v]) => [k, euro(v)])),
      nota: "Recebimentos registrados no Oracle. Só entram na declaração após preparar a base em /urssaf."
    };
  }

  const draft = await findDraft(supabase, start, end);
  if (!draft) {
    return { erro: "Nenhuma base preparada para este período.", sugestao: "O usuário pode preparar a base em /urssaf." };
  }

  if (name === "getDeclarationDraft") {
    const { data } = await supabase.from("urssaf_declaration_lines").select("status, montant").eq("draft_id", draft.id);
    const lines = (data ?? []) as Array<{ status: string; montant: number }>;
    const confirmadas = lines.filter((l) => l.status === "confirmed");
    const pendentes = lines.filter((l) => l.status === "needs_review");
    const excluidas = lines.filter((l) => l.status === "excluded");
    const base = confirmadas.length + pendentes.length;
    return {
      periodo: `${start} a ${end}`,
      periodicidade: draft.periodicite,
      status: draft.status === "confirmed" ? "confirmada (imutável)" : "preparada, pronta para revisar",
      total_confirmado: euro(Number(draft.total_confirmed) || 0),
      linhas_confirmadas: confirmadas.length,
      linhas_pendentes: pendentes.length,
      linhas_excluidas: excluidas.length,
      confianca_percentual: base === 0 ? 100 : Math.round((confirmadas.length / base) * 100),
      confirmada_em: draft.confirmed_at,
      nota: draft.status === "confirmed" ? "Base travada: não pode ser recalculada." : "Confirmação bloqueada enquanto houver pendentes."
    };
  }

  // getDeclarationPendingItems | getDeclarationLines
  let q = supabase
    .from("urssaf_declaration_lines")
    .select("date_encaissement, montant, client_name, numero, categorie, status, reason")
    .eq("draft_id", draft.id)
    .order("date_encaissement", { ascending: true })
    .limit(MAX_ROWS);

  if (name === "getDeclarationPendingItems") {
    q = q.eq("status", "needs_review");
  } else if (typeof input.status === "string" && ["confirmed", "needs_review", "excluded"].includes(input.status)) {
    q = q.eq("status", input.status);
  }

  const { data } = await q;
  const rows = (data ?? []) as Array<{
    date_encaissement: string;
    montant: number;
    client_name: string | null;
    numero: string | null;
    categorie: ActivityCategory | null;
    status: string;
    reason: string | null;
  }>;

  if (rows.length === 0) {
    return name === "getDeclarationPendingItems"
      ? { itens: [], nota: "Nenhuma pendência neste período." }
      : { linhas: [], nota: "Nenhuma linha para este filtro." };
  }

  const mapped = rows.map((r) => ({
    data: r.date_encaissement,
    valor: euro(Number(r.montant) || 0),
    cliente: r.client_name,
    referencia: r.numero,
    categoria: r.categorie ? categoryLabels[r.categorie] : null,
    status: r.status,
    motivo: r.reason,
    ...(name === "getDeclarationPendingItems" ? { pode_incluir: Boolean(r.categorie) } : {})
  }));

  return name === "getDeclarationPendingItems"
    ? { itens: mapped, limite: `máx ${MAX_ROWS} itens`, nota: "Pendentes nunca entram na base automaticamente." }
    : { linhas: mapped, limite: `máx ${MAX_ROWS} linhas` };
}
