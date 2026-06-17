import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/app/logout-button";
import { NavLinks } from "@/components/app/nav-links";
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
        <header className="sticky top-0 z-30 border-b border-line bg-white/80 backdrop-blur">
          <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-lg font-semibold text-ink">ProFacture</p>
              <p className="text-sm text-muted">{user.email}</p>
            </div>
            <nav className="flex flex-wrap items-center gap-2 text-sm">
              <NavLinks />
              <LogoutButton />
            </nav>
          </div>
        </header>
        {children}
      </div>
    </ToastProvider>
  );
}
