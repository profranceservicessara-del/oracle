import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/server/admin-supabase";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const deleteSchema = z.object({
  confirmation: z.literal("CONFIRMAR")
});

function randomPassword() {
  return `${crypto.randomUUID()}-${crypto.randomUUID()}`;
}

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sessão expirada." }, { status: 401 });
  }

  const parsed = deleteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Confirmação inválida." }, { status: 400 });
  }

  const admin = createAdminClient();
  const anonymizedEmail = `deleted-${crypto.randomUUID()}@deleted.profacture.local`;
  const { data: anonymizedUser, error: createError } = await admin.auth.admin.createUser({
    email: anonymizedEmail,
    email_confirm: true,
    password: randomPassword(),
    user_metadata: {
      rgpd_anonymized: true
    }
  });

  if (createError || !anonymizedUser.user) {
    return NextResponse.json(
      { error: createError?.message ?? "Não foi possível criar o usuário anonimizado." },
      { status: 500 }
    );
  }

  const { error: anonymizeError } = await admin.rpc("rgpd_anonymize_account", {
    p_anonymized_user_id: anonymizedUser.user.id,
    p_original_user_id: user.id
  });

  if (anonymizeError) {
    return NextResponse.json({ error: anonymizeError.message }, { status: 500 });
  }

  // Módulos adicionados depois do core: a função rgpd_anonymize_account não os
  // cobre, então HARD DELETE aqui (dados pessoais sem obrigação de retenção;
  // faturas/pagamentos legais são anonimizados pela função acima). Ordem
  // respeita FKs: cascades cuidam de accounts/transactions/reconciliations
  // (via bank_connections) e das linhas de declaração (via drafts).
  const personalTables = [
    "bank_connections",
    "urssaf_declaration_drafts",
    "advisor_requests",
    "supplier_invoices",
    "manual_receipts",
    "contract_templates"
  ];
  for (const table of personalTables) {
    const { error: purgeError } = await admin.from(table).delete().eq("user_id", user.id);
    if (purgeError) {
      return NextResponse.json({ error: `Falha ao remover dados (${table}).` }, { status: 500 });
    }
  }

  // Anexos do usuário no bucket privado de faturas de fornecedor.
  const { data: files } = await admin.storage.from("supplier-invoices").list(user.id, { limit: 1000 });
  if (files && files.length > 0) {
    await admin.storage.from("supplier-invoices").remove(files.map((f) => `${user.id}/${f.name}`));
  }

  await admin.auth.admin.updateUserById(user.id, {
    ban_duration: "876000h",
    email: `deleted-${crypto.randomUUID()}@deleted.profacture.local`,
    password: randomPassword(),
    user_metadata: {
      rgpd_deleted: true
    }
  } as Parameters<typeof admin.auth.admin.updateUserById>[1]);

  const adminAuth = admin.auth.admin as typeof admin.auth.admin & {
    signOut?: (userId: string, scope?: "global") => Promise<{ error: Error | null }>;
  };
  await adminAuth.signOut?.(user.id, "global");
  await supabase.auth.signOut();

  return NextResponse.json({ ok: true });
}
