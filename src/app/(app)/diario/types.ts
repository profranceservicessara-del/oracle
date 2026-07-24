// Tipos e constantes do módulo Diário (agenda de eventos).
// Espelham as tabelas event_* da migration 20260726120000_diario_events.
// Single-tenant por user_id, RLS por dono com extensão a colaboradores.

export type EventVisibility = "public" | "private";
export type EventRelatedKind =
  | "none"
  | "company"
  | "contact"
  | "product"
  | "sales_document"
  | "purchase"
  | "opportunity";
export type ReminderOffset =
  | "same_day"
  | "prev_5min"
  | "prev_15min"
  | "prev_30min"
  | "prev_hour"
  | "prev_day"
  | "prev_week"
  | "prev_month";
export type RecurFrequency = "daily" | "weekly" | "monthly" | "yearly";
export type RecurEndType = "after_count" | "on_date" | "never";
export type CollaboratorResponse = "pending" | "accepted" | "declined";

export type EventCategory = {
  id: string;
  user_id: string | null;
  name: string;
  emoji: string | null;
  color: string;
  is_system: boolean;
};

export type EventRow = {
  id: string;
  user_id: string;
  category_id: string | null;
  title: string;
  description: string | null;
  location: string | null;
  starts_at: string;
  ends_at: string;
  all_day: boolean;
  visibility: EventVisibility;
  related_kind: EventRelatedKind;
  related_id: string | null;
  is_recurring: boolean;
  recurrence_id: string | null;
  recurrence_parent_id: string | null;
  occurrence_original_start: string | null;
  is_cancelled_occurrence: boolean;
};

export type EventRecurrence = {
  id: string;
  user_id: string;
  frequency: RecurFrequency;
  repeat_every: number;
  by_weekday: number[] | null;
  by_monthday: number[] | null;
  by_month: number[] | null;
  end_type: RecurEndType;
  occurrence_count: number | null;
  until: string | null;
};

export type EventCollaborator = {
  id: string;
  event_id: string;
  user_id: string;
  can_edit: boolean;
  response: CollaboratorResponse;
};

export type EventReminder = {
  id: string;
  event_id: string;
  offset_kind: ReminderOffset;
  channel: string;
  scheduled_for: string | null;
  sent: boolean;
  sent_at: string | null;
};

export type EventAttachment = {
  id: string;
  event_id: string;
  storage_path: string;
  filename: string | null;
  size_bytes: number | null;
};

/**
 * Um item já resolvido para exibição: evento simples, ocorrência expandida de
 * uma série ou override de ocorrência. `id` é o do evento base ou do override.
 */
export type DiarioItem = EventRow & {
  /** Evento base da série. Null quando o evento não é recorrente. */
  seriesId: string | null;
  occurrenceStart: string;
  occurrenceEnd: string;
  /** Início da ocorrência na série original, chave para casar overrides. */
  originalStart: string | null;
  isOccurrence: boolean;
  isOverride: boolean;
  isOwner: boolean;
  canEdit: boolean;
  recurrence: EventRecurrence | null;
  collaborators: EventCollaborator[];
};

export type RelatedOption = { id: string; label: string };
export type RelatedOptions = Record<EventRelatedKind, RelatedOption[]>;

export type DiarioMode = "calendar" | "list";
export type DiarioView = "day" | "week" | "month" | "year";

export const EVENT_ATTACHMENTS_BUCKET = "event-attachments";

export const REMINDER_LABELS: Record<ReminderOffset, string> = {
  same_day: "No mesmo dia",
  prev_5min: "5 minutos antes",
  prev_15min: "15 minutos antes",
  prev_30min: "30 minutos antes",
  prev_hour: "Uma hora antes",
  prev_day: "Um dia antes",
  prev_week: "Uma semana antes",
  prev_month: "Um mês antes"
};

export const REMINDER_ORDER: ReminderOffset[] = [
  "same_day",
  "prev_5min",
  "prev_15min",
  "prev_30min",
  "prev_hour",
  "prev_day",
  "prev_week",
  "prev_month"
];

export const RELATED_KIND_LABELS: Record<EventRelatedKind, string> = {
  none: "Nenhum",
  company: "Empresa",
  contact: "Contato",
  product: "Produto",
  sales_document: "Documento de venda",
  purchase: "Compra",
  opportunity: "Oportunidade"
};

export const RELATED_KIND_ORDER: EventRelatedKind[] = [
  "none",
  "company",
  "contact",
  "product",
  "sales_document",
  "purchase",
  "opportunity"
];

export const VISIBILITY_LABELS: Record<EventVisibility, string> = {
  public: "Público",
  private: "Privado"
};

export const FREQUENCY_LABELS: Record<RecurFrequency, string> = {
  daily: "Diária",
  weekly: "Semanal",
  monthly: "Mensal",
  yearly: "Anual"
};

export const END_TYPE_LABELS: Record<RecurEndType, string> = {
  after_count: "Após um número de ocorrências",
  on_date: "Em uma data",
  never: "Nunca"
};

export const RESPONSE_LABELS: Record<CollaboratorResponse, string> = {
  pending: "Pendente",
  accepted: "Aceito",
  declined: "Recusado"
};

/** Índice = Date.getDay() (0 = domingo), igual ao by_weekday do banco. */
export const WEEKDAY_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
/** Ordem de exibição começando na segunda, convenção usada na França. */
export const WEEKDAY_DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

export const MONTH_NAMES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro"
];

/** Rótulo legível do objeto vinculado, ou null quando não há vínculo. */
export function relatedLabel(
  kind: EventRelatedKind,
  id: string | null,
  options: RelatedOptions
): string | null {
  if (kind === "none" || !id) {
    return null;
  }
  const match = options[kind]?.find((option) => option.id === id);
  return match ? match.label : RELATED_KIND_LABELS[kind];
}
