import { createClient } from "@/lib/supabase/server";
import type { Locale } from "@/lib/i18n/dictionaries";

// Reads the signed-in user's preferred locale (default 'fr').
export async function getLocale(): Promise<Locale> {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return "fr";
  }

  const { data } = await supabase
    .from("user_preferences")
    .select("locale")
    .eq("user_id", user.id)
    .maybeSingle();

  return data?.locale === "pt" ? "pt" : "fr";
}
