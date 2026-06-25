"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { logActivity } from "@/lib/crm/activity";
import { t, type Locale } from "@/lib/i18n/dictionaries";
import { createClient } from "@/lib/supabase/client";
import { documentStatusLabels, documentTypeLabels, type Document, type DocumentStatus } from "@/lib/types";
import type {
  CrmActivityLog,
  CrmClient,
  CrmContact,
  CrmDossier,
  CrmNote,
  CrmTask,
  CrmTaskStatus
} from "@/lib/crm/types";
import { createInvoiceFromCrmClient } from "./actions";

const docStatusClass: Record<DocumentStatus, string> = {
  draft: "bg-slate-100 text-slate-600",
  sent: "bg-sky-100 text-sky-700",
  paid: "bg-emerald-100 text-emerald-700",
  partial: "bg-amber-100 text-amber-700",
  cancelled: "bg-rose-100 text-rose-700",
  expired: "bg-slate-100 text-slate-500",
  accepted: "bg-emerald-100 text-emerald-700",
  refused: "bg-rose-100 text-rose-700"
};

const entityLabel: Record<string, string> = {
  client: "Client",
  contact: "Contact",
  dossier: "Dossier",
  note: "Note",
  task: "Tâche"
};

const taskStatusLabel: Record<CrmTaskStatus, string> = { todo: "À faire", doing: "En cours", done: "Terminé" };
const taskNext: Record<CrmTaskStatus, CrmTaskStatus> = { todo: "doing", doing: "done", done: "todo" };
const dossierStatusLabel: Record<CrmDossier["status"], string> = {
  open: "Ouvert",
  in_progress: "En cours",
  closed: "Fermé"
};

function Section({ children, count, title }: { children: ReactNode; count: number; title: string }) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-600">{count}</span>
      </div>
      {children}
    </section>
  );
}

