"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import type {
  CrmClient,
  CrmContact,
  CrmDossier,
  CrmNote,
  CrmTask,
  CrmTaskStatus
} from "@/lib/crm/types";

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
  initialContacts,
  initialDossiers,
  initialNotes,
  initialTasks,
  userId
}: {
  client: CrmClient;
  initialContacts: CrmContact[];
  initialDossiers: CrmDossier[];
  initialNotes: CrmNote[];
  initialTasks: CrmTask[];
  userId: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const { showToast } = useToast();
  const [contacts, setContacts] = useState(initialContacts);
  const [dossiers, setDossiers] = useState(initialDossiers);
  const [notes, setNotes] = useState(initialNotes);
  const [tasks, setTasks] = useState(initialTasks);
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
    setContacts((current) => [data as CrmContact, ...current]);
    setContactForm({ name: "", email: "" });
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
    setDossiers((current) => [data as CrmDossier, ...current]);
    setDossierTitle("");
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
    setTasks((current) => [data as CrmTask, ...current]);
    setTaskForm({ title: "", due: "" });
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
    setNotes((current) => [data as CrmNote, ...current]);
    setNoteBody("");
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <Link className="text-sm font-semibold text-muted transition hover:text-ink" href="/crm">
        ← Clients
      </Link>

      <div className="mb-6 mt-3 flex items-center gap-3">
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

      <div className="grid gap-4 lg:grid-cols-2">
        <Section count={contacts.length} title="Contacts">
          <form className="mb-3 flex flex-wrap gap-2" onSubmit={(event) => void addContact(event)}>
            <Input aria-label="Nom du contact" className="min-w-[8rem] flex-1" onChange={(event) => setContactForm((current) => ({ ...current, name: event.target.value }))} placeholder="Nom" value={contactForm.name} />
            <Input aria-label="Email du contact" className="min-w-[8rem] flex-1" onChange={(event) => setContactForm((current) => ({ ...current, email: event.target.value }))} placeholder="Email" type="email" value={contactForm.email} />
            <Button disabled={!contactForm.name.trim()} type="submit">Ajouter</Button>
          </form>
          <ul className="divide-y divide-line text-sm">
            {contacts.length === 0 ? (
              <li className="py-2 text-muted">Aucun contact.</li>
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

        <Section count={dossiers.length} title="Dossiers">
          <form className="mb-3 flex gap-2" onSubmit={(event) => void addDossier(event)}>
            <Input aria-label="Titre du dossier" className="flex-1" onChange={(event) => setDossierTitle(event.target.value)} placeholder="Titre du dossier" value={dossierTitle} />
            <Button disabled={!dossierTitle.trim()} type="submit">Ajouter</Button>
          </form>
          <ul className="divide-y divide-line text-sm">
            {dossiers.length === 0 ? (
              <li className="py-2 text-muted">Aucun dossier.</li>
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

        <Section count={tasks.length} title="Tâches">
          <form className="mb-3 flex flex-wrap gap-2" onSubmit={(event) => void addTask(event)}>
            <Input aria-label="Titre de la tâche" className="min-w-[8rem] flex-1" onChange={(event) => setTaskForm((current) => ({ ...current, title: event.target.value }))} placeholder="Tâche" value={taskForm.title} />
            <Input aria-label="Échéance" className="w-[10rem]" onChange={(event) => setTaskForm((current) => ({ ...current, due: event.target.value }))} type="date" value={taskForm.due} />
            <Button disabled={!taskForm.title.trim()} type="submit">Ajouter</Button>
          </form>
          <ul className="divide-y divide-line text-sm">
            {tasks.length === 0 ? (
              <li className="py-2 text-muted">Aucune tâche.</li>
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

        <Section count={notes.length} title="Notes">
          <form className="mb-3 grid gap-2" onSubmit={(event) => void addNote(event)}>
            <Textarea aria-label="Nouvelle note" className="min-h-16" onChange={(event) => setNoteBody(event.target.value)} placeholder="Écrire une note…" value={noteBody} />
            <div className="flex justify-end">
              <Button disabled={!noteBody.trim()} type="submit">Ajouter</Button>
            </div>
          </form>
          <ul className="space-y-2 text-sm">
            {notes.length === 0 ? (
              <li className="text-muted">Aucune note.</li>
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
    </main>
  );
}
