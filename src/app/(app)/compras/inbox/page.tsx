import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { PurchaseIncoming } from "../types";
import { InboxClient } from "./inbox-client";

export default async function InboxPage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data } = await supabase
    .from("purchase_incoming")
    .select("*")
    .order("created_at", { ascending: false });

  return <InboxClient initialItems={(data ?? []) as PurchaseIncoming[]} userId={user.id} />;
}
