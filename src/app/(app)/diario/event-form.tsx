"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { FormModal } from "@/components/ui/form-modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { describeRecurrence } from "@/lib/recurrence";
import { createClient } from "@/lib/supabase/client";
import { validateUpload } from "@/lib/upload-validation";
import { combineDateTime, endOfDay, isoDate, startOfDay, timeValue } from "./date-utils";
import {
  END_TYPE_LABELS,
  EVENT_ATTACHMENTS_BUCKET,
  FREQUENCY_LABELS,
  RELATED_KIND_LABELS,
  RELATED_KIND_ORDER,
  REMINDER_LABELS,
  REMINDER_ORDER,
  VISIBILITY_LABELS,
  WEEKDAY_DISPLAY_ORDER,
  WEEKDAY_SHORT,
  type DiarioItem,
  type EventAttachment,
  type EventCategory,
  type EventRelatedKind,
  type EventVisibility,
  type RecurEndType,
  type RecurFrequency,
  type ReminderOffset,
  type RelatedOptions
} from "./types";
import { eventSchema, recurrenceSchema } from "./validation";

// Formulário de criação e edição de evento. A série recorrente grava primeiro a
// regra em event_recurrences e só depois o evento com recurrence_id.
// scheduled_for do lembrete nunca é enviado: quem calcula é o trigger do banco.

