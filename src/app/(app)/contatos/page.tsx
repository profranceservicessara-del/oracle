import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ContatosClient, type Person, type Third } from "./contatos-client";

// Módulo Contatos (CRM paralelo). Carrega os terceiros (contact_thirds) e as
// pessoas (contact_people) do usuário. Filtragem por aba é feita no client
// (volume pequeno por conta). Fase 2: listagem com abas, ordenação e paginação.
export default async function ContatosPage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const [thirdsRes, peopleRes, addrRes] = await Promise.all([
    supabase
      .from("contact_thirds")
      .select("id, entity_kind, third_type, name, email, phone, mobile, website, linkedin, business_sector, archived")
      .eq("archived", false)
      .order("name", { ascending: true }),
    supabase
      .from("contact_people")
      .select("id, third_id, civility, first_name, last_name, role, email, phone, mobile, fax, birth_date")
      .order("last_name", { ascending: true }),
    supabase.from("contact_addresses").select("third_id, kind, line1, city").eq("kind", "billing")
  ]);

  const billingByThird = new Map<string, string>();
  for (const a of (addrRes.data ?? []) as Array<{ third_id: string; line1: string | null; city: string | null }>) {
    const label = [a.line1, a.city].filter(Boolean).join(", ");
    if (label) billingByThird.set(a.third_id, label);
  }

  const countByThird = new Map<string, number>();
  for (const p of (peopleRes.data ?? []) as Array<{ third_id: string | null }>) {
    if (p.third_id) countByThird.set(p.third_id, (countByThird.get(p.third_id) ?? 0) + 1);
  }

  const nameByThird = new Map<string, string>();
  for (const r of (thirdsRes.data ?? []) as Array<{ id: string; name: string | null }>) {
    nameByThird.set(r.id, r.name ?? "");
  }

  const thirds: Third[] = ((thirdsRes.data ?? []) as Array<Record<string, unknown>>).map((r) => ({
    id: r.id as string,
    entityKind: (r.entity_kind as Third["entityKind"]) ?? "company",
    thirdType: (r.third_type as Third["thirdType"]) ?? "client",
    name: (r.name as string) ?? "",
    email: (r.email as string) ?? null,
    phone: (r.phone as string) ?? null,
    mobile: (r.mobile as string) ?? null,
    website: (r.website as string) ?? null,
    linkedin: (r.linkedin as string) ?? null,
    businessSector: (r.business_sector as string) ?? null,
    billingAddress: billingByThird.get(r.id as string) ?? null,
    contactsCount: countByThird.get(r.id as string) ?? 0
  }));

  const people: Person[] = ((peopleRes.data ?? []) as Array<Record<string, unknown>>).map((r) => {
    const first = (r.first_name as string) ?? "";
    const last = (r.last_name as string) ?? "";
    const thirdId = (r.third_id as string) ?? null;
    return {
      id: r.id as string,
      thirdId,
      thirdName: thirdId ? nameByThird.get(thirdId) ?? null : null,
      civility: (r.civility as string) ?? null,
      firstName: first || null,
      lastName: last || null,
      fullName: `${first} ${last}`.trim() || "Sem nome",
      role: (r.role as string) ?? null,
      email: (r.email as string) ?? null,
      phone: (r.phone as string) ?? null,
      mobile: (r.mobile as string) ?? null,
      fax: (r.fax as string) ?? null,
      birthDate: (r.birth_date as string) ?? null
    };
  });

  return <ContatosClient initialPeople={people} initialThirds={thirds} userId={user.id} />;
}
