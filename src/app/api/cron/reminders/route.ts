import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { nextUrssafDeadline, periodOptions, sumCategoryTotals, totalCategoryAmount } from "@/lib/accounting";
import { fetchRevenueBookRows } from "@/lib/accounting-data";
import type { Profile } from "@/lib/types";

export const runtime = "nodejs";

type ReminderKind = "urssaf_d7" | "urssaf_d1" | "monthly_summary";

const euroFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR"
});

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("Supabase admin environment is not configured.");
  }

  return createSupabaseClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

function daysUntil(date: string) {
  const today = new Date();
  const target = new Date(`${date}T00:00:00`);
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  return Math.ceil((target.getTime() - today.getTime()) / millisecondsPerDay);
}

function currentDeclarationPeriod(profile: Profile, reference = new Date()) {
  const today = reference.toISOString().slice(0, 10);
  const options = periodOptions(reference.getFullYear(), profile.declaration_periodicite);
  return options.find((period) => today >= period.start && today <= period.end) ?? options[0];
}

async function alreadySentToday(supabase: ReturnType<typeof adminClient>, userId: string, action: string) {
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(`${today}T00:00:00`);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const { data } = await supabase
    .from("audit_log")
    .select("id")
    .eq("user_id", userId)
    .eq("action", action)
    .gte("created_at", `${today}T00:00:00.000Z`)
    .lt("created_at", tomorrow.toISOString())
    .limit(1);

  return Boolean(data?.length);
}

async function sendReminderEmail({
  body,
  email,
  subject
}: {
  body: string;
  email: string;
  subject: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    body: JSON.stringify({
      // Configure EMAIL_FROM (domínio verificado no Resend). Fallback: sandbox (dev).
      from: process.env.EMAIL_FROM ?? "Oracle <onboarding@resend.dev>",
      html: body.replaceAll("\n", "<br />"),
      subject,
      text: body,
      to: [email]
    }),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    method: "POST"
  });

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(payload || "Resend request failed.");
  }
}

async function logReminder(
  supabase: ReturnType<typeof adminClient>,
  profile: Profile,
  kind: ReminderKind,
  payload: Record<string, unknown>
) {
  await supabase.from("audit_log").insert({
    action: `reminder.${kind}`,
    entity: "profiles",
    entity_id: profile.id,
    payload,
    user_id: profile.id
  });
}

function urssafBody(deadline: string, days: number) {
  return `Bonjour,\n\nRappel Oracle: votre prochaine échéance déclarative URSSAF estimée est le ${deadline} (D-${days}).\n\nCe message est informatif et ne constitue pas un conseil fiscal.\n\nCordialement.`;
}

function monthlyBody(total: number) {
  return `Bonjour,\n\nRésumé mensuel Oracle: le CA encaissé du mois précédent enregistré dans votre livre de recettes est de ${euroFormatter.format(total)}.\n\nCe message est informatif et ne constitue pas un conseil fiscal.\n\nCordialement.`;
}

// Lembrete de evento do Diário. Data formatada no fuso de Paris (mercado francês).
const eventDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "full",
  timeStyle: "short",
  timeZone: "Europe/Paris"
});
const eventDayFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "full",
  timeZone: "Europe/Paris"
});

function eventReminderBody(title: string, startsAt: string, allDay: boolean, location: string | null) {
  const when = allDay
    ? eventDayFormatter.format(new Date(startsAt))
    : eventDateFormatter.format(new Date(startsAt));
  const locationLine = location ? `\nLocal: ${location}.` : "";
  return `Olá,\n\nLembrete do seu Diário no Oracle: "${title}" ${allDay ? "é" : "começa"} em ${when}.${locationLine}\n\nEste é um lembrete automático do seu calendário.`;
}

type EventReminderRow = {
  id: string;
  offset_kind: string;
  event: {
    id: string;
    title: string;
    starts_at: string;
    all_day: boolean;
    location: string | null;
    user_id: string;
  } | null;
};

