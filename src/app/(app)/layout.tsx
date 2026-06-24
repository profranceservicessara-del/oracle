import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/app/app-sidebar";
import { ToastProvider } from "@/components/ui/toast";
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

  return (
    <ToastProvider>
      <div className="min-h-screen bg-[#F7F8FC]">
        <AppSidebar email={user.email ?? ""} />
        <div className="md:pl-64">{children}</div>
      </div>
    </ToastProvider>
  );
}
