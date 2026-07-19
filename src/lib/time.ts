// Utilitário central de duração (Gestão do tempo). Minutos internamente,
// formatação "H:MM" na UI. Evita erro de float de horas.

export const QUICK_DURATIONS: Array<{ label: string; minutes: number }> = [
  { label: "15 minutos", minutes: 15 },
  { label: "30 minutos", minutes: 30 },
  { label: "1 hora", minutes: 60 },
  { label: "1 hora e 30 minutos", minutes: 90 }
];

export const TIME_ENTRY_TYPES: Array<{ value: string; label: string }> = [
  { value: "trabalho", label: "Trabalho" },
  { value: "reuniao", label: "Reunião" },
  { value: "deslocamento", label: "Deslocamento" },
  { value: "administracao", label: "Administração" },
  { value: "pausa", label: "Pausa" }
];

export function typeLabel(value: string | null | undefined): string {
  return TIME_ENTRY_TYPES.find((t) => t.value === value)?.label ?? "—";
}

// Minutos → "H:MM" (ex.: 90 → "1:30"). Negativo prefixado com "-".
export function minutesToHM(minutes: number): string {
  const sign = minutes < 0 ? "-" : "";
  const abs = Math.abs(Math.round(minutes));
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${sign}${h}:${String(m).padStart(2, "0")}`;
}

// "H:MM" | "H" | "1h30" → minutos. Inválido → 0. Nunca negativo.
export function parseHM(value: string): number {
  const v = value.trim();
  if (!v) return 0;
  const colon = v.match(/^(\d{1,3}):([0-5]?\d)$/);
  if (colon) return Math.max(0, Number(colon[1]) * 60 + Number(colon[2]));
  const hm = v.match(/^(\d{1,3})h(\d{1,2})?$/i);
  if (hm) return Math.max(0, Number(hm[1]) * 60 + Number(hm[2] ?? 0));
  const num = Number(v.replace(",", "."));
  if (Number.isFinite(num) && num >= 0) return Math.round(num * 60);
  return 0;
}

export function sumMinutes(values: number[]): number {
  return values.reduce((s, v) => s + (Number.isFinite(v) ? v : 0), 0);
}

// Diferença HH:MM entre start/end no mesmo dia (end > start). Fora de ordem → 0.
export function rangeMinutes(start: string | null, end: string | null): number {
  if (!start || !end) return 0;
  const toMin = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return (h || 0) * 60 + (m || 0);
  };
  const d = toMin(end) - toMin(start);
  return d > 0 ? d : 0;
}
