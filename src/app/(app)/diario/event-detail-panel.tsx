"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { describeRecurrence } from "@/lib/recurrence";
import { createClient } from "@/lib/supabase/client";
import { fmtDayLong, fmtTime, toRecurrenceRule } from "./date-utils";
import {
  EVENT_ATTACHMENTS_BUCKET,
  REMINDER_LABELS,
  RELATED_KIND_LABELS,
  RESPONSE_LABELS,
  VISIBILITY_LABELS,
  relatedLabel,
  type DiarioItem,
  type EventAttachment,
  type EventCategory,
  type EventReminder,
  type RelatedOptions
} from "./types";

// Painel lateral de detalhe do evento. Lembretes e anexos são carregados sob
// demanda (só quando o painel abre), para não pesar a carga do período.

type DeleteScope = "occurrence" | "series";

export function EventDetailPanel({
  categories,
  item,
  onClose,
  onChanged,
  onEdit,
  relatedOptions,
  userId
}: {
  categories: EventCategory[];
  item: DiarioItem;
  onClose: () => void;
  onChanged: () => void;
  onEdit: (item: DiarioItem) => void;
  relatedOptions: RelatedOptions;
  userId: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const { showToast } = useToast();
  const [reminders, setReminders] = useState<EventReminder[]>([]);
  const [attachments, setAttachments] = useState<EventAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [askScope, setAskScope] = useState(false);

  const category = categories.find((row) => row.id === item.category_id) ?? null;
  const link = relatedLabel(item.related_kind, item.related_id, relatedOptions);
  const start = new Date(item.occurrenceStart);
  const end = new Date(item.occurrenceEnd);

  useEffect(() => {
    let active = true;
    setLoading(true);

    async function load() {
      const [remindersRes, attachmentsRes] = await Promise.all([
        supabase
          .from("event_reminders")
          .select("id,event_id,offset_kind,channel,scheduled_for,sent,sent_at")
          .eq("event_id", item.id),
        supabase
          .from("event_attachments")
          .select("id,event_id,storage_path,filename,size_bytes")
          .eq("event_id", item.id)
          .order("created_at", { ascending: true })
      ]);
      if (!active) {
        return;
      }
      setReminders((remindersRes.data ?? []) as EventReminder[]);
      setAttachments((attachmentsRes.data ?? []) as EventAttachment[]);
      setLoading(false);
    }

    void load();
    return () => {
      active = false;
    };
  }, [item.id, supabase]);

  async function openAttachment(attachment: EventAttachment) {
    const { data, error } = await supabase.storage
      .from(EVENT_ATTACHMENTS_BUCKET)
      .createSignedUrl(attachment.storage_path, 120);
    if (error || !data?.signedUrl) {
      showToast("Não foi possível abrir o anexo.", "error");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function remove(scope: DeleteScope) {
    setDeleting(true);

    if (scope === "series" || !item.isOccurrence) {
      const targetId = scope === "series" ? item.seriesId ?? item.id : item.id;
      const { error } = await supabase.from("events").delete().eq("id", targetId);
      setDeleting(false);
      if (error) {
        showToast("Não foi possível excluir o evento.", "error");
        return;
      }
      showToast(scope === "series" ? "Série excluída." : "Evento excluído.", "success");
      onChanged();
      onClose();
      return;
    }

    // Só esta ocorrência: marca (ou cria) o override cancelado da série.
    if (item.isOverride) {
      const { error } = await supabase
        .from("events")
        .update({ is_cancelled_occurrence: true })
        .eq("id", item.id);
      setDeleting(false);
      if (error) {
        showToast("Não foi possível excluir esta ocorrência.", "error");
        return;
      }
      showToast("Ocorrência excluída.", "success");
      onChanged();
      onClose();
      return;
    }

    if (!item.seriesId || !item.originalStart) {
      setDeleting(false);
      showToast("Não foi possível identificar a ocorrência.", "error");
      return;
    }

    const { error } = await supabase.from("events").insert({
      user_id: userId,
      category_id: item.category_id,
      title: item.title,
      description: item.description,
      location: item.location,
      starts_at: item.occurrenceStart,
      ends_at: item.occurrenceEnd,
      all_day: item.all_day,
      visibility: item.visibility,
      related_kind: item.related_kind,
      related_id: item.related_id,
      is_recurring: false,
      recurrence_parent_id: item.seriesId,
      occurrence_original_start: item.originalStart,
      is_cancelled_occurrence: true
    });
    setDeleting(false);
    if (error) {
      showToast("Não foi possível excluir esta ocorrência.", "error");
      return;
    }
    showToast("Ocorrência excluída.", "success");
    onChanged();
    onClose();
  }

  function handleDeleteClick() {
    if (item.isOccurrence && item.seriesId) {
      setAskScope(true);
      return;
    }
    void remove("series");
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        aria-label="Fechar detalhe"
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
        onClick={onClose}
        type="button"
      />
      <aside className="relative flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Evento</p>
            <h2 className="truncate text-lg font-semibold text-ink">{item.title}</h2>
          </div>
          <button
            aria-label="Fechar"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 ring-1 ring-black/5 transition hover:bg-slate-50 hover:text-ink"
            onClick={onClose}
            type="button"
          >
            <svg fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeWidth="2" viewBox="0 0 24 24" width="16">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          <Row label="Rótulo">
            {category ? (
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: category.color || "#94A3B8" }}
                />
                {category.emoji ? <span aria-hidden>{category.emoji}</span> : null}
                {category.name}
              </span>
            ) : (
              "—"
            )}
          </Row>

          <Row label="Data e hora">
            <span className="capitalize">{fmtDayLong(start)}</span>
            <br />
            {item.all_day
              ? "O dia todo"
              : `${fmtTime(item.occurrenceStart)} às ${fmtTime(item.occurrenceEnd)}`}
            {start.toDateString() !== end.toDateString() ? (
              <>
                <br />
                <span className="text-xs text-muted">Termina em {fmtDayLong(end)}</span>
              </>
            ) : null}
          </Row>

          {item.recurrence ? (
            <Row label="Recorrência">{describeRecurrence(toRecurrenceRule(item.recurrence))}</Row>
          ) : null}

          <Row label="Local">{item.location || "—"}</Row>

          <Row label="Relacionado a">
            {link ? (
              <span>
                <span className="text-xs uppercase tracking-wide text-slate-400">
                  {RELATED_KIND_LABELS[item.related_kind]}
                </span>
                <br />
                {link}
              </span>
            ) : (
              "—"
            )}
          </Row>

          <Row label="Confidencialidade">{VISIBILITY_LABELS[item.visibility]}</Row>

          {item.description ? (
            <Row label="Descrição">
              <span className="whitespace-pre-wrap">{item.description}</span>
            </Row>
          ) : null}

          <Row label="Colaboradores">
            {item.collaborators.length === 0 ? (
              "—"
            ) : (
              <ul className="space-y-1">
                {item.collaborators.map((collaborator) => (
                  <li className="flex items-center justify-between gap-2" key={collaborator.id}>
                    <span className="truncate">
                      {collaborator.user_id === userId ? "Você" : `Colaborador ${collaborator.user_id.slice(0, 8)}`}
                      {collaborator.can_edit ? (
                        <span className="ml-1.5 text-xs text-muted">(pode editar)</span>
                      ) : null}
                    </span>
                    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                      {RESPONSE_LABELS[collaborator.response]}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Row>

          <Row label="Lembretes">
            {loading ? (
              <span className="text-muted">Carregando...</span>
            ) : reminders.length === 0 ? (
              "—"
            ) : (
              <ul className="space-y-1">
                {reminders.map((reminder) => (
                  <li className="flex items-center justify-between gap-2" key={reminder.id}>
                    <span>{REMINDER_LABELS[reminder.offset_kind]}</span>
                    {reminder.sent ? (
                      <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                        Enviado
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </Row>

          <Row label="Anexos">
            {loading ? (
              <span className="text-muted">Carregando...</span>
            ) : attachments.length === 0 ? (
              "—"
            ) : (
              <ul className="space-y-1">
                {attachments.map((attachment) => (
                  <li key={attachment.id}>
                    <button
                      className="truncate text-left font-medium text-brand underline-offset-2 hover:underline"
                      onClick={() => void openAttachment(attachment)}
                      type="button"
                    >
                      {attachment.filename || "Anexo"}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Row>
        </div>

        <footer className="border-t border-line px-5 py-4">
          {askScope ? (
            <div className="space-y-3">
              <p className="text-sm text-ink">
                Este evento faz parte de uma série. O que você quer excluir?
              </p>
              <div className="flex flex-wrap gap-2">
                <Button disabled={deleting} onClick={() => void remove("occurrence")} type="button" variant="secondary">
                  Só esta
                </Button>
                <Button disabled={deleting} onClick={() => void remove("series")} type="button" variant="secondary">
                  Toda a série
                </Button>
                <Button disabled={deleting} onClick={() => setAskScope(false)} type="button" variant="secondary">
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <button
                className="inline-flex h-11 items-center justify-center rounded-2xl px-4 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={!item.canEdit || deleting}
                onClick={handleDeleteClick}
                title={item.canEdit ? undefined : "Você não tem permissão para excluir este evento."}
                type="button"
              >
                Excluir
              </button>
              <Button
                disabled={!item.canEdit}
                onClick={() => onEdit(item)}
                title={item.canEdit ? undefined : "Você não tem permissão para editar este evento."}
                type="button"
              >
                Modificar
              </Button>
            </div>
          )}
        </footer>
      </aside>
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <div className="mt-1 text-sm text-ink">{children}</div>
    </div>
  );
}
