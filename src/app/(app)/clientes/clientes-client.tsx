"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { FormModal } from "@/components/ui/form-modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import { clientTypeLabels, type Client, type ClientType } from "@/lib/types";
import { clientSchema } from "@/lib/validation";

type ClientFormState = {
  type: ClientType;
  nom: string;
  raison_sociale: string;
  siren: string;
  adresse_rue: string;
  adresse_cp: string;
  adresse_ville: string;
  email: string;
  telephone: string;
  notes: string;
};

const emptyForm: ClientFormState = {
  type: "particulier",
  nom: "",
  raison_sociale: "",
  siren: "",
  adresse_rue: "",
  adresse_cp: "",
  adresse_ville: "",
  email: "",
  telephone: "",
  notes: ""
};

function toFormState(client: Client): ClientFormState {
  return {
    type: client.type,
    nom: client.nom ?? "",
    raison_sociale: client.raison_sociale ?? "",
    siren: client.siren ?? "",
    adresse_rue: client.adresse_rue ?? "",
    adresse_cp: client.adresse_cp ?? "",
    adresse_ville: client.adresse_ville ?? "",
    email: client.email ?? "",
    telephone: client.telephone ?? "",
    notes: client.notes ?? ""
  };
}

function displayClientName(client: Client) {
  return client.type === "professionnel" ? client.raison_sociale : client.nom;
}

