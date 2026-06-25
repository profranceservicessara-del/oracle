"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FormModal } from "@/components/ui/form-modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { logActivity } from "@/lib/crm/activity";
import { t, type Locale } from "@/lib/i18n/dictionaries";
import { createClient } from "@/lib/supabase/client";
import { documentStatusLabels, documentTypeLabels, type Document, type DocumentStatus } from "@/lib/types";
import type {
  CrmActivityLog,
  CrmClient,
  CrmClientType,
  CrmContact,
  CrmDocument,
  CrmDossier,
  CrmDossierStatus,
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
  task: "Tâche",
  document: "Document"
};

const actionSymbol: Record<string, string> = { create: "+", update: "✎", delete: "✕" };

const taskStatusLabel: Record<CrmTaskStatus, string> = { todo: "À faire", doing: "En cours", done: "Terminé" };
const taskNext: Record<CrmTaskStatus, CrmTaskStatus> = { todo: "doing", doing: "done", done: "todo" };
const dossierStatusLabel: Record<CrmDossierStatus, string> = {
  open: "Ouvert",
  in_progress: "En cours",
  closed: "Fermé"
};
const dossierNext: Record<CrmDossierStatus, CrmDossierStatus> = {
  open: "in_progress",
  in_progress: "closed",
  closed: "open"
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

function RowActions({ editLabel, deleteLabel, onEdit, onDelete }: { editLabel: string; deleteLabel: string; onEdit: () => void; onDelete: () => void }) {
  return (
    <span className="flex shrink-0 items-center gap-1">
      <button aria-label={editLabel} className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-ink" onClick={onEdit} title={editLabel} type="button">
        <svg fill="none" height="15" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" width="15">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
        </svg>
      </button>
      <button aria-label={deleteLabel} className="rounded-lg p-1 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600" onClick={onDelete} title={deleteLabel} type="button">
        <svg fill="none" height="15" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" width="15">
          <path d="M3 6h18" />
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
      </button>
    </span>
  );
}

export function CrmClientDetail({
  client,
  initialActivity,
  initialDocuments,
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
  initialDocuments: CrmDocument[];
  initialInvoices: Document[];
  initialContacts: CrmContact[];
  initialDossiers: CrmDossier[];
  initialNotes: CrmNote[];
  initialTasks: CrmTask[];
  locale: Locale;
  userId: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const { showToast } = useToast();
  const [clientState, setClientState] = useState(client);
  const [contacts, setContacts] = useState(initialContacts);
  const [dossiers, setDossiers] = useState(initialDossiers);
  const [notes, setNotes] = useState(initialNotes);
  const [tasks, setTasks] = useState(initialTasks);
  const [documents, setDocuments] = useState(initialDocuments);
  const [activity, setActivity] = useState(initialActivity);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const invoices = initialInvoices;
  const formatEur = (value: number) =>
    new Intl.NumberFormat(locale === "pt" ? "pt-BR" : "fr-FR", { style: "currency", currency: "EUR" }).format(value);
  const totalBilled = invoices.filter((doc) => doc.type === "facture").reduce((sum, doc) => sum + Number(doc.total_ttc), 0);

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

  // ---- Client header: edit + archive -------------------------------------
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [clientForm, setClientForm] = useState({
    name: clientState.name,
    type: clientState.type,
    email: clientState.email ?? "",
    phone: clientState.phone ?? ""
  });

  function openClientModal() {
    setClientForm({ name: clientState.name, type: clientState.type, email: clientState.email ?? "", phone: clientState.phone ?? "" });
    setIsClientModalOpen(true);
  }

  async function saveClient(event: React.FormEvent) {
    event.preventDefault();
    if (!clientForm.name.trim()) return;
    const { data, error } = await supabase
      .from("crm_clients")
      .update({
        name: clientForm.name.trim(),
        type: clientForm.type,
        email: clientForm.email.trim() || null,
        phone: clientForm.phone.trim() || null
      })
      .eq("id", client.id)
      .select("*")
      .single();
    if (error || !data) return showToast(t(locale, "detail.saveError"), "error");
    setClientState(data as CrmClient);
    setIsClientModalOpen(false);
    showToast(t(locale, "detail.saved"), "success");
    void record("update", "client", client.id, (data as CrmClient).name);
  }

  async function archiveClient() {
    const { error } = await supabase.from("crm_clients").update({ archived: true }).eq("id", client.id);
    if (error) return showToast(t(locale, "detail.archiveError"), "error");
    showToast(t(locale, "detail.archived"), "success");
    router.push("/crm");
    router.refresh();
  }

  // ---- Add forms ----------------------------------------------------------
  const [contactForm, setContactForm] = useState({ name: "", email: "" });
  const [dossierTitle, setDossierTitle] = useState("");
  const [taskForm, setTaskForm] = useState({ title: "", due: "" });
  const [noteBody, setNoteBody] = useState("");

  // ---- Inline edit state --------------------------------------------------
  const [editContactId, setEditContactId] = useState<string | null>(null);
  const [editContact, setEditContact] = useState({ name: "", email: "" });
  const [editDossierId, setEditDossierId] = useState<string | null>(null);
  const [editDossierTitle, setEditDossierTitle] = useState("");
  const [editTaskId, setEditTaskId] = useState<string | null>(null);
  const [editTask, setEditTask] = useState({ title: "", due: "" });
  const [editNoteId, setEditNoteId] = useState<string | null>(null);
  const [editNoteBody, setEditNoteBody] = useState("");

  const base = { client_id: client.id, company_id: client.company_id };

  function confirmDelete() {
    return typeof window === "undefined" ? true : window.confirm(t(locale, "detail.deleteConfirm"));
  }

  // ---- Contacts -----------------------------------------------------------
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

  async function saveContact(id: string) {
    if (!editContact.name.trim()) return;
    const { data, error } = await supabase
      .from("crm_contacts")
      .update({ name: editContact.name.trim(), email: editContact.email.trim() || null })
      .eq("id", id)
      .select("*")
      .single();
    if (error || !data) return showToast(t(locale, "detail.saveError"), "error");
    setContacts((current) => current.map((c) => (c.id === id ? (data as CrmContact) : c)));
    setEditContactId(null);
    void record("update", "contact", id, (data as CrmContact).name);
  }

  async function deleteContact(contact: CrmContact) {
    if (!confirmDelete()) return;
    const { error } = await supabase.from("crm_contacts").delete().eq("id", contact.id);
    if (error) return showToast(t(locale, "detail.deleteError"), "error");
    setContacts((current) => current.filter((c) => c.id !== contact.id));
    void record("delete", "contact", contact.id, contact.name);
  }

  // ---- Dossiers -----------------------------------------------------------
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

  async function saveDossier(id: string) {
    if (!editDossierTitle.trim()) return;
    const { data, error } = await supabase
      .from("crm_dossiers")
      .update({ title: editDossierTitle.trim() })
      .eq("id", id)
      .select("*")
      .single();
    if (error || !data) return showToast(t(locale, "detail.saveError"), "error");
    setDossiers((current) => current.map((d) => (d.id === id ? (data as CrmDossier) : d)));
    setEditDossierId(null);
    void record("update", "dossier", id, (data as CrmDossier).title);
  }

  async function cycleDossier(dossier: CrmDossier) {
    const next = dossierNext[dossier.status];
    const { data, error } = await supabase.from("crm_dossiers").update({ status: next }).eq("id", dossier.id).select("*").single();
    if (!error && data) setDossiers((current) => current.map((d) => (d.id === dossier.id ? (data as CrmDossier) : d)));
  }

  async function deleteDossier(dossier: CrmDossier) {
    if (!confirmDelete()) return;
    const { error } = await supabase.from("crm_dossiers").delete().eq("id", dossier.id);
    if (error) return showToast(t(locale, "detail.deleteError"), "error");
    setDossiers((current) => current.filter((d) => d.id !== dossier.id));
    void record("delete", "dossier", dossier.id, dossier.title);
  }

  // ---- Tasks --------------------------------------------------------------
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

  async function saveTask(id: string) {
    if (!editTask.title.trim()) return;
    const { data, error } = await supabase
      .from("crm_tasks")
      .update({ title: editTask.title.trim(), due_date: editTask.due || null })
      .eq("id", id)
      .select("*")
      .single();
    if (error || !data) return showToast(t(locale, "detail.saveError"), "error");
    setTasks((current) => current.map((task) => (task.id === id ? (data as CrmTask) : task)));
    setEditTaskId(null);
    void record("update", "task", id, (data as CrmTask).title);
  }

  async function cycleTask(task: CrmTask) {
    const next = taskNext[task.status];
    const { data, error } = await supabase.from("crm_tasks").update({ status: next }).eq("id", task.id).select("*").single();
    if (!error && data) setTasks((current) => current.map((item) => (item.id === task.id ? (data as CrmTask) : item)));
  }

  async function deleteTask(task: CrmTask) {
    if (!confirmDelete()) return;
    const { error } = await supabase.from("crm_tasks").delete().eq("id", task.id);
    if (error) return showToast(t(locale, "detail.deleteError"), "error");
    setTasks((current) => current.filter((item) => item.id !== task.id));
    void record("delete", "task", task.id, task.title);
  }

  // ---- Notes --------------------------------------------------------------
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

  async function saveNote(id: string) {
    if (!editNoteBody.trim()) return;
    const { data, error } = await supabase
      .from("crm_notes")
      .update({ body: editNoteBody.trim() })
      .eq("id", id)
      .select("*")
      .single();
    if (error || !data) return showToast(t(locale, "detail.saveError"), "error");
    setNotes((current) => current.map((note) => (note.id === id ? (data as CrmNote) : note)));
    setEditNoteId(null);
    void record("update", "note", id, (data as CrmNote).body.slice(0, 40));
  }

  async function deleteNote(note: CrmNote) {
    if (!confirmDelete()) return;
    const { error } = await supabase.from("crm_notes").delete().eq("id", note.id);
    if (error) return showToast(t(locale, "detail.deleteError"), "error");
    setNotes((current) => current.filter((n) => n.id !== note.id));
    void record("delete", "note", note.id, note.body.slice(0, 40));
  }

  // ---- Documents (Supabase Storage) --------------------------------------
  async function uploadDocument(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploading(true);
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${client.company_id}/${client.id}/${crypto.randomUUID()}-${safe}`;
    const { error: uploadError } = await supabase.storage
      .from("crm-documents")
      .upload(path, file, { contentType: file.type || undefined, upsert: false });
    if (uploadError) {
      setUploading(false);
      return showToast(t(locale, "detail.uploadError"), "error");
    }
    const { data, error } = await supabase
      .from("crm_documents")
      .insert({ ...base, name: file.name, storage_path: path, mime_type: file.type || null })
      .select("*")
      .single();
    setUploading(false);
    if (error || !data) {
      await supabase.storage.from("crm-documents").remove([path]);
      return showToast(t(locale, "detail.uploadError"), "error");
    }
    const created = data as CrmDocument;
    setDocuments((current) => [created, ...current]);
    void record("create", "document", created.id, created.name);
  }

  async function downloadDocument(doc: CrmDocument) {
    if (!doc.storage_path) return;
    const { data, error } = await supabase.storage.from("crm-documents").createSignedUrl(doc.storage_path, 120);
    if (error || !data) return showToast(t(locale, "detail.uploadError"), "error");
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function deleteDocument(doc: CrmDocument) {
    if (!confirmDelete()) return;
    if (doc.storage_path) {
      await supabase.storage.from("crm-documents").remove([doc.storage_path]);
    }
    const { error } = await supabase.from("crm_documents").delete().eq("id", doc.id);
    if (error) return showToast(t(locale, "detail.deleteError"), "error");
    setDocuments((current) => current.filter((d) => d.id !== doc.id));
    void record("delete", "document", doc.id, doc.name);
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <Link className="text-sm font-semibold text-muted transition hover:text-ink" href="/crm">
        ← {t(locale, "detail.back")}
      </Link>

      <div className="mb-6 mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#002D72]/10 text-base font-semibold text-[#002D72]">
            {clientState.name.trim()[0]?.toUpperCase() ?? "?"}
          </span>
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold text-ink">{clientState.name}</h1>
            <p className="text-sm text-muted">
              {clientState.type === "particulier" ? "Particulier" : "Professionnel"}
              {clientState.email ? ` · ${clientState.email}` : ""}
              {clientState.phone ? ` · ${clientState.phone}` : ""}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={openClientModal} type="button" variant="secondary">
            {t(locale, "detail.edit")}
          </Button>
          <Button onClick={() => void archiveClient()} type="button" variant="secondary">
            {t(locale, "detail.archive")}
          </Button>
        </div>
      </div>

      <section className="mb-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-ink">{t(locale, "detail.billing")}</h2>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-600">{invoices.length}</span>
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
              {t(locale, "detail.totalBilled")}: <span className="font-semibold tabular-nums text-ink">{formatEur(totalBilled)}</span>
            </p>
            <ul className="divide-y divide-line text-sm">
              {invoices.map((doc) => (
                <li key={doc.id}>
                  <Link className="flex items-center justify-between gap-3 py-2 transition hover:opacity-80" href={`/documentos/${doc.id}`}>
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="font-medium text-ink">{documentTypeLabels[doc.type]}</span>
                      <span className="truncate text-muted">{doc.numero ?? t(locale, "detail.draftDoc")}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-3">
                      <span className="tabular-nums font-medium text-ink">{formatEur(Number(doc.total_ttc))}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${docStatusClass[doc.status]}`}>{documentStatusLabels[doc.status]}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="py-2 text-sm text-muted">{t(locale, "detail.noInvoices")}</p>
        )}

        {clientState.type === "professionnel" && !clientState.client_id ? (
          <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-amber-200">{t(locale, "detail.fiscalHint")}</p>
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
              contacts.map((contact) =>
                editContactId === contact.id ? (
                  <li className="flex flex-wrap items-center gap-2 py-2" key={contact.id}>
                    <Input aria-label={t(locale, "detail.contactName")} className="min-w-[7rem] flex-1" onChange={(event) => setEditContact((c) => ({ ...c, name: event.target.value }))} value={editContact.name} />
                    <Input aria-label="Email" className="min-w-[7rem] flex-1" onChange={(event) => setEditContact((c) => ({ ...c, email: event.target.value }))} type="email" value={editContact.email} />
                    <Button disabled={!editContact.name.trim()} onClick={() => void saveContact(contact.id)} type="button">{t(locale, "detail.save")}</Button>
                    <Button onClick={() => setEditContactId(null)} type="button" variant="secondary">{t(locale, "detail.cancel")}</Button>
                  </li>
                ) : (
                  <li className="flex items-center justify-between gap-3 py-2" key={contact.id}>
                    <span className="min-w-0">
                      <span className="font-medium text-ink">{contact.name}</span>
                      {contact.email || contact.phone ? <span className="ml-2 truncate text-muted">{contact.email || contact.phone}</span> : null}
                    </span>
                    <RowActions deleteLabel={t(locale, "detail.delete")} editLabel={t(locale, "detail.edit")} onDelete={() => void deleteContact(contact)} onEdit={() => { setEditContactId(contact.id); setEditContact({ name: contact.name, email: contact.email ?? "" }); }} />
                  </li>
                )
              )
            )}
          </ul>
        </Section>

        <Section count={dossiers.length} title={t(locale, "detail.dossiers")}>
          <form className="mb-3 flex gap-2" onSubmit={(event) => void addDossier(event)}>
            <Input aria-label="Titre du dossier" className="flex-1" onChange={(event) => setDossierTitle(event.target.value)} placeholder={t(locale, "detail.dossierTitle")} value={dossierTitle} />
            <Button disabled={!dossierTitle.trim()} type="submit">{t(locale, "detail.add")}</Button>
          </form>
          <ul className="divide-y divide-line text-sm">
            {dossiers.length === 0 ? (
              <li className="py-2 text-muted">{t(locale, "detail.noDossiers")}</li>
            ) : (
              dossiers.map((dossier) =>
                editDossierId === dossier.id ? (
                  <li className="flex flex-wrap items-center gap-2 py-2" key={dossier.id}>
                    <Input aria-label={t(locale, "detail.dossierTitle")} className="flex-1" onChange={(event) => setEditDossierTitle(event.target.value)} value={editDossierTitle} />
                    <Button disabled={!editDossierTitle.trim()} onClick={() => void saveDossier(dossier.id)} type="button">{t(locale, "detail.save")}</Button>
                    <Button onClick={() => setEditDossierId(null)} type="button" variant="secondary">{t(locale, "detail.cancel")}</Button>
                  </li>
                ) : (
                  <li className="flex items-center justify-between gap-3 py-2" key={dossier.id}>
                    <span className="min-w-0 truncate font-medium text-ink">{dossier.title}</span>
                    <span className="flex shrink-0 items-center gap-2">
                      <button className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-200" onClick={() => void cycleDossier(dossier)} type="button">
                        {dossierStatusLabel[dossier.status]}
                      </button>
                      <RowActions deleteLabel={t(locale, "detail.delete")} editLabel={t(locale, "detail.edit")} onDelete={() => void deleteDossier(dossier)} onEdit={() => { setEditDossierId(dossier.id); setEditDossierTitle(dossier.title); }} />
                    </span>
                  </li>
                )
              )
            )}
          </ul>
        </Section>

        <Section count={tasks.length} title={t(locale, "detail.tasks")}>
          <form className="mb-3 flex flex-wrap gap-2" onSubmit={(event) => void addTask(event)}>
            <Input aria-label="Titre de la tâche" className="min-w-[8rem] flex-1" onChange={(event) => setTaskForm((current) => ({ ...current, title: event.target.value }))} placeholder={t(locale, "detail.taskTitle")} value={taskForm.title} />
            <Input aria-label="Échéance" className="w-[10rem]" onChange={(event) => setTaskForm((current) => ({ ...current, due: event.target.value }))} type="date" value={taskForm.due} />
            <Button disabled={!taskForm.title.trim()} type="submit">{t(locale, "detail.add")}</Button>
          </form>
          <ul className="divide-y divide-line text-sm">
            {tasks.length === 0 ? (
              <li className="py-2 text-muted">{t(locale, "detail.noTasks")}</li>
            ) : (
              tasks.map((task) =>
                editTaskId === task.id ? (
                  <li className="flex flex-wrap items-center gap-2 py-2" key={task.id}>
                    <Input aria-label={t(locale, "detail.taskTitle")} className="min-w-[7rem] flex-1" onChange={(event) => setEditTask((tk) => ({ ...tk, title: event.target.value }))} value={editTask.title} />
                    <Input aria-label="Échéance" className="w-[9rem]" onChange={(event) => setEditTask((tk) => ({ ...tk, due: event.target.value }))} type="date" value={editTask.due} />
                    <Button disabled={!editTask.title.trim()} onClick={() => void saveTask(task.id)} type="button">{t(locale, "detail.save")}</Button>
                    <Button onClick={() => setEditTaskId(null)} type="button" variant="secondary">{t(locale, "detail.cancel")}</Button>
                  </li>
                ) : (
                  <li className="flex items-center justify-between gap-3 py-2" key={task.id}>
                    <span className={task.status === "done" ? "text-muted line-through" : "font-medium text-ink"}>
                      {task.title}
                      {task.due_date ? <span className="ml-2 text-xs text-muted">· {task.due_date}</span> : null}
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <button className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-200" onClick={() => void cycleTask(task)} type="button">
                        {taskStatusLabel[task.status]}
                      </button>
                      <RowActions deleteLabel={t(locale, "detail.delete")} editLabel={t(locale, "detail.edit")} onDelete={() => void deleteTask(task)} onEdit={() => { setEditTaskId(task.id); setEditTask({ title: task.title, due: task.due_date ?? "" }); }} />
                    </span>
                  </li>
                )
              )
            )}
          </ul>
        </Section>

        <Section count={notes.length} title={t(locale, "detail.notes")}>
          <form className="mb-3 grid gap-2" onSubmit={(event) => void addNote(event)}>
            <Textarea aria-label="Nouvelle note" className="min-h-16" onChange={(event) => setNoteBody(event.target.value)} placeholder={t(locale, "detail.notePlaceholder")} value={noteBody} />
            <div className="flex justify-end">
              <Button disabled={!noteBody.trim()} type="submit">{t(locale, "detail.add")}</Button>
            </div>
          </form>
          <ul className="space-y-2 text-sm">
            {notes.length === 0 ? (
              <li className="text-muted">{t(locale, "detail.noNotes")}</li>
            ) : (
              notes.map((note) =>
                editNoteId === note.id ? (
                  <li className="grid gap-2" key={note.id}>
                    <Textarea aria-label={t(locale, "detail.notePlaceholder")} className="min-h-16" onChange={(event) => setEditNoteBody(event.target.value)} value={editNoteBody} />
                    <div className="flex justify-end gap-2">
                      <Button onClick={() => setEditNoteId(null)} type="button" variant="secondary">{t(locale, "detail.cancel")}</Button>
                      <Button disabled={!editNoteBody.trim()} onClick={() => void saveNote(note.id)} type="button">{t(locale, "detail.save")}</Button>
                    </div>
                  </li>
                ) : (
                  <li className="flex items-start justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2 text-slate-700 ring-1 ring-black/5" key={note.id}>
                    <span className="min-w-0 whitespace-pre-wrap">{note.body}</span>
                    <RowActions deleteLabel={t(locale, "detail.delete")} editLabel={t(locale, "detail.edit")} onDelete={() => void deleteNote(note)} onEdit={() => { setEditNoteId(note.id); setEditNoteBody(note.body); }} />
                  </li>
                )
              )
            )}
          </ul>
        </Section>

        <Section count={documents.length} title={t(locale, "detail.documents")}>
          <div className="mb-3">
            <input className="hidden" onChange={(event) => void uploadDocument(event)} ref={fileRef} type="file" />
            <Button disabled={uploading} onClick={() => fileRef.current?.click()} type="button">
              {uploading ? t(locale, "detail.uploading") : t(locale, "detail.upload")}
            </Button>
          </div>
          <ul className="divide-y divide-line text-sm">
            {documents.length === 0 ? (
              <li className="py-2 text-muted">{t(locale, "detail.noDocuments")}</li>
            ) : (
              documents.map((doc) => (
                <li className="flex items-center justify-between gap-3 py-2" key={doc.id}>
                  <button
                    className="flex min-w-0 items-center gap-2 truncate text-left font-medium text-[#002D72] transition hover:underline"
                    onClick={() => void downloadDocument(doc)}
                    title={t(locale, "detail.download")}
                    type="button"
                  >
                    <svg className="shrink-0" fill="none" height="15" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" viewBox="0 0 24 24" width="15">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <path d="M14 2v6h6" />
                    </svg>
                    <span className="truncate">{doc.name}</span>
                  </button>
                  <button
                    aria-label={t(locale, "detail.delete")}
                    className="shrink-0 rounded-lg p-1 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                    onClick={() => void deleteDocument(doc)}
                    title={t(locale, "detail.delete")}
                    type="button"
                  >
                    <svg fill="none" height="15" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" width="15">
                      <path d="M3 6h18" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
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
                  {actionSymbol[item.action] ?? "•"} {entityLabel[item.entity ?? ""] ?? item.entity} ·{" "}
                  {String((item.payload as { label?: string }).label ?? "")}
                </span>
                <span className="shrink-0 text-xs text-muted">{new Date(item.created_at).toLocaleDateString("fr-FR")}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <FormModal description={t(locale, "crm.modalDesc")} isOpen={isClientModalOpen} onClose={() => setIsClientModalOpen(false)} title={t(locale, "detail.editClient")}>
        <form className="grid gap-4" onSubmit={(event) => void saveClient(event)}>
          <label className="text-sm font-medium text-ink">
            {t(locale, "crm.name")}
            <Input className="mt-2" onChange={(event) => setClientForm((current) => ({ ...current, name: event.target.value }))} required value={clientForm.name} />
          </label>
          <label className="text-sm font-medium text-ink">
            {t(locale, "crm.type")}
            <Select className="mt-2" onChange={(event) => setClientForm((current) => ({ ...current, type: event.target.value as CrmClientType }))} value={clientForm.type}>
              <option value="professionnel">{t(locale, "crm.professional")}</option>
              <option value="particulier">{t(locale, "crm.particular")}</option>
            </Select>
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-ink">
              {t(locale, "crm.email")}
              <Input className="mt-2" onChange={(event) => setClientForm((current) => ({ ...current, email: event.target.value }))} type="email" value={clientForm.email} />
            </label>
            <label className="text-sm font-medium text-ink">
              {t(locale, "crm.phone")}
              <Input className="mt-2" onChange={(event) => setClientForm((current) => ({ ...current, phone: event.target.value }))} value={clientForm.phone} />
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <Button onClick={() => setIsClientModalOpen(false)} type="button" variant="secondary">{t(locale, "detail.cancel")}</Button>
            <Button disabled={!clientForm.name.trim()} type="submit">{t(locale, "detail.save")}</Button>
          </div>
        </form>
      </FormModal>
    </main>
  );
}
