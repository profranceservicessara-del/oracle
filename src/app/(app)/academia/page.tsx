import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AcademiaClient } from "./academia-client";

export default async function AcademiaPage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return <AcademiaClient />;
}