export function ClientesClient({
  initialClients,
  userId
}: {
  initialClients: Client[];
  userId: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const { showToast } = useToast();
  const [clients, setClients] = useState(initialClients);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"todos" | ClientType>("todos");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [form, setForm] = useState<ClientFormState>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  const filteredClients = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return clients.filter((client) => {
      const name = displayClientName(client)?.toLowerCase() ?? "";
      const matchesSearch = normalizedSearch === "" || name.includes(normalizedSearch);
      const matchesType = typeFilter === "todos" || client.type === typeFilter;

      return matchesSearch && matchesType;
    });
  }, [clients, search, typeFilter]);

  function openCreateModal() {
    setEditingClient(null);
    setForm(emptyForm);
    setErrors({});
    setIsModalOpen(true);
  }

  function openEditModal(client: Client) {
    setEditingClient(client);
    setForm(toFormState(client));
    setErrors({});
    setIsModalOpen(true);
  }

  async function refreshClients() {
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      showToast("Não foi possível atualizar a lista de clientes.", "error");
      return;
    }

    setClients((data ?? []) as Client[]);
  }

  async function saveClient() {
    const parsed = clientSchema.safeParse(form);

    if (!parsed.success) {
      const nextErrors: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        const key = issue.path[0]?.toString() ?? "form";
        nextErrors[key] = issue.message;
      });
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setIsSaving(true);

    const payload = {
      ...parsed.data,
      user_id: userId
    };

    const request = editingClient
      ? supabase.from("clients").update(payload).eq("id", editingClient.id)
      : supabase.from("clients").insert(payload);

    const { error } = await request;
    setIsSaving(false);

    if (error) {
      showToast("Não foi possível salvar o cliente.", "error");
      return;
    }

    showToast(editingClient ? "Cliente atualizado." : "Cliente criado.", "success");
    setIsModalOpen(false);
    await refreshClients();
  }

  async function archiveClient(client: Client) {
    const { error } = await supabase.from("clients").update({ archived: true }).eq("id", client.id);

    if (error) {
      showToast("Não foi possível arquivar o cliente.", "error");
      return;
    }

    showToast("Cliente arquivado.", "success");
    await refreshClients();
  }

  const columns: DataTableColumn<Client>[] = [
    {
      header: "Cliente",
      render: (client) => (
        <div>
          <p className="font-medium">{displayClientName(client)}</p>
          {client.email ? <p className="mt-1 text-sm text-muted">{client.email}</p> : null}
        </div>
      )
    },
    {
      header: "Tipo",
      render: (client) => clientTypeLabels[client.type]
    },
    {
      header: "Endereço",
      render: (client) =>
        [client.adresse_rue, client.adresse_cp, client.adresse_ville].filter(Boolean).join(", ") ||
        "Não informado"
    },
    {
      header: "Status",
      render: (client) =>
        client.archived ? <Badge tone="warning">Arquivado</Badge> : <Badge tone="success">Ativo</Badge>
    },
    {
      header: "Ações",
      render: (client) => (
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => openEditModal(client)} type="button" variant="secondary">
            Editar
          </Button>
          {!client.archived ? (
            <Button onClick={() => void archiveClient(client)} type="button" variant="secondary">
              Arquivar
            </Button>
          ) : null}
        </div>
      )
    }
  ];

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-brand">Clientes</p>
          <h1 className="mt-2 text-2xl font-semibold text-ink">Cadastro de clientes</h1>
        </div>
        <Button onClick={openCreateModal} type="button">
          Novo cliente
        </Button>
      </div>

      <section className="mb-4 grid gap-3 rounded-lg border border-line bg-white p-4 sm:grid-cols-[1fr_220px]">
        <label className="text-sm font-medium text-ink">
          Buscar por nome
          <Input
            className="mt-2"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Nome ou razão social"
            value={search}
          />
        </label>
        <label className="text-sm font-medium text-ink">
          Tipo
          <Select
            className="mt-2"
            onChange={(event) => setTypeFilter(event.target.value as "todos" | ClientType)}
            value={typeFilter}
          >
            <option value="todos">Todos</option>
            <option value="particulier">Particular</option>
            <option value="professionnel">Profissional</option>
          </Select>
        </label>
      </section>

      <DataTable
        columns={columns}
        emptyMessage="Nenhum cliente encontrado."
        getRowKey={(client) => client.id}
        rows={filteredClients}
      />

      <FormModal
        description="Os campos seguem as mesmas regras do banco de dados."
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingClient ? "Editar cliente" : "Novo cliente"}
      >
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            void saveClient();
          }}
        >
          <label className="text-sm font-medium text-ink">
            Tipo
            <Select
              className="mt-2"
              onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as ClientType }))}
              value={form.type}
            >
              <option value="particulier">Particular</option>
              <option value="professionnel">Profissional</option>
            </Select>
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <FieldError error={errors.nom}>
              <label className="text-sm font-medium text-ink">
                Nome
                <Input
                  className="mt-2"
                  onChange={(event) => setForm((current) => ({ ...current, nom: event.target.value }))}
                  value={form.nom}
                />
              </label>
            </FieldError>
            <FieldError error={errors.raison_sociale}>
              <label className="text-sm font-medium text-ink">
                Razão social
                <Input
                  className="mt-2"
                  onChange={(event) =>
                    setForm((current) => ({ ...current, raison_sociale: event.target.value }))
                  }
                  value={form.raison_sociale}
                />
              </label>
            </FieldError>
          </div>
          <FieldError error={errors.siren}>
            <label className="text-sm font-medium text-ink">
              SIREN
              <Input
                className="mt-2"
                maxLength={9}
                onChange={(event) => setForm((current) => ({ ...current, siren: event.target.value }))}
                placeholder="9 dígitos"
                value={form.siren}
              />
            </label>
          </FieldError>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="text-sm font-medium text-ink sm:col-span-3">
              Rua
              <Input
                className="mt-2"
                onChange={(event) => setForm((current) => ({ ...current, adresse_rue: event.target.value }))}
                value={form.adresse_rue}
              />
            </label>
            <label className="text-sm font-medium text-ink">
              Código postal
              <Input
                className="mt-2"
                onChange={(event) => setForm((current) => ({ ...current, adresse_cp: event.target.value }))}
                value={form.adresse_cp}
              />
            </label>
            <label className="text-sm font-medium text-ink sm:col-span-2">
              Cidade
              <Input
                className="mt-2"
                onChange={(event) => setForm((current) => ({ ...current, adresse_ville: event.target.value }))}
                value={form.adresse_ville}
              />
            </label>
          </div>
          <FieldError error={errors.email}>
            <label className="text-sm font-medium text-ink">
              Email
              <Input
                className="mt-2"
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                type="email"
                value={form.email}
              />
            </label>
          </FieldError>
          <label className="text-sm font-medium text-ink">
            Telefone
            <Input
              className="mt-2"
              onChange={(event) => setForm((current) => ({ ...current, telephone: event.target.value }))}
              value={form.telephone}
            />
          </label>
          <label className="text-sm font-medium text-ink">
            Notas
            <Textarea
              className="mt-2"
              onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
              value={form.notes}
            />
          </label>
          <div className="flex justify-end gap-2">
            <Button onClick={() => setIsModalOpen(false)} type="button" variant="secondary">
              Cancelar
            </Button>
            <Button disabled={isSaving} type="submit">
              {isSaving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </FormModal>
    </main>
  );
}

function FieldError({ children, error }: { children: React.ReactNode; error?: string }) {
  return (
    <div>
      {children}
      {error ? <p className="mt-1 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