export function EventForm({
  categories,
  initialDate,
  item,
  onClose,
  onSaved,
  relatedOptions,
  userId
}: {
  categories: EventCategory[];
  initialDate: Date;
  item: DiarioItem | null;
  onClose: () => void;
  onSaved: () => void;
  relatedOptions: RelatedOptions;
  userId: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const { showToast } = useToast();

  const editing = item !== null;
  const isOwner = item ? item.isOwner : true;
  // Ocorrência sem override edita a série inteira (o evento base).
  const editsWholeSeries = Boolean(item?.isOccurrence && !item.isOverride);
  // Override é uma ocorrência solta: nunca mexe na regra da série.
  const isOverrideEdit = Boolean(item?.isOverride);
  const seriesRecurrenceId = item && !item.isOverride ? item.recurrence?.id ?? null : null;

  const baseStart = item ? new Date(item.isOverride ? item.occurrenceStart : item.starts_at) : initialDate;
  const baseEnd = item
    ? new Date(item.isOverride ? item.occurrenceEnd : item.ends_at)
    : new Date(initialDate.getTime() + 60 * 60000);

  const [categoryId, setCategoryId] = useState(item?.category_id ?? "");
  const [title, setTitle] = useState(item?.title ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [location, setLocation] = useState(item?.location ?? "");
  const [allDay, setAllDay] = useState(item?.all_day ?? false);
  const [startDate, setStartDate] = useState(isoDate(baseStart));
  const [startTime, setStartTime] = useState(timeValue(baseStart));
  const [endDate, setEndDate] = useState(isoDate(baseEnd));
  const [endTime, setEndTime] = useState(timeValue(baseEnd));
  const [visibility, setVisibility] = useState<EventVisibility>(item?.visibility ?? "public");
  const [relatedKind, setRelatedKind] = useState<EventRelatedKind>(item?.related_kind ?? "none");
  const [relatedId, setRelatedId] = useState(item?.related_id ?? "");

  const [recurring, setRecurring] = useState(Boolean(seriesRecurrenceId));
  const [frequency, setFrequency] = useState<RecurFrequency>(item?.recurrence?.frequency ?? "weekly");
  const [repeatEvery, setRepeatEvery] = useState(String(item?.recurrence?.repeat_every ?? 1));
  const [byWeekday, setByWeekday] = useState<number[]>(item?.recurrence?.by_weekday ?? []);
  const [endType, setEndType] = useState<RecurEndType>(item?.recurrence?.end_type ?? "never");
  const [occurrenceCount, setOccurrenceCount] = useState(String(item?.recurrence?.occurrence_count ?? 10));
  const [until, setUntil] = useState(item?.recurrence?.until ?? "");

  const [reminders, setReminders] = useState<ReminderOffset[]>([]);
  const [initialReminders, setInitialReminders] = useState<ReminderOffset[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<EventAttachment[]>([]);
  const [removedAttachmentIds, setRemovedAttachmentIds] = useState<string[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);

  const targetEventId = item ? (editsWholeSeries ? item.seriesId ?? item.id : item.id) : null;

  useEffect(() => {
    if (!targetEventId || !isOwner) {
      return;
    }
    let active = true;

    async function load() {
      const [remindersRes, attachmentsRes] = await Promise.all([
        supabase.from("event_reminders").select("offset_kind").eq("event_id", targetEventId),
        supabase
          .from("event_attachments")
          .select("id,event_id,storage_path,filename,size_bytes")
          .eq("event_id", targetEventId)
          .order("created_at", { ascending: true })
      ]);
      if (!active) {
        return;
      }
      const offsets = ((remindersRes.data ?? []) as Array<{ offset_kind: ReminderOffset }>).map(
        (row) => row.offset_kind
      );
      setReminders(offsets);
      setInitialReminders(offsets);
      setExistingAttachments((attachmentsRes.data ?? []) as EventAttachment[]);
    }

    void load();
    return () => {
      active = false;
    };
  }, [isOwner, supabase, targetEventId]);

  const availableReminders = REMINDER_ORDER.filter((offset) => !reminders.includes(offset));
  const relatedList = relatedOptions[relatedKind] ?? [];

  function toggleWeekday(day: number) {
    setByWeekday((current) =>
      current.includes(day) ? current.filter((value) => value !== day) : [...current, day].sort((a, b) => a - b)
    );
  }

  function addReminder(offset: ReminderOffset) {
    setReminders((current) => (current.includes(offset) ? current : [...current, offset]));
  }

  function pickFiles(fileList: FileList | null) {
    if (!fileList) {
      return;
    }
    const accepted: File[] = [];
    for (const file of Array.from(fileList)) {
      const error = validateUpload(file, "document");
      if (error) {
        showToast(`${file.name}: ${error}`, "error");
        continue;
      }
      accepted.push(file);
    }
    if (accepted.length > 0) {
      setNewFiles((current) => [...current, ...accepted]);
    }
  }

  const recurrencePreview = useMemo(() => {
    if (!recurring) {
      return null;
    }
    const every = Number(repeatEvery) || 1;
    return describeRecurrence({
      frequency,
      repeatEvery: every,
      byWeekday: frequency === "weekly" && byWeekday.length > 0 ? byWeekday : null,
      endType,
      occurrenceCount: endType === "after_count" ? Number(occurrenceCount) || null : null,
      until: endType === "on_date" ? until || null : null
    });
  }, [byWeekday, endType, frequency, occurrenceCount, recurring, repeatEvery, until]);

  async function save() {
    const starts = allDay ? startOfDay(combineDateTime(startDate, "00:00")) : combineDateTime(startDate, startTime);
    const ends = allDay ? endOfDay(combineDateTime(endDate, "00:00")) : combineDateTime(endDate, endTime);

    const parsed = eventSchema.safeParse({
      title,
      description: description.trim() ? description.trim() : null,
      location: location.trim() ? location.trim() : null,
      starts_at: starts.toISOString(),
      ends_at: ends.toISOString(),
      all_day: allDay,
      visibility,
      category_id: categoryId || null,
      related_kind: relatedKind,
      related_id: relatedKind === "none" ? null : relatedId || null
    });

    if (!parsed.success) {
      showToast(parsed.error.issues[0]?.message ?? "Verifique os campos do evento.", "error");
      return;
    }

    const wantsRecurrence = recurring && !isOverrideEdit;

    let recurrencePayload: {
      frequency: RecurFrequency;
      repeat_every: number;
      by_weekday: number[] | null;
      end_type: RecurEndType;
      occurrence_count: number | null;
      until: string | null;
    } | null = null;

    if (wantsRecurrence) {
      const parsedRecurrence = recurrenceSchema.safeParse({
        frequency,
        repeat_every: repeatEvery,
        by_weekday: frequency === "weekly" && byWeekday.length > 0 ? byWeekday : null,
        end_type: endType,
        occurrence_count: endType === "after_count" ? occurrenceCount : null,
        until: endType === "on_date" ? until || null : null
      });
      if (!parsedRecurrence.success) {
        showToast(parsedRecurrence.error.issues[0]?.message ?? "Verifique a recorrência.", "error");
        return;
      }
      recurrencePayload = {
        frequency: parsedRecurrence.data.frequency,
        repeat_every: parsedRecurrence.data.repeat_every,
        by_weekday: parsedRecurrence.data.by_weekday,
        end_type: parsedRecurrence.data.end_type,
        occurrence_count: parsedRecurrence.data.end_type === "after_count" ? parsedRecurrence.data.occurrence_count : null,
        until: parsedRecurrence.data.end_type === "on_date" ? parsedRecurrence.data.until : null
      };
    }

    setSaving(true);

    // 1. Regra de recorrência primeiro, para o evento já nascer com recurrence_id.
    let recurrenceId: string | null = seriesRecurrenceId;
    const droppedRecurrenceId = !wantsRecurrence ? seriesRecurrenceId : null;

    if (recurrencePayload) {
      if (recurrenceId) {
        const { error } = await supabase
          .from("event_recurrences")
          .update(recurrencePayload)
          .eq("id", recurrenceId);
        if (error) {
          setSaving(false);
          showToast("Não foi possível salvar a recorrência.", "error");
          return;
        }
      } else {
        const { data, error } = await supabase
          .from("event_recurrences")
          .insert({ ...recurrencePayload, user_id: userId })
          .select("id")
          .single();
        if (error || !data) {
          setSaving(false);
          showToast("Não foi possível salvar a recorrência.", "error");
          return;
        }
        recurrenceId = (data as { id: string }).id;
      }
    } else {
      recurrenceId = null;
    }

    // 2. Evento. Na edição não reenviamos user_id (não muda o dono).
    let eventId = targetEventId;

    if (eventId) {
      const { error } = await supabase
        .from("events")
        .update({
          ...parsed.data,
          is_recurring: wantsRecurrence,
          recurrence_id: recurrenceId
        })
        .eq("id", eventId);
      if (error) {
        setSaving(false);
        showToast("Não foi possível salvar o evento.", "error");
        return;
      }
    } else {
      const { data, error } = await supabase
        .from("events")
        .insert({
          ...parsed.data,
          user_id: userId,
          is_recurring: wantsRecurrence,
          recurrence_id: recurrenceId
        })
        .select("id")
        .single();
      if (error || !data) {
        setSaving(false);
        if (recurrenceId) {
          await supabase.from("event_recurrences").delete().eq("id", recurrenceId);
        }
        showToast("Não foi possível criar o evento.", "error");
        return;
      }
      eventId = (data as { id: string }).id;
    }

    // Recorrência desligada: a regra órfã sai junto.
    if (droppedRecurrenceId) {
      await supabase.from("event_recurrences").delete().eq("id", droppedRecurrenceId);
    }

    // 3. Lembretes (só o dono grava, por RLS).
    if (isOwner) {
      const toRemove = initialReminders.filter((offset) => !reminders.includes(offset));
      const toAdd = reminders.filter((offset) => !initialReminders.includes(offset));
      if (toRemove.length > 0) {
        await supabase.from("event_reminders").delete().eq("event_id", eventId).in("offset_kind", toRemove);
      }
      if (toAdd.length > 0) {
        await supabase
          .from("event_reminders")
          .insert(toAdd.map((offset) => ({ event_id: eventId, offset_kind: offset, channel: "email" })));
      }

      // 4. Anexos: remove os marcados e sobe os novos.
      if (removedAttachmentIds.length > 0) {
        const removed = existingAttachments.filter((attachment) =>
          removedAttachmentIds.includes(attachment.id)
        );
        await supabase.from("event_attachments").delete().in("id", removedAttachmentIds);
        if (removed.length > 0) {
          await supabase.storage
            .from(EVENT_ATTACHMENTS_BUCKET)
            .remove(removed.map((attachment) => attachment.storage_path));
        }
      }

      for (const file of newFiles) {
        const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `${userId}/${crypto.randomUUID()}-${safe}`;
        const { error: uploadError } = await supabase.storage
          .from(EVENT_ATTACHMENTS_BUCKET)
          .upload(path, file, { contentType: file.type || undefined, upsert: false });
        if (uploadError) {
          showToast(`Não foi possível enviar o anexo ${file.name}.`, "error");
          continue;
        }
        const { error: rowError } = await supabase.from("event_attachments").insert({
          event_id: eventId,
          storage_path: path,
          filename: file.name,
          size_bytes: file.size
        });
        if (rowError) {
          await supabase.storage.from(EVENT_ATTACHMENTS_BUCKET).remove([path]);
          showToast(`Não foi possível registrar o anexo ${file.name}.`, "error");
        }
      }
    }

    setSaving(false);
    showToast(editing ? "Evento atualizado." : "Evento criado.", "success");
    onSaved();
    onClose();
  }

  return (
    <FormModal
      description={
        editsWholeSeries
          ? "Este evento faz parte de uma série. As mudanças valem para toda a série."
          : "Preencha os dados do evento. Os campos com hora ficam desativados quando o evento dura o dia todo."
      }
      isOpen
      onClose={onClose}
      title={editing ? "Modificar evento" : "Novo evento"}
    >
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Rótulo">
            <Select onChange={(event) => setCategoryId(event.target.value)} value={categoryId}>
              <option value="">Sem rótulo</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.emoji ? `${category.emoji} ` : ""}
                  {category.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Confidencialidade">
            <Select
              onChange={(event) => setVisibility(event.target.value as EventVisibility)}
              value={visibility}
            >
              {(Object.keys(VISIBILITY_LABELS) as EventVisibility[]).map((value) => (
                <option key={value} value={value}>
                  {VISIBILITY_LABELS[value]}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Título">
          <Input
            maxLength={200}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Reunião com o cliente"
            value={title}
          />
        </Field>

        <Field label="Descrição">
          <Textarea
            maxLength={4000}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Detalhes do evento"
            value={description}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Início">
            <div className="flex gap-2">
              <Input onChange={(event) => setStartDate(event.target.value)} type="date" value={startDate} />
              <Input
                className="w-32"
                disabled={allDay}
                onChange={(event) => setStartTime(event.target.value)}
                type="time"
                value={startTime}
              />
            </div>
          </Field>
          <Field label="Fim">
            <div className="flex gap-2">
              <Input onChange={(event) => setEndDate(event.target.value)} type="date" value={endDate} />
              <Input
                className="w-32"
                disabled={allDay}
                onChange={(event) => setEndTime(event.target.value)}
                type="time"
                value={endTime}
              />
            </div>
          </Field>
        </div>

        <label className="flex cursor-pointer items-center gap-2.5">
          <input
            checked={allDay}
            className="h-4 w-4 accent-[#002D72]"
            onChange={(event) => setAllDay(event.target.checked)}
            type="checkbox"
          />
          <span className="text-sm font-medium text-ink">O dia todo</span>
        </label>

        <Field label="Local">
          <Input
            maxLength={300}
            onChange={(event) => setLocation(event.target.value)}
            placeholder="Endereço, sala ou link"
            value={location}
          />
        </Field>

        {/* Recorrência */}
        <section className="rounded-2xl bg-slate-50 p-4">
          {isOverrideEdit ? (
            <p className="text-xs text-muted">
              Esta ocorrência foi alterada individualmente, então a recorrência é gerenciada na série.
            </p>
          ) : null}
          <label className={`flex cursor-pointer items-center gap-2.5 ${isOverrideEdit ? "hidden" : ""}`}>
            <input
              checked={recurring}
              className="h-4 w-4 accent-[#002D72]"
              onChange={(event) => setRecurring(event.target.checked)}
              type="checkbox"
            />
            <span className="text-sm font-semibold text-ink">Criar um evento recorrente</span>
          </label>

          {recurring && !isOverrideEdit ? (
            <div className="mt-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Frequência">
                  <Select
                    onChange={(event) => setFrequency(event.target.value as RecurFrequency)}
                    value={frequency}
                  >
                    {(Object.keys(FREQUENCY_LABELS) as RecurFrequency[]).map((value) => (
                      <option key={value} value={value}>
                        {FREQUENCY_LABELS[value]}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Repetir a cada">
                  <Input
                    max={365}
                    min={1}
                    onChange={(event) => setRepeatEvery(event.target.value)}
                    type="number"
                    value={repeatEvery}
                  />
                </Field>
              </div>

              {frequency === "weekly" ? (
                <Field label="Dias da semana">
                  <div className="flex flex-wrap gap-2">
                    {WEEKDAY_DISPLAY_ORDER.map((day) => (
                      <button
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                          byWeekday.includes(day)
                            ? "bg-brand text-white"
                            : "bg-white text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-50"
                        }`}
                        key={day}
                        onClick={() => toggleWeekday(day)}
                        type="button"
                      >
                        {WEEKDAY_SHORT[day]}
                      </button>
                    ))}
                  </div>
                </Field>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Fim da recorrência">
                  <Select onChange={(event) => setEndType(event.target.value as RecurEndType)} value={endType}>
                    {(Object.keys(END_TYPE_LABELS) as RecurEndType[]).map((value) => (
                      <option key={value} value={value}>
                        {END_TYPE_LABELS[value]}
                      </option>
                    ))}
                  </Select>
                </Field>
                {endType === "after_count" ? (
                  <Field label="Número de ocorrências">
                    <Input
                      max={500}
                      min={1}
                      onChange={(event) => setOccurrenceCount(event.target.value)}
                      type="number"
                      value={occurrenceCount}
                    />
                  </Field>
                ) : null}
                {endType === "on_date" ? (
                  <Field label="Até">
                    <Input onChange={(event) => setUntil(event.target.value)} type="date" value={until} />
                  </Field>
                ) : null}
              </div>

              {recurrencePreview ? <p className="text-xs text-muted">{recurrencePreview}</p> : null}
            </div>
          ) : null}
        </section>

        {/* Lembretes */}
        <section className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm font-semibold text-ink">Lembretes</p>
          {!isOwner ? (
            <p className="mt-1 text-xs text-muted">Só o dono do evento pode configurar lembretes.</p>
          ) : (
            <>
              <div className="mt-3 space-y-2">
                {reminders.length === 0 ? (
                  <p className="text-xs text-muted">Nenhum lembrete adicionado.</p>
                ) : (
                  reminders.map((offset) => (
                    <div
                      className="flex items-center justify-between gap-2 rounded-2xl bg-white px-3 py-2 ring-1 ring-black/5"
                      key={offset}
                    >
                      <span className="text-sm text-ink">{REMINDER_LABELS[offset]}</span>
                      <button
                        className="rounded-lg px-2 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
                        onClick={() => setReminders((current) => current.filter((value) => value !== offset))}
                        type="button"
                      >
                        Remover
                      </button>
                    </div>
                  ))
                )}
              </div>
              <div className="mt-3">
                <Select
                  aria-label="Adicionar lembrete"
                  disabled={availableReminders.length === 0}
                  onChange={(event) => {
                    if (event.target.value) {
                      addReminder(event.target.value as ReminderOffset);
                      event.target.value = "";
                    }
                  }}
                  value=""
                >
                  <option value="">
                    {availableReminders.length === 0 ? "Todos os lembretes já adicionados" : "Adicionar lembrete"}
                  </option>
                  {availableReminders.map((offset) => (
                    <option key={offset} value={offset}>
                      {REMINDER_LABELS[offset]}
                    </option>
                  ))}
                </Select>
              </div>
            </>
          )}
        </section>

        {/* Relacionado a */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Relacionado a">
            <Select
              onChange={(event) => {
                setRelatedKind(event.target.value as EventRelatedKind);
                setRelatedId("");
              }}
              value={relatedKind}
            >
              {RELATED_KIND_ORDER.map((kind) => (
                <option key={kind} value={kind}>
                  {RELATED_KIND_LABELS[kind]}
                </option>
              ))}
            </Select>
          </Field>
          {relatedKind !== "none" ? (
            <Field label={RELATED_KIND_LABELS[relatedKind]}>
              {relatedList.length > 0 ? (
                <Select onChange={(event) => setRelatedId(event.target.value)} value={relatedId}>
                  <option value="">Selecione</option>
                  {relatedList.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              ) : (
                <Input
                  onChange={(event) => setRelatedId(event.target.value)}
                  placeholder="Identificador do objeto"
                  value={relatedId}
                />
              )}
            </Field>
          ) : null}
        </div>

        {/* Anexos */}
        <section className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm font-semibold text-ink">Anexos</p>
          {!isOwner ? (
            <p className="mt-1 text-xs text-muted">Só o dono do evento pode gerenciar anexos.</p>
          ) : (
            <>
              <div className="mt-3 space-y-2">
                {existingAttachments
                  .filter((attachment) => !removedAttachmentIds.includes(attachment.id))
                  .map((attachment) => (
                    <div
                      className="flex items-center justify-between gap-2 rounded-2xl bg-white px-3 py-2 ring-1 ring-black/5"
                      key={attachment.id}
                    >
                      <span className="truncate text-sm text-ink">{attachment.filename || "Anexo"}</span>
                      <button
                        className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
                        onClick={() => setRemovedAttachmentIds((current) => [...current, attachment.id])}
                        type="button"
                      >
                        Remover
                      </button>
                    </div>
                  ))}
                {newFiles.map((file, index) => (
                  <div
                    className="flex items-center justify-between gap-2 rounded-2xl bg-white px-3 py-2 ring-1 ring-black/5"
                    key={`${file.name}-${index}`}
                  >
                    <span className="truncate text-sm text-ink">{file.name}</span>
                    <button
                      className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
                      onClick={() => setNewFiles((current) => current.filter((_, position) => position !== index))}
                      type="button"
                    >
                      Remover
                    </button>
                  </div>
                ))}
              </div>
              <input
                accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
                className="mt-3 block w-full text-sm text-slate-600 file:mr-3 file:rounded-full file:border-0 file:bg-slate-200 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-ink hover:file:bg-slate-300"
                multiple
                onChange={(event) => {
                  pickFiles(event.target.files);
                  event.target.value = "";
                }}
                type="file"
              />
            </>
          )}
        </section>

        <div className="flex items-center justify-end gap-2 border-t border-line pt-4">
          <Button onClick={onClose} type="button" variant="secondary">
            Cancelar
          </Button>
          <Button disabled={saving} onClick={() => void save()} type="button">
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </div>
    </FormModal>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      {children}
    </label>
  );
}
