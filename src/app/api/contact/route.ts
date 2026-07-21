import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";

// Formulário público "Falar com especialistas" (Gestão completa). Envia um
// email para a equipe via Resend. Rota pública (visitante deslogado), então
// NÃO toca no banco nem exige auth. A API key nunca sai do servidor. Sem
// Resend configurado, responde sent:false sem quebrar o fluxo do usuário.
const DEFAULT_NOTIFY_EMAIL = "gestion@profrance-services.fr";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

const tipoLabels: Record<string, string> = {
  ae: "Gestão completa para AE (auto-entrepreneur)",
  btp: "Gestão completa para BTP"
};

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    nome?: string;
    empresa?: string;
    email?: string;
    telefone?: string;
    tipo?: string;
    mensagem?: string;
  };

  const nome = (body.nome ?? "").toString().slice(0, 200).trim();
  const empresa = (body.empresa ?? "").toString().slice(0, 200).trim();
  const email = (body.email ?? "").toString().slice(0, 200).trim();
  const telefone = (body.telefone ?? "").toString().slice(0, 60).trim();
  const tipo = (body.tipo ?? "").toString().trim();
  const mensagem = (body.mensagem ?? "").toString().slice(0, 3000).trim();

  if (!nome || !email || !telefone) {
    return NextResponse.json({ error: "Preencha nome, email e telefone." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Email inválido." }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    // Resend ausente: não é erro de UX. Mostramos sucesso "recebido" no cliente.
    return NextResponse.json({ sent: false, reason: "email_not_configured" });
  }

  const to = process.env.CONTACT_NOTIFY_EMAIL ?? process.env.ADVISOR_NOTIFY_EMAIL ?? DEFAULT_NOTIFY_EMAIL;
  const from = process.env.EMAIL_FROM ?? "Oracle <onboarding@resend.dev>";
  const tipoLabel = tipoLabels[tipo] ?? "Não especificado";

  const text = `Novo pedido de contato — Gestão completa.

Nome: ${nome}
Empresa: ${empresa || "não informada"}
Email: ${email}
Telefone: ${telefone}
Interesse: ${tipoLabel}

Mensagem:
${mensagem || "(sem mensagem)"}`;

  const html = `<p><strong>Novo pedido de contato — Gestão completa.</strong></p>
<p><strong>Nome:</strong> ${escapeHtml(nome)}</p>
<p><strong>Empresa:</strong> ${escapeHtml(empresa || "não informada")}</p>
<p><strong>Email:</strong> ${escapeHtml(email)}</p>
<p><strong>Telefone:</strong> ${escapeHtml(telefone)}</p>
<p><strong>Interesse:</strong> ${escapeHtml(tipoLabel)}</p>
<p><strong>Mensagem:</strong><br />${escapeHtml(mensagem || "(sem mensagem)").replaceAll("\n", "<br />")}</p>`;

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
        reply_to: email,
        subject: `Gestão completa — pedido de contato de ${nome}`,
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
