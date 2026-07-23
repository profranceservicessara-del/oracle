import type { SupabaseClient } from "@supabase/supabase-js";
import type { Person, Third } from "./contatos-client";

export async function fetchContatosData(supabase: SupabaseClient) {
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
  for (const address of (addrRes.data ?? []) as Array<{ third_id: string; line1: string | null; city: string | null }>) {
    const label = [address.line1, address.city].filter(Boolean).join(", ");
    if (label) {
      billingByThird.set(address.third_id, label);
    }
  }

  const countByThird = new Map<string, number>();
  for (const person of (peopleRes.data ?? []) as Array<{ third_id: string | null }>) {
    if (person.third_id) {
      countByThird.set(person.third_id, (countByThird.get(person.third_id) ?? 0) + 1);
    }
  }

  const nameByThird = new Map<string, string>();
  for (const row of (thirdsRes.data ?? []) as Array<{ id: string; name: string | null }>) {
    nameByThird.set(row.id, row.name ?? "");
  }

  const thirds: Third[] = ((thirdsRes.data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    id: row.id as string,
    entityKind: (row.entity_kind as Third["entityKind"]) ?? "company",
    thirdType: (row.third_type as Third["thirdType"]) ?? "client",
    name: (row.name as string) ?? "",
    email: (row.email as string) ?? null,
    phone: (row.phone as string) ?? null,
    mobile: (row.mobile as string) ?? null,
    website: (row.website as string) ?? null,
    linkedin: (row.linkedin as string) ?? null,
    businessSector: (row.business_sector as string) ?? null,
    billingAddress: billingByThird.get(row.id as string) ?? null,
    contactsCount: countByThird.get(row.id as string) ?? 0
  }));

  const people: Person[] = ((peopleRes.data ?? []) as Array<Record<string, unknown>>).map((row) => {
    const first = (row.first_name as string) ?? "";
    const last = (row.last_name as string) ?? "";
    const thirdId = (row.third_id as string) ?? null;

    return {
      id: row.id as string,
      thirdId,
      thirdName: thirdId ? nameByThird.get(thirdId) ?? null : null,
      civility: (row.civility as string) ?? null,
      firstName: first || null,
      lastName: last || null,
      fullName: `${first} ${last}`.trim() || "Sem nome",
      role: (row.role as string) ?? null,
      email: (row.email as string) ?? null,
      phone: (row.phone as string) ?? null,
      mobile: (row.mobile as string) ?? null,
      fax: (row.fax as string) ?? null,
      birthDate: (row.birth_date as string) ?? null
    };
  });

  return { people, thirds };
}
