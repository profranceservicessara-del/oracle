import { notFound } from "next/navigation";
import { assertAdmin } from "@/lib/admin/advisor-admin";
import { createAdminClient } from "@/lib/server/admin-supabase";
import type { AdvisorRequest } from "@/lib/types";
import { AdminConselheiroClient } from "./admin-client";

export const dynamic = "force-dynamic";

// Inbox admin do Conselheiro. Fora da sidebar (rota direta). Protegido por
// allowlist de e-mail (ADVISOR_ADMIN_EMAILS) — fail-closed: sem a env ou
// e-mail fora da lista => 404. Leitura via service-role (todas as
// solicitações). Não expõe dados na navegação normal do app.
export default async function AdminConselheiroPage() {
  const admin = await assertAdmin();
  if (!admin) {
    notFound();
  }

  const supabaseAdmin = createAdminClient();
  const { data } = await supabaseAdmin
    .from("advisor_requests")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  return <AdminConselheiroClient adminEmail={admin} requests={(data ?? []) as AdvisorRequest[]} />;
}
