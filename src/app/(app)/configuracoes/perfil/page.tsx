import { redirect } from "next/navigation";
import { getLocale } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import { PerfilClient } from "./perfil-client";

export default async function PerfilPage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  const locale = await getLocale();

  return <PerfilClient initialProfile={profile as Profile | null} locale={locale} userId={user.id} />;
}
