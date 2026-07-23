"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormModal } from "@/components/ui/form-modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import type { Third } from "./contatos-client";

// Formulário completo do Third (criar/editar). Cobre todos os campos de
// contact_thirds mais o endereço de faturação (contact_addresses, kind billing).
export type ThirdFull = {
  id?: string;
  entity_kind: string;
  third_type: string;
  name: string;
  reference: string;
  price_category: string;
  registration_channel: string;
  email: string;
  phone: string;
  mobile: string;
  fax: string;
  website: string;
  legal_status: string;
  siret: string;
  siren: string;
  naf_code: string;
  share_capital: string;
  rcs: string;
  intra_vat: string;
  business_sector: string;
  activity_description: string;
  employee_count: string;
  twitter: string;
  facebook: string;
  linkedin: string;
  instagram: string;
  third_party_account: string;
  subsidiary_account_code: string;
  accounting_note: string;
  addr_id: string | null;
  addr_line1: string;
  addr_zip_code: string;
  addr_city: string;
  addr_state: string;
  addr_country: string;
};

export const emptyThirdFull: ThirdFull = {
  entity_kind: "company",
  third_type: "client",
  name: "",
  reference: "",
  price_category: "",
  registration_channel: "",
  email: "",
  phone: "",
  mobile: "",
  fax: "",
  website: "",
  legal_status: "",
  siret: "",
  siren: "",
  naf_code: "",
  share_capital: "",
  rcs: "",
  intra_vat: "",
  business_sector: "",
  activity_description: "",
  employee_count: "",
  twitter: "",
  facebook: "",
  linkedin: "",
  instagram: "",
  third_party_account: "",
  subsidiary_account_code: "",
  accounting_note: "",
  addr_id: null,
  addr_line1: "",
  addr_zip_code: "",
  addr_city: "",
  addr_state: "",
  addr_country: ""
};

// Converte a linha do banco (contact_thirds + endereço billing) para o form.
export function toThirdFull(row: Record<string, unknown>, addr: Record<string, unknown> | null): ThirdFull {
  const g = (k: string) => (row[k] == null ? "" : String(row[k]));
  const a = (k: string) => (addr && addr[k] != null ? String(addr[k]) : "");
  return {
    id: row.id as string,
    entity_kind: g("entity_kind") || "company",
    third_type: g("third_type") || "client",
    name: g("name"),
    reference: g("reference"),
    price_category: g("price_category"),
    registration_channel: g("registration_channel"),
    email: g("email"),
    phone: g("phone"),
    mobile: g("mobile"),
    fax: g("fax"),
    website: g("website"),
    legal_status: g("legal_status"),
    siret: g("siret"),
    siren: g("siren"),
    naf_code: g("naf_code"),
    share_capital: g("share_capital"),
    rcs: g("rcs"),
    intra_vat: g("intra_vat"),
    business_sector: g("business_sector"),
    activity_description: g("activity_description"),
    employee_count: g("employee_count"),
    twitter: g("twitter"),
    facebook: g("facebook"),
    linkedin: g("linkedin"),
    instagram: g("instagram"),
    third_party_account: g("third_party_account"),
    subsidiary_account_code: g("subsidiary_account_code"),
    accounting_note: g("accounting_note"),
    addr_id: addr ? (addr.id as string) : null,
    addr_line1: a("line1"),
    addr_zip_code: a("zip_code"),
    addr_city: a("city"),
    addr_state: a("state"),
    addr_country: a("country")
  };
}

const th = "border-b border-line pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400";

type DirHit = {
  siren: string;
  siret: string;
  name: string;
  naf_code: string;
  addr_line1: string;
  addr_zip_code: string;
  addr_city: string;
};

// Campo de texto rotulado. Fica no escopo do módulo (não dentro do form) para
// não remontar a cada tecla, o que faria o input perder o foco.
function TextField({
  label,
  k,
  form,
  set,
  type
}: {
  label: string;
  k: keyof ThirdFull;
  form: ThirdFull;
  set: (k: keyof ThirdFull, v: string) => void;
  type?: string;
}) {
  return (
    <label className="text-sm font-medium text-ink">
      {label}
      <Input className="mt-1.5" onChange={(e) => set(k, e.target.value)} type={type} value={(form[k] as string) ?? ""} />
    </label>
  );
}

