"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  documentStatusLabels,
  documentTypeLabels,
  type Client,
  type Document,
  type DocumentStatus,
  type DocumentType
} from "@/lib/types";

type TypeFilter = "todos" | Extract<DocumentType, "devis" | "facture">;
type StatusFilter = "todos" | "a_relancer" | DocumentStatus;

const euroFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "EUR"
});

function clientName(client: Client | undefined) {
  if (!client) {
    return "Cliente não informado";
  }

  return client.type === "professionnel" ? client.raison_sociale : client.nom;
}

function isLateFacture(document: Document) {
  const today = new Date().toISOString().slice(0, 10);
  return (
    document.type === "facture" &&
    document.status === "sent" &&
    Boolean(document.date_echeance) &&
    document.date_echeance! < today
  );
}

export function DocumentosClient({
  clients,
  initialDocuments
}: {
  clients: Client[];
  initialDocuments: Document[];
}) {
  const searchParams = useSearchParams();
  const initialStatus =
    searchParams.get("status") === "a_relancer"
      ? "a_relancer"
      : Object.keys(documentStatusLabels).includes(searchParams.get("status") ?? "")
        ? (searchParams.get("status") as DocumentStatus)
        : "todos";
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("todos");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(initialStatus);
  const [clientFilter, setClientFilter] = useState("todos");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");

  const clientsById = useMemo(
    () => new Map(clients.map((client) => [client.id, client])),
    [clients]
  );

  const filteredDocuments = useMemo(() => {
    return initialDocuments.filter((document) => {
      const matchesType = typeFilter === "todos" || document.type === typeFilter;
      const matchesStatus =
        statusFilter === "todos" ||
        (statusFilter === "a_relancer" ? isLateFacture(document) : document.status === statusFilter);
      const matchesClient = clientFilter === "todos" || document.client_id === clientFilter;
      const date = document.date_emission ?? document.created_at.slice(0, 10);
      const matchesStart = !periodStart || date >= periodStart;
      const matchesEnd = !periodEnd || date <= periodEnd;

      return matchesType && matchesStatus && matchesClient && matchesStart && matchesEnd;
    });
  }, [clientFilter, initialDocuments, periodEnd, periodStart, statusFilter, typeFilter]);

  const columns: DataTableColumn<Document>[] = [
    {
      header: "Documento",
      render: (document) => (
        <div>
          <p className="font-medium">
            {document.numero || `${documentTypeLabels[document.type]} rascunho`}
          </p>
          <p className="mt-1 text-sm text-muted">
            {document.date_emission || "Sem data de emissão"}
          </p>
        </div>
      )
    },
    {
      header: "Cliente",
      render: (document) => clientName(document.client_id ? clientsById.get(document.client_id) : undefined)
    },
    {
      header: "Tipo",
      render: (document) => documentTypeLabels[document.type]
    },
    {
      header: "Status",
      render: (document) => (
        <div className="flex flex-wrap gap-2">
          <Badge tone={document.status === "draft" ? "warning" : "success"}>
            {documentStatusLabels[document.status]}
          </Badge>
          {isLateFacture(document) ? <Badge tone="warning">En retard</Badge> : null}
        </div>
      )
    },
    {
      header: "Total HT",
      render: (document) => euroFormatter.format(document.total_ht)
    },
    {
      header: "Ações",
      render: (document) => (
        <Link
          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-white px-4 text-sm font-semibold text-ink shadow-sm ring-1 ring-black/5 transition hover:bg-slate-50 active:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          href={document.status === "draft" ? `/documentos/${document.id}/editar` : `/documentos/${document.id}`}
        >
          {document.status === "draft" ? "Editar" : "Ver"}
        </Link>
      )
    }
  ];

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-brand">Documentos</p>
          <h1 className="mt-2 text-2xl font-semibold text-ink">Devis e factures</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-white px-4 text-sm font-semibold text-ink shadow-sm ring-1 ring-black/5 transition hover:bg-slate-50 active:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            href="/documentos/novo?type=devis"
          >
            Novo devis
          </Link>
          <Link
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-brand px-4 text-sm font-semibold text-white shadow-sm ring-1 ring-[#002D72]/20 transition hover:bg-[#003a94] active:bg-[#001F4D] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            href="/documentos/novo?type=facture"
          >
            Nova facture
          </Link>
        </div>
      </div>

      <section className="mb-4 grid gap-3 rounded-lg border border-line bg-white p-4 sm:grid-cols-5">
        <label className="text-sm font-medium text-ink">
          Tipo
          <Select
            className="mt-2"
            onChange={(event) => setTypeFilter(event.target.value as TypeFilter)}
            value={typeFilter}
          >
            <option value="todos">Todos</option>
            <option value="devis">Devis</option>
            <option value="facture">Factures</option>
          </Select>
        </label>
        <label className="text-sm font-medium text-ink">
          Status
          <Select
            className="mt-2"
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            value={statusFilter}
          >
            <option value="todos">Todos</option>
            <option value="a_relancer">À relancer</option>
            {Object.entries(documentStatusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </label>
        <label className="text-sm font-medium text-ink">
          Cliente
          <Select
            className="mt-2"
            onChange={(event) => setClientFilter(event.target.value)}
            value={clientFilter}
          >
            <option value="todos">Todos</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {clientName(client)}
              </option>
            ))}
          </Select>
        </label>
        <label className="text-sm font-medium text-ink">
          Início
          <Input
            className="mt-2"
            onChange={(event) => setPeriodStart(event.target.value)}
            type="date"
            value={periodStart}
          />
        </label>
        <label className="text-sm font-medium text-ink">
          Fim
          <Input
            className="mt-2"
            onChange={(event) => setPeriodEnd(event.target.value)}
            type="date"
            value={periodEnd}
          />
        </label>
      </section>

      <DataTable
        columns={columns}
        emptyMessage="Nenhum documento encontrado."
        getRowKey={(document) => document.id}
        rows={filteredDocuments}
      />
    </main>
  );
}
