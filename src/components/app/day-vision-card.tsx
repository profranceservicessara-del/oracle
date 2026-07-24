import type { ReactNode } from "react";

// Card "visão do dia": um painel navy com a data, um placar de estado (crítico /
// atenção / bom / neutro) e uma faixa de estatísticas. Genérico, dirigido por
// props. Segue o navy chapado dos heros do sistema (#00153A).

export type DayVisionScore = "critical" | "warning" | "good" | "neutral";

export type DayVisionStat = {
  label: string;
  value: string;
  /** Classe de cor do valor (ex.: "text-sky-300"). Default: branco. */
  valueClass?: string;
  /** Adiciona um divisor à esquerda, separando visualmente do stat anterior. */
  padded?: boolean;
};

export type DayVisionCardProps = {
  dateLabel: string;
  score: DayVisionScore;
  scoreLabel: string;
  stats: DayVisionStat[];
  /** Conteúdo extra opcional no rodapé do card. */
  children?: ReactNode;
};

// Cor do placar. Cada estado tem um par pastel (fundo translúcido + texto claro)
// que lê bem sobre o navy.
const SCORE_STYLES: Record<DayVisionScore, { badge: string; dot: string; label: string }> = {
  critical: { badge: "bg-rose-500/15 text-rose-200 ring-rose-400/30", dot: "bg-rose-400", label: "Crítico" },
  warning: { badge: "bg-amber-400/15 text-amber-200 ring-amber-300/30", dot: "bg-amber-300", label: "Atenção" },
  good: { badge: "bg-emerald-500/15 text-emerald-200 ring-emerald-400/30", dot: "bg-emerald-300", label: "Em dia" },
  neutral: { badge: "bg-white/10 text-white/80 ring-white/20", dot: "bg-white/60", label: "Neutro" }
};

export function DayVisionCard({ dateLabel, score, scoreLabel, stats, children }: DayVisionCardProps) {
  const tone = SCORE_STYLES[score];

  return (
    <section className="overflow-hidden rounded bg-[#00153A] px-6 py-6 text-white shadow-[0_22px_55px_-26px_rgba(2,10,35,0.85)] ring-1 ring-inset ring-white/12 [box-shadow:inset_0_1px_0_rgba(255,255,255,0.10)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-white/55">{dateLabel}</p>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${tone.badge}`}
        >
          <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
          {scoreLabel}
        </span>
      </div>

      <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-4">
        {stats.map((stat, index) => (
          <div
            className={stat.padded ? "border-l border-white/15 pl-6" : ""}
            key={`${stat.label}-${index}`}
          >
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-white/50">{stat.label}</dt>
            <dd className={`mt-1 text-2xl font-semibold tabular-nums ${stat.valueClass ?? "text-white"}`}>
              {stat.value}
            </dd>
          </div>
        ))}
      </dl>

      {children ? <div className="mt-5 border-t border-white/10 pt-4 text-sm text-white/75">{children}</div> : null}
    </section>
  );
}