// Processa a fila de lembretes de evento vencidos e ainda não enviados. Usa o
// mesmo Resend dos lembretes fiscais. O flag `sent` garante idempotência entre
// execuções do cron (a cada 5 min).
async function processEventReminders(
  supabase: ReturnType<typeof adminClient>,
  emailsByUserId: Map<string, string>,
  now: Date
): Promise<{ sent: string[]; failed: Array<{ id: string; error: string }> }> {
  const sent: string[] = [];
  const failed: Array<{ id: string; error: string }> = [];

  const { data, error } = await supabase
    .from("event_reminders")
    .select("id, offset_kind, event:events(id, title, starts_at, all_day, location, user_id)")
    .eq("sent", false)
    .eq("channel", "email")
    .lte("scheduled_for", now.toISOString())
    .limit(200);

  if (error) {
    return { sent, failed: [{ id: "query", error: error.message }] };
  }

  for (const row of (data ?? []) as unknown as EventReminderRow[]) {
    const event = row.event;
    if (!event) {
      // Evento apagado: a linha some por cascade, mas se sobrar, marca enviada.
      await supabase.from("event_reminders").update({ sent: true, sent_at: now.toISOString() }).eq("id", row.id);
      continue;
    }

    // Evento já começou: não faz sentido lembrar de algo passado (cron atrasado).
    if (new Date(event.starts_at).getTime() < now.getTime()) {
      await supabase.from("event_reminders").update({ sent: true, sent_at: now.toISOString() }).eq("id", row.id);
      continue;
    }

    const email = emailsByUserId.get(event.user_id);
    if (!email) {
      continue;
    }

    try {
      await sendReminderEmail({
        body: eventReminderBody(event.title, event.starts_at, event.all_day, event.location),
        email,
        subject: `Lembrete: ${event.title}`
      });
      await supabase.from("event_reminders").update({ sent: true, sent_at: now.toISOString() }).eq("id", row.id);
      sent.push(row.id);
    } catch (sendError) {
      failed.push({ id: row.id, error: sendError instanceof Error ? sendError.message : "Unknown error" });
    }
  }

  return { sent, failed };
}

export async function GET(request: NextRequest) {
  const expectedSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");
  const bearerSecret = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : null;
  const receivedSecret =
    request.headers.get("CRON_SECRET") ?? request.headers.get("x-cron-secret") ?? bearerSecret;

  if (!expectedSecret || receivedSecret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = adminClient();
  const { data: profiles, error } = await supabase.from("profiles").select("*");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const users = await supabase.auth.admin.listUsers();
  const emailsByUserId = new Map(
    (users.data.users ?? []).map((user) => [user.id, user.email ?? ""])
  );
  const now = new Date();
  const todayDay = now.getDate();
  const sent: Array<{ kind: ReminderKind; user_id: string }> = [];
  const failed: Array<{ error: string; kind: ReminderKind; user_id: string }> = [];

  for (const profile of (profiles ?? []) as Profile[]) {
    const email = emailsByUserId.get(profile.id);
    if (!email) {
      continue;
    }

    const deadline = nextUrssafDeadline(profile.declaration_periodicite, now);
    const deadlineDays = daysUntil(deadline);
    const reminders: Array<{ body: string; kind: ReminderKind; subject: string }> = [];

    if (deadlineDays === 7) {
      reminders.push({
        body: urssafBody(deadline, deadlineDays),
        kind: "urssaf_d7",
        subject: "Rappel URSSAF D-7"
      });
    }

    if (deadlineDays === 1) {
      reminders.push({
        body: urssafBody(deadline, deadlineDays),
        kind: "urssaf_d1",
        subject: "Rappel URSSAF D-1"
      });
    }

    if (profile.monthly_summary_email && todayDay === 1) {
      const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const period = periodOptions(previousMonth.getFullYear(), "mensal")[previousMonth.getMonth()];
      const rows = await fetchRevenueBookRows(supabase, {
        end: period.end,
        start: period.start,
        userId: profile.id
      });
      const total = totalCategoryAmount(sumCategoryTotals(rows));

      reminders.push({
        body: monthlyBody(total),
        kind: "monthly_summary",
        subject: "Résumé mensuel Oracle"
      });
    }

    for (const reminder of reminders) {
      const action = `reminder.${reminder.kind}`;
      if (await alreadySentToday(supabase, profile.id, action)) {
        continue;
      }

      try {
        await sendReminderEmail({ body: reminder.body, email, subject: reminder.subject });
        await logReminder(supabase, profile, reminder.kind, {
          deadline,
          email,
          period: currentDeclarationPeriod(profile, now).label
        });
        sent.push({ kind: reminder.kind, user_id: profile.id });
      } catch (sendError) {
        failed.push({
          error: sendError instanceof Error ? sendError.message : "Unknown error",
          kind: reminder.kind,
          user_id: profile.id
        });
      }
    }
  }

  const events = await processEventReminders(supabase, emailsByUserId, now);

  return NextResponse.json({ failed, sent, events });
}
