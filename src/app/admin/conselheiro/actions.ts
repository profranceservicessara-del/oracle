"use server";

import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/admin/advisor-admin";
import { createAdminClient } from "@/lib/server/admin-supabase";

const STATUSES = new Set(["received", "in_review", "answered", "closed"]);

export async function respondAdvisorRequestAction(
  id: string,
  response: string,
  status: string
): Promise<{ error?: string; ok?: boolean }> {
  // Re-verifica admin no servidor (nunca confia no client).
  const admin = await assertAdmin();
  if (!admin) return { error: "Acesso negado." };
  if (!STATUSES.has(status)) return { error: "Status inválido." };

  const trimmed = response.trim();
  const supabaseAdmin = createAdminClient();
  const update: { status: string; admin_response?: string | null; responded_at?: string | null } = { status };
  if (trimmed) {
    update.admin_response = trimmed.slice(0, 4000);
    update.responded_at = new Date().toISOString();
  }
  const { error } = await supabaseAdmin.from("advisor_requests").update(update).eq("id", id);
  if (error) return { error: "Não foi possível salvar." };

  revalidatePath("/admin/conselheiro");
  return { ok: true };
}
