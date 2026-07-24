// Schemas Zod do módulo Diário. Usados pelo formulário de evento antes de
// gravar. Não valida scheduled_for de lembrete: quem calcula é o trigger.
import { z } from "zod";

const VISIBILITY = ["public", "private"] as const;
const RELATED_KIND = [
  "none",
  "company",
  "contact",
  "product",
  "sales_document",
  "purchase",
  "opportunity"
] as const;
const FREQUENCY = ["daily", "weekly", "monthly", "yearly"] as const;
const END_TYPE = ["after_count", "on_date", "never"] as const;
const REMINDER_OFFSET = [
  "same_day",
  "prev_5min",
  "prev_15min",
  "prev_30min",
  "prev_hour",
  "prev_day",
  "prev_week",
  "prev_month"
] as const;

export const eventSchema = z
  .object({
    title: z.string().trim().min(1, "Informe o título do evento.").max(200, "Título muito longo."),
    description: z.string().trim().max(4000, "Descrição muito longa.").nullable(),
    location: z.string().trim().max(300, "Local muito longo.").nullable(),
    starts_at: z.string().min(1, "Informe a data de início."),
    ends_at: z.string().min(1, "Informe a data de fim."),
    all_day: z.boolean(),
    visibility: z.enum(VISIBILITY, { message: "Confidencialidade inválida." }),
    category_id: z.string().uuid("Rótulo inválido.").nullable(),
    related_kind: z.enum(RELATED_KIND, { message: "Tipo de vínculo inválido." }),
    related_id: z.string().uuid("Selecione um objeto relacionado válido.").nullable()
  })
  .refine((value) => !Number.isNaN(new Date(value.starts_at).getTime()), {
    message: "Data de início inválida.",
    path: ["starts_at"]
  })
  .refine((value) => !Number.isNaN(new Date(value.ends_at).getTime()), {
    message: "Data de fim inválida.",
    path: ["ends_at"]
  })
  .refine((value) => new Date(value.ends_at).getTime() >= new Date(value.starts_at).getTime(), {
    message: "O fim deve ser igual ou posterior ao início.",
    path: ["ends_at"]
  })
  .refine((value) => value.related_kind === "none" || value.related_id !== null, {
    message: "Escolha o objeto relacionado ou deixe o vínculo em Nenhum.",
    path: ["related_id"]
  });

export const recurrenceSchema = z
  .object({
    frequency: z.enum(FREQUENCY, { message: "Frequência inválida." }),
    repeat_every: z.coerce
      .number()
      .int("Informe um número inteiro.")
      .min(1, "O intervalo deve ser pelo menos 1.")
      .max(365, "Intervalo muito grande."),
    by_weekday: z.array(z.number().int().min(0).max(6)).nullable(),
    end_type: z.enum(END_TYPE, { message: "Tipo de fim inválido." }),
    occurrence_count: z.coerce
      .number()
      .int("Informe um número inteiro.")
      .min(1, "Informe pelo menos 1 ocorrência.")
      .max(500, "Máximo de 500 ocorrências.")
      .nullable(),
    until: z.string().nullable()
  })
  .refine((value) => value.end_type !== "after_count" || value.occurrence_count !== null, {
    message: "Informe o número de ocorrências.",
    path: ["occurrence_count"]
  })
  .refine((value) => value.end_type !== "on_date" || (value.until !== null && value.until !== ""), {
    message: "Informe a data final da recorrência.",
    path: ["until"]
  })
  .refine(
    (value) => value.frequency !== "weekly" || value.by_weekday === null || value.by_weekday.length > 0,
    { message: "Escolha pelo menos um dia da semana.", path: ["by_weekday"] }
  );

export const reminderSchema = z.object({
  offset_kind: z.enum(REMINDER_OFFSET, { message: "Antecedência inválida." }),
  channel: z.string().trim().min(1).max(30).default("email")
});

export type EventInput = z.output<typeof eventSchema>;
export type RecurrenceInput = z.output<typeof recurrenceSchema>;
export type ReminderInput = z.output<typeof reminderSchema>;