export function CrmClientDetail({
  client,
  initialActivity,
  initialInvoices,
  initialContacts,
  initialDossiers,
  initialNotes,
  initialTasks,
  locale,
  userId
}: {
  client: CrmClient;
  initialActivity: CrmActivityLog[];
  initialInvoices: Document[];
  initialContacts: CrmContact[];
  initialDossiers: CrmDossier[];
  initialNotes: CrmNote[];
  initialTasks: CrmTask[];
  locale: Locale;
  userId: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const invoices = initialInvoices;
  const formatEur = (value: number) =>
    new Intl.NumberFormat(locale === "pt" ? "pt-BR" : "fr-FR", {
      style: "currency",
      currency: "EUR"
    }).format(value);
  const totalBilled = invoices
    .filter((doc) => doc.type === "facture")
    .reduce((sum, doc) => sum + Number(doc.total_ttc), 0);
  const router = useRouter();
  const { showToast } = useToast();
  const [contacts, setContacts] = useState(initialContacts);
  const [dossiers, setDossiers] = useState(initialDossiers);
  const [notes, setNotes] = useState(initialNotes);
  const [tasks, setTasks] = useState(initialTasks);
  const [activity, setActivity] = useState(initialActivity);

  async function record(action: string, entity: string, entityId: string, label: string) {
    const log = await logActivity(supabase, {
      action,
      clientId: client.id,
      companyId: client.company_id,
      entity,
      entityId,
      label,
      userId
    });
    if (log) setActivity((current) => [log, ...current]);
  }

  async function archiveClient() {
    const { error } = await supabase.from("crm_clients").update({ archived: true }).eq("id", client.id);
    if (error) {
      showToast("Impossible d'archiver le client.", "error");
      return;
    }
    showToast("Client archivé.", "success");
    router.push("/crm");
    router.refresh();
  }
  const [contactForm, setContactForm] = useState({ name: "", email: "" });
  const [dossierTitle, setDossierTitle] = useState("");
  const [taskForm, setTaskForm] = useState({ title: "", due: "" });
  const [noteBody, setNoteBody] = useState("");

  const base = { client_id: client.id, company_id: client.company_id };

  async function addContact(event: React.FormEvent) {
    event.preventDefault();
    if (!contactForm.name.trim()) return;
    const { data, error } = await supabase
      .from("crm_contacts")
      .insert({ ...base, email: contactForm.email.trim() || null, name: contactForm.name.trim() })
      .select("*")
      .single();
    if (error || !data) return showToast("Impossible d'ajouter le contact.", "error");
    const created = data as CrmContact;
    setContacts((current) => [created, ...current]);
    setContactForm({ name: "", email: "" });
    void record("create", "contact", created.id, created.name);
  }

  async function addDossier(event: React.FormEvent) {
    event.preventDefault();
    if (!dossierTitle.trim()) return;
    const { data, error } = await supabase
      .from("crm_dossiers")
      .insert({ ...base, title: dossierTitle.trim() })
      .select("*")
      .single();
    if (error || !data) return showToast("Impossible de créer le dossier.", "error");
    const created = data as CrmDossier;
    setDossiers((current) => [created, ...current]);
    setDossierTitle("");
    void record("create", "dossier", created.id, created.title);
  }

  async function addTask(event: React.FormEvent) {
    event.preventDefault();
    if (!taskForm.title.trim()) return;
    const { data, error } = await supabase
      .from("crm_tasks")
      .insert({ ...base, due_date: taskForm.due || null, title: taskForm.title.trim() })
      .select("*")
      .single();
    if (error || !data) return showToast("Impossible de créer la tâche.", "error");
    const created = data as CrmTask;
    setTasks((current) => [created, ...current]);
    setTaskForm({ title: "", due: "" });
    void record("create", "task", created.id, created.title);
  }

  async function cycleTask(task: CrmTask) {
    const next = taskNext[task.status];
    const { data, error } = await supabase
      .from("crm_tasks")
      .update({ status: next })
      .eq("id", task.id)
      .select("*")
      .single();
    if (!error && data) setTasks((current) => current.map((item) => (item.id === task.id ? (data as CrmTask) : item)));
  }

  async function addNote(event: React.FormEvent) {
    event.preventDefault();
    if (!noteBody.trim()) return;
    const { data, error } = await supabase
      .from("crm_notes")
      .insert({ ...base, author_id: userId, body: noteBody.trim() })
      .select("*")
      .single();
    if (error || !data) return showToast("Impossible d'ajouter la note.", "error");
    const created = data as CrmNote;
    setNotes((current) => [created, ...current]);
    setNoteBody("");
    void record("create", "note", created.id, created.body.slice(0, 40));
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <Link className="text-sm font-semibold text-muted transition hover:text-ink" href="/crm">
        ← {t(locale, "detail.back")}
      </Link>

      <div className="mb-6 mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#002D72]/10 text-base font-semibold text-[#002D72]">
            {client.name.trim()[0]?.toUpperCase() ?? "?"}
          </span>
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold text-ink">{client.name}</h1>
            <p className="text-sm text-muted">
              {client.type === "particulier" ? "Particulier" : "Professionnel"}
              {client.email ? ` · ${client.email}` : ""}
              {client.phone ? ` · ${client.phone}` : ""}
            </p>
          </div>
        </div>
        <Button onClick={() => void archiveClient()} type="button" variant="secondary">
          {t(locale, "detail.archive")}
        </Button>
      </div>

      <section className="mb-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-ink">{t(locale, "detail.billing")}</h2>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-600">
              {invoices.length}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <form action={createInvoiceFromCrmClient.bind(null, client.id, "devis")}>
              <Button type="submit" variant="secondary">
                {t(locale, "detail.createDevis")}
              </Button>
            </form>
            <form action={createInvoiceFromCrmClient.bind(null, client.id, "facture")}>
              <Button type="submit">{t(locale, "detail.createFacture")}</Button>
            </form>
          </div>
        </div>

        {invoices.length > 0 ? (
          <>
            <p className="mb-2 text-sm text-muted">
              {t(locale, "detail.totalBilled")}:{" "}
              <span className="font-semibold tabular-nums text-ink">{formatEur(totalBilled)}</span>
            </p>
            <ul className="divide-y divide-line text-sm">
              {invoices.map((doc) => (
                <li key={doc.id}>
                  <Link
                    className="flex items-center justify-between gap-3 py-2 transition hover:opacity-80"
                    href={`/documentos/${doc.id}`}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="font-medium text-ink">{documentTypeLabels[doc.type]}</span>
                      <span className="truncate text-muted">{doc.numero ?? t(locale, "detail.draftDoc")}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-3">
                      <span className="tabular-nums font-medium text-ink">{formatEur(Number(doc.total_ttc))}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${docStatusClass[doc.status]}`}
                      >
                        {documentStatusLabels[doc.status]}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="py-2 text-sm text-muted">{t(locale, "detail.noInvoices")}</p>
        )}

        {client.type === "professionnel" && !client.client_id ? (
          <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-amber-200">
            {t(locale, "detail.fiscalHint")}
          </p>
        ) : null}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section count={contacts.length} title={t(locale, "detail.contacts")}>
          <form className="mb-3 flex flex-wrap gap-2" onSubmit={(event) => void addContact(event)}>
            <Input aria-label="Nom du contact" className="min-w-[8rem] flex-1" onChange={(event) => setContactForm((current) => ({ ...current, name: event.target.value }))} placeholder="Nom" value={contactForm.name} />
            <Input aria-label="Email du contact" className="min-w-[8rem] flex-1" onChange={(event) => setContactForm((current) => ({ ...current, email: event.target.value }))} placeholder="Email" type="email" value={contactForm.email} />
            <Button disabled={!contactForm.name.trim()} type="submit">{t(locale, "detail.add")}</Button>
          </form>
          <ul className="divide-y divide-line text-sm">
            {contacts.length === 0 ? (
              <li className="py-2 text-muted">{t(locale, "detail.noContacts")}</li>
            ) : (
              contacts.map((contact) => (
                <li className="flex items-center justify-between gap-3 py-2" key={contact.id}>
                  <span className="font-medium text-ink">{contact.name}</span>
                  <span className="truncate text-muted">{contact.email || contact.phone || "—"}</span>
                </li>
              ))
            )}
          </ul>
        </Section>

        <Section count={dossiers.length} title={t(locale, "detail.dossiers")}>
          <form className="mb-3 flex gap-2" onSubmit={(event) => void addDossier(event)}>
            <Input aria-label="Titre du dossier" className="flex-1" onChange={(event) => setDossierTitle(event.target.value)} placeholder="Titre du dossier" value={dossierTitle} />
            <Button disabled={!dossierTitle.trim()} type="submit">{t(locale, "detail.add")}</Button>
          </form>
          <ul className="divide-y divide-line text-sm">
            {dossiers.length === 0 ? (
              <li className="py-2 text-muted">{t(locale, "detail.noDossiers")}</li>
            ) : (
              dossiers.map((dossier) => (
                <li className="flex items-center justify-between gap-3 py-2" key={dossier.id}>
                  <span className="font-medium text-ink">{dossier.title}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">{dossierStatusLabel[dossier.status]}</span>
                </li>
              ))
            )}
          </ul>
        </Section>

        <Section count={tasks.length} title={t(locale, "detail.tasks")}>
          <form className="mb-3 flex flex-wrap gap-2" onSubmit={(event) => void addTask(event)}>
            <Input aria-label="Titre de la tâche" className="min-w-[8rem] flex-1" onChange={(event) => setTaskForm((current) => ({ ...current, title: event.target.value }))} placeholder="Tâche" value={taskForm.title} />
            <Input aria-label="Échéance" className="w-[10rem]" onChange={(event) => setTaskForm((current) => ({ ...current, due: event.target.value }))} type="date" value={taskForm.due} />
            <Button disabled={!taskForm.title.trim()} type="submit">{t(locale, "detail.add")}</Button>
          </form>
          <ul className="divide-y divide-line text-sm">
            {tasks.length === 0 ? (
              <li className="py-2 text-muted">{t(locale, "detail.noTasks")}</li>
            ) : (
              tasks.map((task) => (
                <li className="flex items-center justify-between gap-3 py-2" key={task.id}>
                  <span className={task.status === "done" ? "text-muted line-through" : "font-medium text-ink"}>
                    {task.title}
                    {task.due_date ? <span className="ml-2 text-xs text-muted">· {task.due_date}</span> : null}
                  </span>
                  <button
                    className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-200"
                    onClick={() => void cycleTask(task)}
                    type="button"
                  >
                    {taskStatusLabel[task.status]}
                  </button>
                </li>
              ))
            )}
          </ul>
        </Section>

        <Section count={notes.length} title={t(locale, "detail.notes")}>
          <form className="mb-3 grid gap-2" onSubmit={(event) => void addNote(event)}>
            <Textarea aria-label="Nouvelle note" className="min-h-16" onChange={(event) => setNoteBody(event.target.value)} placeholder="Écrire une note…" value={noteBody} />
            <div className="flex justify-end">
              <Button disabled={!noteBody.trim()} type="submit">{t(locale, "detail.add")}</Button>
            </div>
          </form>
          <ul className="space-y-2 text-sm">
            {notes.length === 0 ? (
              <li className="text-muted">{t(locale, "detail.noNotes")}</li>
            ) : (
              notes.map((note) => (
                <li className="rounded-xl bg-slate-50 px-3 py-2 text-slate-700 ring-1 ring-black/5" key={note.id}>
                  {note.body}
                </li>
              ))
            )}
          </ul>
        </Section>
      </div>

      {activity.length > 0 ? (
        <section className="mt-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
          <h2 className="mb-3 text-sm font-semibold text-ink">{t(locale, "detail.activity")}</h2>
          <ul className="space-y-2 text-sm">
            {activity.map((item) => (
              <li className="flex items-center justify-between gap-3" key={item.id}>
                <span className="truncate text-slate-700">
                  + {entityLabel[item.entity ?? ""] ?? item.entity} ·{" "}
                  {String((item.payload as { label?: string }).label ?? "")}
                </span>
                <span className="shrink-0 text-xs text-muted">
                  {new Date(item.created_at).toLocaleDateString("fr-FR")}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
