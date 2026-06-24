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

  return (
    <ToastProvider>
      <div className="min-h-screen bg-[#F7F8FC]">
        <AppSidebar email={user.email ?? ""} locale={locale} />
        <div className="md:pl-64">{children}</div>
      </div>
    </ToastProvider>
  );
}
