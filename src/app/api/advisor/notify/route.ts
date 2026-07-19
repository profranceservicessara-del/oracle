import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Notificação por email de novas mensagens do "Meu Conselheiro". Chamada pelo
// client após o insert em advisor_requests (best-effort — não bloqueia o envio).
// Destinatário configurável por ADVISOR_NOTIFY_EMAIL (default: caixa da equipe).
// A API key do Resend nunca sai do servidor. Sem Resend configurado, apenas
// responde sent:false (o fluxo do cliente continua normal).
const DEFAULT_NOTIFY_EMAIL = "gestion@profrance-services.fr";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    // Resend ausente: não é erro — o fluxo do cliente já gravou a solicitação.
    return NextResponse.json({ sent: false, reason: "email_not_configured" });
  }

  const body = (await request.json().catch(() => ({}))) as { message?: string };
  const message = (body.message ?? "").toString().slice(0, 5000).trim();
  if (!message) {
    return NextResponse.json({ error: "Mensagem vazia." }, { status: 400 });
  }

  const to = process.env.ADVISOR_NOTIFY_EMAIL ?? DEFAULT_NOTIFY_EMAIL;
  const from = process.env.EMAIL_FROM ?? "Oracle <onboarding@resend.dev>";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin;
  const clientEmail = user.email ?? "cliente sem email";
  const panelUrl = `${appUrl}/admin/conselheiro`;

  const text = `Nova mensagem no Meu Conselheiro.

Cliente: ${clientEmail}

Mensagem:
${message}

Responder no painel: ${panelUrl}`;

  const html = `<p><strong>Nova mensagem no Meu Conselheiro.</strong></p>
<p><strong>Cliente:</strong> ${escapeHtml(clientEmail)}</p>
<p><strong>Mensagem:</strong><br />${escapeHtml(message).replaceAll("\n", "<br />")}</p>
<p><a href="${panelUrl}">Responder no painel</a></p>`;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: user.email ?? undefined,
        subject: `Meu Conselheiro — nova mensagem de ${clientEmail}`,
        text,
        html
      })
    });
    if (!response.ok) {
      return NextResponse.json({ sent: false }, { status: 502 });
    }
    return NextResponse.json({ sent: true });
  } catch {
    return NextResponse.json({ sent: false }, { status: 502 });
  }
}
