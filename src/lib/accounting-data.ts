import {
  allocatePaymentByCategory,
  type RevenueBookRow
} from "@/lib/accounting";
import { paymentMethodLabels, type Client, type Document, type DocumentLine, type Payment } from "@/lib/types";

type SupabaseLike = {
  from: (table: string) => any;
};

function clientName(client: Client | undefined) {
  if (!client) {
    return "Client non renseigné";
  }

  return client.type === "professionnel" ? client.raison_sociale ?? "" : client.nom ?? "";
}

export async function fetchRevenueBookRows(
  supabase: SupabaseLike,
  options: { end?: string; start?: string; userId?: string } = {}
) {
  let paymentsQuery = supabase
    .from("payments")
    .select("*")
    .order("date_encaissement", { ascending: true });

  if (options.userId) {
    paymentsQuery = paymentsQuery.eq("user_id", options.userId);
  }

  if (options.start) {
    paymentsQuery = paymentsQuery.gte("date_encaissement", options.start);
  }

  if (options.end) {
    paymentsQuery = paymentsQuery.lte("date_encaissement", options.end);
  }

  const { data: payments } = await paymentsQuery;
  const typedPayments = (payments ?? []) as Payment[];
  const documentIds = [...new Set(typedPayments.map((payment) => payment.document_id))];

  if (documentIds.length === 0) {
    return [];
  }

  const [{ data: documents }, { data: lines }] = await Promise.all([
    supabase.from("documents").select("*").in("id", documentIds),
    supabase.from("document_lines").select("*").in("document_id", documentIds)
  ]);

  const typedDocuments = (documents ?? []) as Document[];
  const clientIds = [
    ...new Set(typedDocuments.map((document) => document.client_id).filter(Boolean) as string[])
  ];
  const { data: clients } =
    clientIds.length > 0
      ? await supabase.from("clients").select("*").in("id", clientIds)
      : { data: [] };

  const documentsById = new Map(typedDocuments.map((document) => [document.id, document]));
  const clientsById = new Map(((clients ?? []) as Client[]).map((client) => [client.id, client]));
  const linesByDocument = ((lines ?? []) as DocumentLine[]).reduce((map, line) => {
    const current = map.get(line.document_id) ?? [];
    current.push(line);
    map.set(line.document_id, current);
    return map;
  }, new Map<string, DocumentLine[]>());

  const rows: RevenueBookRow[] = [];

  typedPayments.forEach((payment) => {
    const document = documentsById.get(payment.document_id);
    if (!document) {
      return;
    }

    const allocation = allocatePaymentByCategory(
      Number(payment.montant),
      document,
      linesByDocument.get(document.id) ?? []
    );

    Object.entries(allocation).forEach(([category, montant]) => {
      if (montant === 0) {
        return;
      }

      rows.push({
        id: `${payment.id}-${category}`,
        date: payment.date_encaissement,
        documentId: document.id,
        numero: document.numero ?? "Sans numéro",
        clientName: clientName(document.client_id ? clientsById.get(document.client_id) : undefined),
        category: category as RevenueBookRow["category"],
        montant,
        moyen: paymentMethodLabels[payment.moyen]
      });
    });
  });

  return rows.sort((a, b) => a.date.localeCompare(b.date));
}

export function csvResponse(filename: string, rows: string[][]) {
  const csv = rows
    .map((row) =>
      row
        .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
        .join(",")
    )
    .join("\n");

  return new Response(csv, {
    headers: {
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Type": "text/csv; charset=utf-8"
    }
  });
}
