"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/toast";

// Reusa o MESMO endpoint do /configuracoes/pagamentos: POST /api/stripe/checkout
// {plan} -> {url}. O preço cobrado é o do Stripe (STRIPE_PRICE_*), não o texto
// exibido. Nenhum segredo no client.
export function PlanCta({ plan, label, className }: { plan: "pro" | "premium"; label: string; className: string }) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  async function start() {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan })
      });
      const data = (await res.json().catch(() => null)) as { url?: string; error?: string } | null;
      if (!res.ok || !data?.url) {
        setLoading(false);
        showToast(data?.error ?? "Não foi possível abrir o pagamento.", "error");
        return;
      }
      window.location.href = data.url;
    } catch {
      setLoading(false);
      showToast("Não foi possível abrir o pagamento.", "error");
    }
  }

  return (
    <button className={className} disabled={loading} onClick={() => void start()} type="button">
      {loading ? "Abrindo pagamento…" : label}
    </button>
  );
}
