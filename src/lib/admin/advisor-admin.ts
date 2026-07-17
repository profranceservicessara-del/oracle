import { createClient } from "@/lib/supabase/server";

// Allowlist de admins do Conselheiro. Fail-closed: sem ADVISOR_ADMIN_EMAILS
// (ou e-mail fora da lista) => não é admin. Case-insensitive. Módulo server
// comum (não é "use server"): pode exportar helpers síncronos.
export function adminEmails(): string[] {
  return (process.env.ADVISOR_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

// Retorna o e-mail admin da sessão, ou null se não for admin.
export async function assertAdmin(): Promise<string | null> {
  const list = adminEmails();
  if (list.length === 0) return null;
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  const email = user?.email?.toLowerCase();
  if (!email || !list.includes(email)) return null;
  return email;
}
