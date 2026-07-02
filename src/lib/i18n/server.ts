import { createClient } from "@/lib/supabase/server";
import type { Locale } from "@/lib/i18n/dictionaries";

// Reads the signed-in user's preferred locale. Portuguese is the default;
// French is opt-in and persisted per user in user_preferences.locale.
export async function getLocale(): Promise<Locale> {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return "pt";
  }

  const { data } = await supabase
    .from("user_preferences")
    .select("locale")
    .eq("user_id", user.id)
    .maybeSingle();

  return data?.locale === "fr" ? "fr" : "pt";
}
