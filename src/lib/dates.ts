// Datas como YYYY-MM-DD sem depender do fuso do processo.
//
// toISOString().slice(0, 10) converte para UTC. Na França (UTC+1/+2) isso recua
// um dia quando o Date local é meia-noite (filtros de período saíam errados no
// browser) e, no servidor da Vercel (UTC), deixa o "hoje" 1 a 2 horas atrasado
// em relação a Paris.

const PARIS_TZ = "Europe/Paris";

// en-CA formata como YYYY-MM-DD.
const parisFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: PARIS_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
});

/** Componentes locais do Date (fuso do processo) como YYYY-MM-DD. Use no browser. */
export function toLocalIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Hoje no fuso local. Chame no momento do uso, nunca em constante de módulo (congela no load). */
export function todayLocalIso(): string {
  return toLocalIsoDate(new Date());
}

/** O instante dado, visto no calendário de Paris, como YYYY-MM-DD. Use no servidor. */
export function toParisIsoDate(date: Date): string {
  return parisFormatter.format(date);
}

/** Hoje em Paris. Use no servidor, onde o fuso do processo é UTC. */
export function todayParisIso(): string {
  return toParisIsoDate(new Date());
}
