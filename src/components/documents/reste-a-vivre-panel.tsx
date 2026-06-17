import { calculateResteAVivre, type TotalsByCategory } from "@/lib/document-calculations";
import { categoryLabels, type Profile } from "@/lib/types";

type ResteAVivrePanelProps = {
  byCategory: TotalsByCategory;
  profile: Profile | null;
};

const euroFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "EUR"
});

export function ResteAVivrePanel({ byCategory, profile }: ResteAVivrePanelProps) {
  const rows = calculateResteAVivre(byCategory, profile);
  const totalDocument = rows.reduce((sum, row) => sum + row.total, 0);
  const totalDeductions = rows.reduce((sum, row) => sum + row.deductions, 0);
  const totalNet = rows.reduce((sum, row) => sum + row.net, 0);

  return (
    <aside className="rounded-lg border border-line bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-brand">Reste à vivre</p>
      <h2 className="mt-2 text-lg font-semibold text-ink">Estimativa informativa</h2>
      <div className="mt-4 space-y-4">
        {rows.length > 0 ? (
          rows.map((row) => (
            <div className="rounded-md border border-line p-3 text-sm" key={row.category}>
              <p className="font-semibold text-ink">{categoryLabels[row.category]}</p>
              <div className="mt-2 space-y-1 text-muted">
                <p>Documento: {euroFormatter.format(row.total)}</p>
                <p>Cotisations: {euroFormatter.format(row.cotisations)}</p>
                {profile?.versement_liberatoire ? (
                  <p>Versement libératoire: {euroFormatter.format(row.versementLiberatoire)}</p>
                ) : null}
                <p className="font-semibold text-ink">Net estimado: {euroFormatter.format(row.net)}</p>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted">Adicione linhas para ver a estimativa.</p>
        )}
      </div>
      <div className="mt-4 border-t border-line pt-4 text-sm">
        <p>Total documento: {euroFormatter.format(totalDocument)}</p>
        <p>Estimativa de encargos: {euroFormatter.format(totalDeductions)}</p>
        <p className="font-semibold">Net estimado: {euroFormatter.format(totalNet)}</p>
      </div>
      <p className="mt-4 text-xs leading-5 text-muted">
        Estimation indicative, ne constitue pas un conseil fiscal.
      </p>
    </aside>
  );
}
