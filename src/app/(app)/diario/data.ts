import { redirect } from "next/navigation";
import { expandOccurrences } from "@/lib/recurrence";
import { createClient } from "@/lib/supabase/server";
import { toRecurrenceRule } from "./date-utils";
import type {
  DiarioItem,
  EventCategory,
  EventCollaborator,
  EventRecurrence,
  EventRow,
  RelatedOption,
  RelatedOptions
} from "./types";

// Carrega o Diário de um período. A série recorrente nunca é materializada no
// banco: aqui juntamos os eventos simples, expandimos as séries com o helper e
// aplicamos os overrides (inclusive os cancelamentos de ocorrência).
// Escopo garantido por RLS (dono ou colaborador convidado).

const EVENT_COLUMNS =
  "id,user_id,category_id,title,description,location,starts_at,ends_at,all_day,visibility,related_kind,related_id,is_recurring,recurrence_id,recurrence_parent_id,occurrence_original_start,is_cancelled_occurrence";

export type DiarioData = {
  events: DiarioItem[];
  categories: EventCategory[];
  relatedOptions: RelatedOptions;
  userId: string;
};

function emptyRelatedOptions(): RelatedOptions {
  return {
    none: [],
    company: [],
    contact: [],
    product: [],
    sales_document: [],
    purchase: [],
    opportunity: []
  };
}

