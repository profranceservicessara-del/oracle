import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/app/app-sidebar";
import { ToastProvider } from "@/components/ui/toast";
import { getLocale } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const locale = await getLocale();

  const { data: profile } = await supabase.from("profiles").select("avatar_url").eq("id", user.id).maybeSingle();
  let avatarUrl: string | null = null;
  if (profile?.avatar_url) {
    const { data: signed } = await supabase.storage.from("logos").createSignedUrl(profile.avatar_url, 900);
    avatarUrl = signed?.signedUrl ?? null;
  }

  return (
    <ToastProvider>
      <div className="min-h-screen bg-[#F7F8FC]">
        <AppSidebar avatarUrl={avatarUrl} email={user.email ?? ""} locale={locale} userId={user.id} />
        <div className="md:pl-64">{children}</div>
      </div>
    </ToastProvider>
  );
}
