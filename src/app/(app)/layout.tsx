import { redirect } from "next/navigation";
import Link from "next/link";
import { LogoutButton } from "@/components/app/logout-button";
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
      <div className="min-h-screen bg-slate-50">
        <header className="border-b border-line bg-white">
          <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-lg font-semibold text-ink">ProFacture</p>
              <p className="text-sm text-muted">{user.email}</p>
            </div>
            <nav className="flex flex-wrap items-center gap-2 text-sm">
              <Link className="rounded-md px-3 py-2 font-medium text-muted hover:bg-slate-100 hover:text-ink" href="/dashboard">
                Dashboard
              </Link>
              <Link className="rounded-md px-3 py-2 font-medium text-muted hover:bg-slate-100 hover:text-ink" href="/documentos">
                Documentos
              </Link>
              <Link className="rounded-md px-3 py-2 font-medium text-muted hover:bg-slate-100 hover:text-ink" href="/clientes">
                Clientes
              </Link>
              <Link className="rounded-md px-3 py-2 font-medium text-muted hover:bg-slate-100 hover:text-ink" href="/catalogo">
                Catálogo
              </Link>
              <Link className="rounded-md px-3 py-2 font-medium text-muted hover:bg-slate-100 hover:text-ink" href="/configuracoes/perfil">
                Perfil fiscal
              </Link>
              <Link className="rounded-md px-3 py-2 font-medium text-muted hover:bg-slate-100 hover:text-ink" href="/configuracoes/dados">
                Dados
              </Link>
              <LogoutButton />
            </nav>
          </div>
        </header>
        {children}
      </div>
    </ToastProvider>
  );
}
