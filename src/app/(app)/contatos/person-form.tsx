"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormModal } from "@/components/ui/form-modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import type { Person } from "./contatos-client";

// Formulário completo da pessoa (criar/editar), com vínculo a um Third.
export type PersonFull = {
  id?: string;
  civility: string;
  first_name: string;
  last_name: string;
  role: string;
  email: string;
  phone: string;
  mobile: string;
  fax: string;
  birth_date: string;
  third_id: string;
};

export const emptyPersonFull: PersonFull = {
  civility: "",
  first_name: "",
  last_name: "",
  role: "",
  email: "",
  phone: "",
  mobile: "",
  fax: "",
  birth_date: "",
  third_id: ""
};

export function personToFull(p: Person): PersonFull {
  return {
    id: p.id,
    civility: p.civility ?? "",
    first_name: p.firstName ?? "",
    last_name: p.lastName ?? "",
    role: p.role ?? "",
    email: p.email ?? "",
    phone: p.phone ?? "",
    mobile: p.mobile ?? "",
    fax: p.fax ?? "",
    birth_date: p.birthDate ?? "",
    third_id: p.thirdId ?? ""
  };
}

export function PersonForm({
  isOpen,
  mode,
  value,
  userId,
  thirds,
  onClose,
  onSaved
}: {
  isOpen: boolean;
  mode: "create" | "edit";
  value: PersonFull;
  userId: string;
  thirds: { id: string; name: string }[];
  onClose: () => void;
  onSaved: (saved: Person, mode: "create" | "edit") => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const { showToast } = useToast();
  const [form, setForm] = useState<PersonFull>(value);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (isOpen) {
      setForm(value);
      setErr("");
    }
  }, [isOpen, value]);

  function set<K extends keyof PersonFull>(k: K, v: PersonFull[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function save() {
    setErr("");
    if (!form.first_name.trim() && !form.last_name.trim()) {
      setErr("Informe ao menos o nome ou sobrenome.");
      return;
    }
    setSaving(true);
    const s = (v: string) => (v.trim() === "" ? null : v.trim());
    const core = {
      civility: form.civility || null,
      first_name: s(form.first_name),
      last_name: s(form.last_name),
      role: s(form.role),
      email: s(form.email),
      phone: s(form.phone),
      mobile: s(form.mobile),
      fax: s(form.fax),
      birth_date: form.birth_date || null,
      third_id: form.third_id || null
    };

    let id = form.id;
    if (mode === "edit" && id) {
      const { error } = await supabase.from("contact_people").update(core).eq("id", id);
      if (error) {
        setSaving(false);
        showToast("Não foi possível salvar.", "error");
        return;
      }
    } else {
      const { data, error } = await supabase
        .from("contact_people")
        .insert({ ...core, user_id: userId })
        .select("id")
        .single();
      if (error || !data) {
        setSaving(false);
        showToast("Não foi possível criar o contato.", "error");
        return;
      }
      id = (data as { id: string }).id;
    }
    setSaving(false);

    const fullName = `${form.first_name} ${form.last_name}`.trim() || "Sem nome";
    const thirdName = form.third_id ? thirds.find((t) => t.id === form.third_id)?.name ?? null : null;
    onSaved(
      {
        id: id as string,
        thirdId: form.third_id || null,
        thirdName,
        civility: form.civility || null,
        firstName: core.first_name,
        lastName: core.last_name,
        fullName,
        role: core.role,
        email: core.email,
        phone: core.phone,
        mobile: core.mobile,
        fax: core.fax,
        birthDate: form.birth_date || null
      },
      mode
    );
    showToast(mode === "edit" ? "Contato atualizado." : "Contato criado.", "success");
  }

  return (
    <FormModal
      description={mode === "edit" ? "Edite os dados do contato." : "Informe ao menos o nome ou sobrenome."}
      isOpen={isOpen}
      onClose={onClose}
      title={mode === "edit" ? "Editar contato" : "Novo contato"}
    >
      <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); void save(); }}>
        <div className="grid gap-4 sm:grid-cols-[110px_1fr_1fr]">
          <label className="text-sm font-medium text-ink">
            Título
            <Select className="mt-1.5" onChange={(e) => set("civility", e.target.value)} value={form.civility}>
              <option value="">—</option>
              <option value="mr">Sr.</option>
              <option value="mrs">Sra.</option>
            </Select>
          </label>
          <label className="text-sm font-medium text-ink">
            Primeiro nome
            <Input className="mt-1.5" onChange={(e) => set("first_name", e.target.value)} value={form.first_name} />
          </label>
          <label className="text-sm font-medium text-ink">
            Nome
            <Input className="mt-1.5" onChange={(e) => set("last_name", e.target.value)} value={form.last_name} />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-ink">
            Função
            <Input className="mt-1.5" onChange={(e) => set("role", e.target.value)} value={form.role} />
          </label>
          <label className="text-sm font-medium text-ink">
            Empresa vinculada
            <Select className="mt-1.5" onChange={(e) => set("third_id", e.target.value)} value={form.third_id}>
              <option value="">Nenhuma</option>
              {thirds.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </Select>
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-ink">
            E-mail
            <Input className="mt-1.5" onChange={(e) => set("email", e.target.value)} type="email" value={form.email} />
          </label>
          <label className="text-sm font-medium text-ink">
            Telefone
            <Input className="mt-1.5" onChange={(e) => set("phone", e.target.value)} value={form.phone} />
          </label>
          <label className="text-sm font-medium text-ink">
            Móvel
            <Input className="mt-1.5" onChange={(e) => set("mobile", e.target.value)} value={form.mobile} />
          </label>
          <label className="text-sm font-medium text-ink">
            Fax
            <Input className="mt-1.5" onChange={(e) => set("fax", e.target.value)} value={form.fax} />
          </label>
        </div>

        <label className="text-sm font-medium text-ink sm:w-1/2">
          Data de nascimento
          <Input className="mt-1.5" onChange={(e) => set("birth_date", e.target.value)} type="date" value={form.birth_date} />
        </label>

        {err ? <p className="text-sm text-red-600">{err}</p> : null}
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button onClick={onClose} type="button" variant="secondary">Cancelar</Button>
          <Button disabled={saving} type="submit">{saving ? "Salvando…" : "Salvar"}</Button>
        </div>
      </form>
    </FormModal>
  );
}
