import Link from "next/link";
import { redirect } from "next/navigation";
import { currentPlan } from "@/lib/plan";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import { OffresClient } from "./offres-client";

export default async function OffresPage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan,subscription_status")
    .eq("id", user.id)
    .maybeSingle();

  const plan = currentPlan(profile as Pick<Profile, "plan" | "subscription_status"> | null);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex items-center justify-between">
        <Link className="text-sm font-semibold text-muted transition hover:text-ink" href="/facturation">
          ← Voltar
        </Link>
      </div>

      <div className="mt-6 text-center">
        <h1 className="mx-auto max-w-2xl text-2xl font-semibold leading-tight text-ink sm:text-3xl">
          O plano de gestão mais adequado ao seu negócio
        </h1>
        <p className="mt-3 text-sm text-muted">Escolha entre cobrança mensal ou anual. Cancele quando quiser.</p>
      </div>

      <OffresClient currentPlan={plan} />
    </main>
  );
}
