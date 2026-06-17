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
import { catalogItemSchema } from "@/lib/validation";
import { categoryLabels, type ActivityCategory, type CatalogItem } from "@/lib/types";

type CatalogFormState = {
  designation: string;
  description: string;
  prix_unitaire_ht: string;
  unite: string;
  categorie: ActivityCategory;
};

const emptyForm: CatalogFormState = {
  designation: "",
  description: "",
  prix_unitaire_ht: "0",
  unite: "unité",
  categorie: "service_bic"
};

function toFormState(item: CatalogItem): CatalogFormState {
  return {
    designation: item.designation,
    description: item.description ?? "",
    prix_unitaire_ht: String(item.prix_unitaire_ht),
    unite: item.unite,
    categorie: item.categorie
  };
}

export function CatalogoClient({
  initialItems,
  userId
}: {
  initialItems: CatalogItem[];
  userId: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const { showToast } = useToast();
  const [items, setItems] = useState(initialItems);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"todas" | ActivityCategory>("todas");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
  const [form, setForm] = useState<CatalogFormState>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  const filteredItems = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return items.filter((item) => {
      const matchesSearch =
        normalizedSearch === "" || item.designation.toLowerCase().includes(normalizedSearch);
      const matchesCategory = categoryFilter === "todas" || item.categorie === categoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [items, search, categoryFilter]);

  function openCreateModal() {
    setEditingItem(null);
    setForm(emptyForm);
    setErrors({});
    setIsModalOpen(true);
  }

  function openEditModal(item: CatalogItem) {
    setEditingItem(item);
    setForm(toFormState(item));
    setErrors({});
    setIsModalOpen(true);
  }

  async function refreshItems() {
    const { data, error } = await supabase
      .from("catalog_items")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      showToast("Não foi possível atualizar o catálogo.", "error");
      return;
    }

    setItems((data ?? []) as CatalogItem[]);
  }

  async function saveItem() {
    const parsed = catalogItemSchema.safeParse(form);

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

    const request = editingItem
      ? supabase.from("catalog_items").update(payload).eq("id", editingItem.id)
      : supabase.from("catalog_items").insert(payload);

    const { error } = await request;
    setIsSaving(false);

    if (error) {
      showToast("Não foi possível salvar o item.", "error");
      return;
    }

    showToast(editingItem ? "Item atualizado." : "Item criado.", "success");
    setIsModalOpen(false);
    await refreshItems();
  }

  async function archiveItem(item: CatalogItem) {
    const { error } = await supabase
      .from("catalog_items")
      .update({ archived: true })
      .eq("id", item.id);

    if (error) {
      showToast("Não foi possível arquivar o item.", "error");
      return;
    }

    showToast("Item arquivado.", "success");
    await refreshItems();
  }

  const columns: DataTableColumn<CatalogItem>[] = [
    {
      header: "Item",
      render: (item) => (
        <div>
          <p className="font-medium">{item.designation}</p>
          {item.description ? <p className="mt-1 text-sm text-muted">{item.description}</p> : null}
        </div>
      )
    },
    {
      header: "Categoria",
      render: (item) => <Badge tone="neutral">{categoryLabels[item.categorie]}</Badge>
    },
    {
      header: "Preço HT",
      render: (item) =>
        new Intl.NumberFormat("pt-BR", {
          style: "currency",
          currency: "EUR"
        }).format(item.prix_unitaire_ht)
    },
    {
      header: "Unidade",
      render: (item) => item.unite
    },
    {
      header: "Status",
      render: (item) =>
        item.archived ? <Badge tone="warning">Arquivado</Badge> : <Badge tone="success">Ativo</Badge>
    },
    {
      header: "Ações",
      render: (item) => (
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => openEditModal(item)} type="button" variant="secondary">
            Editar
          </Button>
          {!item.archived ? (
            <Button onClick={() => void archiveItem(item)} type="button" variant="secondary">
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
          <p className="text-sm font-semibold text-brand">Catálogo</p>
          <h1 className="mt-2 text-2xl font-semibold text-ink">Produtos e serviços</h1>
        </div>
        <Button onClick={openCreateModal} type="button">
          Novo item
        </Button>
      </div>

      <section className="mb-4 grid gap-3 rounded-lg border border-line bg-white p-4 sm:grid-cols-[1fr_240px]">
        <label className="text-sm font-medium text-ink">
          Buscar por designação
          <Input
            className="mt-2"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Produto ou serviço"
            value={search}
          />
        </label>
        <label className="text-sm font-medium text-ink">
          Categoria
          <Select
            className="mt-2"
            onChange={(event) => setCategoryFilter(event.target.value as "todas" | ActivityCategory)}
            value={categoryFilter}
          >
            <option value="todas">Todas</option>
            <option value="vente">Vente</option>
            <option value="service_bic">Service BIC</option>
            <option value="service_bnc">Service BNC</option>
          </Select>
        </label>
      </section>

      <DataTable
        columns={columns}
        emptyMessage="Nenhum item encontrado."
        getRowKey={(item) => item.id}
        rows={filteredItems}
      />

      <FormModal
        description="A categoria será usada nos cálculos de cotisations."
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? "Editar item" : "Novo item"}
      >
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            void saveItem();
          }}
        >
          <FieldError error={errors.designation}>
            <label className="text-sm font-medium text-ink">
              Designação
              <Input
                className="mt-2"
                onChange={(event) =>
                  setForm((current) => ({ ...current, designation: event.target.value }))
                }
                value={form.designation}
              />
            </label>
          </FieldError>
          <label className="text-sm font-medium text-ink">
            Descrição
            <Textarea
              className="mt-2"
              onChange={(event) =>
                setForm((current) => ({ ...current, description: event.target.value }))
              }
              value={form.description}
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-3">
            <FieldError error={errors.prix_unitaire_ht}>
              <label className="text-sm font-medium text-ink">
                Preço unitário HT
                <Input
                  className="mt-2"
                  min="0"
                  onChange={(event) =>
                    setForm((current) => ({ ...current, prix_unitaire_ht: event.target.value }))
                  }
                  step="0.01"
                  type="number"
                  value={form.prix_unitaire_ht}
                />
              </label>
            </FieldError>
            <FieldError error={errors.unite}>
              <label className="text-sm font-medium text-ink">
                Unidade
                <Input
                  className="mt-2"
                  onChange={(event) => setForm((current) => ({ ...current, unite: event.target.value }))}
                  value={form.unite}
                />
              </label>
            </FieldError>
            <FieldError error={errors.categorie}>
              <label className="text-sm font-medium text-ink">
                Categoria
                <Select
                  className="mt-2"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      categorie: event.target.value as ActivityCategory
                    }))
                  }
                  value={form.categorie}
                >
                  <option value="vente">Vente</option>
                  <option value="service_bic">Service BIC</option>
                  <option value="service_bnc">Service BNC</option>
                </Select>
              </label>
            </FieldError>
          </div>
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
