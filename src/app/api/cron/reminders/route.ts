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
      from: "Oracle <onboarding@resend.dev>",
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

  return NextResponse.json({ failed, sent });
}