export function ThirdForm({
  isOpen,
  mode,
  value,
  userId,
  onClose,
  onSaved
}: {
  isOpen: boolean;
  mode: "create" | "edit";
  value: ThirdFull;
  userId: string;
  onClose: () => void;
  onSaved: (saved: Third, mode: "create" | "edit") => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const { showToast } = useToast();
  const [form, setForm] = useState<ThirdFull>(value);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const [dirQuery, setDirQuery] = useState("");
  const [dirResults, setDirResults] = useState<DirHit[]>([]);
  const [dirLoading, setDirLoading] = useState(false);
  const [dirDone, setDirDone] = useState(false);

  // Recarrega o form sempre que abre com outro registro.
  useEffect(() => {
    if (isOpen) {
      setForm(value);
      setErr("");
      setDirQuery("");
      setDirResults([]);
      setDirDone(false);
    }
  }, [isOpen, value]);

  function set<K extends keyof ThirdFull>(k: K, v: ThirdFull[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function searchDirectory() {
    const q = dirQuery.trim();
    if (q.length < 3) return;
    setDirLoading(true);
    setDirDone(false);
    try {
      const res = await fetch(`/api/contatos/siret?q=${encodeURIComponent(q)}`);
      const data = (await res.json()) as { results?: DirHit[]; error?: string };
      if (!res.ok) {
        showToast(data.error ?? "Diretório indisponível.", "error");
        setDirResults([]);
      } else {
        setDirResults(data.results ?? []);
      }
    } catch {
      showToast("Diretório indisponível.", "error");
      setDirResults([]);
    } finally {
      setDirLoading(false);
      setDirDone(true);
    }
  }

  // Autopreenche os campos a partir de um resultado do diretório.
  function applyHit(h: DirHit) {
    setForm((f) => ({
      ...f,
      entity_kind: "company",
      name: h.name || f.name,
      siret: h.siret || f.siret,
      siren: h.siren || f.siren,
      naf_code: h.naf_code || f.naf_code,
      addr_line1: h.addr_line1 || f.addr_line1,
      addr_zip_code: h.addr_zip_code || f.addr_zip_code,
      addr_city: h.addr_city || f.addr_city,
      addr_country: f.addr_country || "France"
    }));
    setDirResults([]);
    setDirDone(false);
    showToast("Dados preenchidos do diretório. Confira antes de salvar.", "success");
  }

  async function save() {
    setErr("");
    if (!form.name.trim()) {
      setErr("Informe o nome.");
      return;
    }
    setSaving(true);
    const s = (v: string) => (v.trim() === "" ? null : v.trim());
    const core = {
      entity_kind: form.entity_kind,
      third_type: form.third_type,
      name: form.name.trim(),
      reference: s(form.reference),
      price_category: s(form.price_category),
      registration_channel: s(form.registration_channel),
      email: s(form.email),
      phone: s(form.phone),
      mobile: s(form.mobile),
      fax: s(form.fax),
      website: s(form.website),
      legal_status: s(form.legal_status),
      siret: s(form.siret),
      siren: s(form.siren),
      naf_code: s(form.naf_code),
      share_capital: s(form.share_capital),
      rcs: s(form.rcs),
      intra_vat: s(form.intra_vat),
      business_sector: s(form.business_sector),
      activity_description: s(form.activity_description),
      employee_count: s(form.employee_count),
      twitter: s(form.twitter),
      facebook: s(form.facebook),
      linkedin: s(form.linkedin),
      instagram: s(form.instagram),
      third_party_account: s(form.third_party_account),
      subsidiary_account_code: s(form.subsidiary_account_code),
      accounting_note: s(form.accounting_note)
    };

    let thirdId = form.id;
    if (mode === "edit" && thirdId) {
      const { error } = await supabase.from("contact_thirds").update(core).eq("id", thirdId);
      if (error) {
        setSaving(false);
        showToast("Não foi possível salvar.", "error");
        return;
      }
    } else {
      const { data, error } = await supabase
        .from("contact_thirds")
        .insert({ ...core, user_id: userId })
        .select("id")
        .single();
      if (error || !data) {
        setSaving(false);
        showToast("Não foi possível criar.", "error");
        return;
      }
      thirdId = (data as { id: string }).id;
    }

    // Endereço de faturação: cria, atualiza ou remove conforme o preenchimento.
    const addr = {
      line1: s(form.addr_line1),
      zip_code: s(form.addr_zip_code),
      city: s(form.addr_city),
      state: s(form.addr_state),
      country: s(form.addr_country)
    };
    const hasAddr = Object.values(addr).some(Boolean);
    if (hasAddr) {
      if (form.addr_id) {
        await supabase.from("contact_addresses").update(addr).eq("id", form.addr_id);
      } else {
        await supabase.from("contact_addresses").insert({ ...addr, user_id: userId, third_id: thirdId, kind: "billing" });
      }
    } else if (form.addr_id) {
      await supabase.from("contact_addresses").delete().eq("id", form.addr_id);
    }

    setSaving(false);
    const billingAddress = [addr.line1, addr.city].filter(Boolean).join(", ") || null;
    onSaved(
      {
        id: thirdId as string,
        entityKind: form.entity_kind as Third["entityKind"],
        thirdType: form.third_type as Third["thirdType"],
        name: form.name.trim(),
        email: core.email,
        phone: core.phone,
        mobile: core.mobile,
        website: core.website,
        linkedin: core.linkedin,
        businessSector: core.business_sector,
        billingAddress,
        contactsCount: 0
      },
      mode
    );
    showToast(mode === "edit" ? "Registro atualizado." : "Registro criado.", "success");
  }

  return (
    <FormModal
      description={mode === "edit" ? "Edite os dados do registro." : "Preencha o que tiver, o nome é o único obrigatório."}
      isOpen={isOpen}
      onClose={onClose}
      title={mode === "edit" ? "Editar registro" : "Novo registro"}
    >
      <form className="grid gap-6" onSubmit={(e) => { e.preventDefault(); void save(); }}>
        {/* Busca no diretório oficial (SIRET/SIREN) */}
        <div className="grid gap-3 rounded-2xl bg-slate-50 p-4 ring-1 ring-black/5">
          <p className="text-sm font-semibold text-ink">Buscar no diretório (SIRET/SIREN)</p>
          <div className="flex gap-2">
            <Input
              onChange={(e) => setDirQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void searchDirectory(); } }}
              placeholder="Nome da empresa ou SIREN/SIRET"
              value={dirQuery}
            />
            <Button disabled={dirLoading || dirQuery.trim().length < 3} onClick={() => void searchDirectory()} type="button" variant="secondary">
              {dirLoading ? "Buscando…" : "Buscar"}
            </Button>
          </div>
          {dirResults.length > 0 ? (
            <ul className="divide-y divide-line overflow-hidden rounded-xl bg-white ring-1 ring-black/5">
              {dirResults.map((h) => (
                <li key={`${h.siret || h.siren}-${h.name}`}>
                  <button className="block w-full px-3 py-2.5 text-left transition hover:bg-slate-50" onClick={() => applyHit(h)} type="button">
                    <span className="block text-sm font-medium text-ink">{h.name || "Sem nome"}</span>
                    <span className="block text-xs text-slate-500">
                      {[h.siret || h.siren, [h.addr_zip_code, h.addr_city].filter(Boolean).join(" ")].filter(Boolean).join(" · ")}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : dirDone && !dirLoading ? (
            <p className="text-xs text-slate-500">Nenhuma empresa encontrada. Você pode preencher manualmente.</p>
          ) : (
            <p className="text-xs text-slate-500">Dados públicos do INSEE. Confira sempre antes de salvar.</p>
          )}
        </div>

        {/* Identidade */}
        <div className="grid gap-4">
          <p className={th}>Identidade</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-ink">
              Categoria
              <Select className="mt-1.5" onChange={(e) => set("entity_kind", e.target.value)} value={form.entity_kind}>
                <option value="company">Empresa</option>
                <option value="individual">Indivíduo</option>
              </Select>
            </label>
            <label className="text-sm font-medium text-ink">
              Tipo
              <Select className="mt-1.5" onChange={(e) => set("third_type", e.target.value)} value={form.third_type}>
                <option value="client">Cliente</option>
                <option value="prospect">Perspectiva</option>
                <option value="supplier">Fornecedor</option>
              </Select>
            </label>
          </div>
          <label className="text-sm font-medium text-ink">
            Nome *
            <Input className="mt-1.5" onChange={(e) => set("name", e.target.value)} value={form.name} />
          </label>
          <div className="grid gap-4 sm:grid-cols-3">
            <TextField form={form} set={set} k="reference" label="Referência" />
            <TextField form={form} set={set} k="price_category" label="Categoria de preços" />
            <TextField form={form} set={set} k="registration_channel" label="Canal de inscrição" />
          </div>
        </div>

        {/* Contato */}
        <div className="grid gap-4">
          <p className={th}>Contato</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField form={form} set={set} k="email" label="E-mail" type="email" />
            <TextField form={form} set={set} k="website" label="Site" />
            <TextField form={form} set={set} k="phone" label="Telefone" />
            <TextField form={form} set={set} k="mobile" label="Móvel" />
            <TextField form={form} set={set} k="fax" label="Fax" />
          </div>
        </div>

        {/* Endereço de faturação */}
        <div className="grid gap-4">
          <p className={th}>Endereço de faturação</p>
          <TextField form={form} set={set} k="addr_line1" label="Logradouro" />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField form={form} set={set} k="addr_zip_code" label="CEP / Código postal" />
            <TextField form={form} set={set} k="addr_city" label="Cidade" />
            <TextField form={form} set={set} k="addr_state" label="Estado / Província" />
            <TextField form={form} set={set} k="addr_country" label="País" />
          </div>
        </div>

        {/* Dados jurídicos */}
        <div className="grid gap-4">
          <p className={th}>Dados jurídicos</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField form={form} set={set} k="legal_status" label="Situação jurídica" />
            <TextField form={form} set={set} k="share_capital" label="Capital social" />
            <TextField form={form} set={set} k="siret" label="SIRET" />
            <TextField form={form} set={set} k="siren" label="SIREN" />
            <TextField form={form} set={set} k="naf_code" label="Código NAF" />
            <TextField form={form} set={set} k="rcs" label="RCS" />
            <TextField form={form} set={set} k="intra_vat" label="IVA intracomunitário" />
          </div>
        </div>

        {/* Atividade */}
        <div className="grid gap-4">
          <p className={th}>Atividade</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField form={form} set={set} k="business_sector" label="Setor empresarial" />
            <TextField form={form} set={set} k="employee_count" label="Número de funcionários" />
          </div>
          <label className="text-sm font-medium text-ink">
            Descrição da atividade
            <textarea
              className="mt-1.5 min-h-[80px] w-full rounded-2xl border border-line bg-white px-3 py-2.5 text-base text-ink outline-none transition placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-[#bcd0ee]"
              onChange={(e) => set("activity_description", e.target.value)}
              value={form.activity_description}
            />
          </label>
        </div>

        {/* Redes sociais */}
        <div className="grid gap-4">
          <p className={th}>Redes sociais</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField form={form} set={set} k="linkedin" label="LinkedIn" />
            <TextField form={form} set={set} k="facebook" label="Facebook" />
            <TextField form={form} set={set} k="twitter" label="Twitter / X" />
            <TextField form={form} set={set} k="instagram" label="Instagram" />
          </div>
        </div>

        {/* Contabilidade */}
        <div className="grid gap-4">
          <p className={th}>Contabilidade</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField form={form} set={set} k="third_party_account" label="Conta de terceiro" />
            <TextField form={form} set={set} k="subsidiary_account_code" label="Código de conta auxiliar" />
          </div>
          <label className="text-sm font-medium text-ink">
            Nota contábil
            <textarea
              className="mt-1.5 min-h-[70px] w-full rounded-2xl border border-line bg-white px-3 py-2.5 text-base text-ink outline-none transition placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-[#bcd0ee]"
              onChange={(e) => set("accounting_note", e.target.value)}
              value={form.accounting_note}
            />
          </label>
        </div>

        {err ? <p className="text-sm text-red-600">{err}</p> : null}
        <div className="sticky bottom-0 -mx-6 -mb-6 flex justify-end gap-2 border-t border-line bg-white px-6 py-4">
          <Button onClick={onClose} type="button" variant="secondary">Cancelar</Button>
          <Button disabled={saving} type="submit">{saving ? "Salvando…" : "Salvar"}</Button>
        </div>
      </form>
    </FormModal>
  );
}