export async function loadDiarioData(from: Date, to: Date): Promise<DiarioData> {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const fromIso = from.toISOString();
  const toIso = to.toISOString();

  const [
    singlesRes,
    seriesRes,
    overridesRes,
    recurrencesRes,
    categoriesRes,
    collaboratorsRes,
    companiesRes,
    peopleRes,
    productsRes,
    salesRes,
    purchasesRes
  ] = await Promise.all([
    // 1. Eventos simples que cruzam o intervalo.
    supabase
      .from("events")
      .select(EVENT_COLUMNS)
      .eq("is_recurring", false)
      .is("recurrence_parent_id", null)
      .lte("starts_at", toIso)
      .gte("ends_at", fromIso),
    // 2. Eventos base recorrentes que já começaram antes do fim do intervalo.
    supabase
      .from("events")
      .select(EVENT_COLUMNS)
      .eq("is_recurring", true)
      .is("recurrence_parent_id", null)
      .lte("starts_at", toIso),
    // 3. Overrides de ocorrência (poucos por conta, carregamos todos).
    supabase.from("events").select(EVENT_COLUMNS).not("recurrence_parent_id", "is", null),
    supabase
      .from("event_recurrences")
      .select("id,user_id,frequency,repeat_every,by_weekday,by_monthday,by_month,end_type,occurrence_count,until"),
    supabase
      .from("event_categories")
      .select("id,user_id,name,emoji,color,is_system")
      .order("name", { ascending: true }),
    supabase.from("event_collaborators").select("id,event_id,user_id,can_edit,response"),
    supabase
      .from("contact_thirds")
      .select("id,name")
      .eq("entity_kind", "company")
      .eq("archived", false)
      .order("name", { ascending: true }),
    supabase
      .from("contact_people")
      .select("id,first_name,last_name")
      .order("last_name", { ascending: true }),
    supabase
      .from("catalog_items")
      .select("id,designation")
      .eq("archived", false)
      .order("designation", { ascending: true }),
    supabase.from("documents").select("id,numero,type").order("created_at", { ascending: false }).limit(500),
    supabase
      .from("purchase_documents")
      .select("id,internal_number,external_number")
      .order("document_date", { ascending: false })
      .limit(500)
  ]);

  const singles = (singlesRes.data ?? []) as EventRow[];
  const series = (seriesRes.data ?? []) as EventRow[];
  const overrides = (overridesRes.data ?? []) as EventRow[];
  const recurrences = (recurrencesRes.data ?? []) as EventRecurrence[];
  const categories = (categoriesRes.data ?? []) as EventCategory[];
  const collaborators = (collaboratorsRes.data ?? []) as EventCollaborator[];

  const recurrenceById = new Map<string, EventRecurrence>();
  for (const rule of recurrences) {
    recurrenceById.set(rule.id, rule);
  }

  const collaboratorsByEvent = new Map<string, EventCollaborator[]>();
  for (const row of collaborators) {
    const list = collaboratorsByEvent.get(row.event_id) ?? [];
    list.push(row);
    collaboratorsByEvent.set(row.event_id, list);
  }

  // Overrides indexados por (evento base + início original da ocorrência).
  const overrideByKey = new Map<string, EventRow>();
  for (const row of overrides) {
    if (!row.recurrence_parent_id || !row.occurrence_original_start) {
      continue;
    }
    overrideByKey.set(overrideKey(row.recurrence_parent_id, row.occurrence_original_start), row);
  }
  const usedOverrides = new Set<string>();

  const userId = user.id;

  function buildItem(
    row: EventRow,
    options: {
      seriesId: string | null;
      occurrenceStart: Date;
      occurrenceEnd: Date;
      originalStart: Date | null;
      isOccurrence: boolean;
      isOverride: boolean;
      recurrence: EventRecurrence | null;
    }
  ): DiarioItem {
    const eventCollaborators = collaboratorsByEvent.get(row.id) ?? [];
    const isOwner = row.user_id === userId;
    const canEdit =
      isOwner || eventCollaborators.some((item) => item.user_id === userId && item.can_edit);

    return {
      ...row,
      seriesId: options.seriesId,
      occurrenceStart: options.occurrenceStart.toISOString(),
      occurrenceEnd: options.occurrenceEnd.toISOString(),
      originalStart: options.originalStart ? options.originalStart.toISOString() : null,
      isOccurrence: options.isOccurrence,
      isOverride: options.isOverride,
      isOwner,
      canEdit,
      recurrence: options.recurrence,
      collaborators: eventCollaborators
    };
  }

  const items: DiarioItem[] = [];

  for (const row of singles) {
    items.push(
      buildItem(row, {
        seriesId: null,
        occurrenceStart: new Date(row.starts_at),
        occurrenceEnd: new Date(row.ends_at),
        originalStart: null,
        isOccurrence: false,
        isOverride: false,
        recurrence: null
      })
    );
  }

  for (const base of series) {
    const recurrence = base.recurrence_id ? recurrenceById.get(base.recurrence_id) ?? null : null;

    // Série sem regra legível: trata como evento simples para não sumir da tela.
    if (!recurrence) {
      const start = new Date(base.starts_at);
      const end = new Date(base.ends_at);
      if (end.getTime() >= from.getTime() && start.getTime() <= to.getTime()) {
        items.push(
          buildItem(base, {
            seriesId: base.id,
            occurrenceStart: start,
            occurrenceEnd: end,
            originalStart: start,
            isOccurrence: false,
            isOverride: false,
            recurrence: null
          })
        );
      }
      continue;
    }

    const occurrences = expandOccurrences(
      new Date(base.starts_at),
      new Date(base.ends_at),
      toRecurrenceRule(recurrence),
      from,
      to
    );

    for (const occurrence of occurrences) {
      const key = overrideKey(base.id, occurrence.originalStart.toISOString());
      const override = overrideByKey.get(key);

      if (override) {
        usedOverrides.add(override.id);
        if (override.is_cancelled_occurrence) {
          continue; // ocorrência cancelada some do período
        }
        const start = new Date(override.starts_at);
        const end = new Date(override.ends_at);
        if (end.getTime() < from.getTime() || start.getTime() > to.getTime()) {
          continue; // override moveu a ocorrência para fora do período
        }
        items.push(
          buildItem(override, {
            seriesId: base.id,
            occurrenceStart: start,
            occurrenceEnd: end,
            originalStart: occurrence.originalStart,
            isOccurrence: true,
            isOverride: true,
            recurrence
          })
        );
        continue;
      }

      items.push(
        buildItem(base, {
          seriesId: base.id,
          occurrenceStart: occurrence.start,
          occurrenceEnd: occurrence.end,
          originalStart: occurrence.originalStart,
          isOccurrence: true,
          isOverride: false,
          recurrence
        })
      );
    }
  }

  // Override que foi movido para dentro do período enquanto a ocorrência
  // original caía fora dele: entra assim mesmo.
  for (const row of overrides) {
    if (row.is_cancelled_occurrence || usedOverrides.has(row.id)) {
      continue;
    }
    const start = new Date(row.starts_at);
    const end = new Date(row.ends_at);
    if (end.getTime() < from.getTime() || start.getTime() > to.getTime()) {
      continue;
    }
    const recurrenceOfParent = row.recurrence_parent_id
      ? recurrenceById.get(series.find((item) => item.id === row.recurrence_parent_id)?.recurrence_id ?? "") ?? null
      : null;
    items.push(
      buildItem(row, {
        seriesId: row.recurrence_parent_id,
        occurrenceStart: start,
        occurrenceEnd: end,
        originalStart: row.occurrence_original_start ? new Date(row.occurrence_original_start) : null,
        isOccurrence: true,
        isOverride: true,
        recurrence: recurrenceOfParent
      })
    );
  }

  items.sort((a, b) => a.occurrenceStart.localeCompare(b.occurrenceStart));

  const relatedOptions = emptyRelatedOptions();
  relatedOptions.company = ((companiesRes.data ?? []) as Array<{ id: string; name: string | null }>).map(
    (row): RelatedOption => ({ id: row.id, label: row.name ?? "Sem nome" })
  );
  relatedOptions.contact = (
    (peopleRes.data ?? []) as Array<{ id: string; first_name: string | null; last_name: string | null }>
  ).map((row): RelatedOption => ({
    id: row.id,
    label: `${row.first_name ?? ""} ${row.last_name ?? ""}`.trim() || "Sem nome"
  }));
  relatedOptions.product = (
    (productsRes.data ?? []) as Array<{ id: string; designation: string | null }>
  ).map((row): RelatedOption => ({ id: row.id, label: row.designation ?? "Sem descrição" }));
  relatedOptions.sales_document = (
    (salesRes.data ?? []) as Array<{ id: string; numero: string | null; type: string | null }>
  ).map((row): RelatedOption => ({
    id: row.id,
    label: [row.type, row.numero].filter(Boolean).join(" ") || "Documento sem número"
  }));
  relatedOptions.purchase = (
    (purchasesRes.data ?? []) as Array<{
      id: string;
      internal_number: string | null;
      external_number: string | null;
    }>
  ).map((row): RelatedOption => ({
    id: row.id,
    label: row.internal_number || row.external_number || "Compra sem número"
  }));

  return { events: items, categories, relatedOptions, userId };
}

function overrideKey(parentId: string, originalStartIso: string): string {
  // Normaliza o instante para não depender do formato textual do timestamptz.
  return `${parentId}|${new Date(originalStartIso).getTime()}`;
}
