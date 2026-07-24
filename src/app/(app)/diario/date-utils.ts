// Helpers de data do módulo Diário. Tudo em horário local do navegador/servidor;
// o banco guarda timestamptz e devolve ISO string.
// A semana começa na segunda (convenção francesa), o que também deixa o número
// da semana exato (ISO 8601).

import type { RecurrenceRule } from "@/lib/recurrence";
import { MONTH_NAMES, type DiarioMode, type DiarioView, type EventRecurrence } from "./types";

export function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function endOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function addMonths(date: Date, months: number): Date {
  const next = new Date(date);
  next.setDate(1);
  next.setMonth(next.getMonth() + months);
  const daysInMonth = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(date.getDate(), daysInMonth));
  return next;
}

export function addYears(date: Date, years: number): Date {
  return addMonths(date, years * 12);
}

/** Segunda-feira da semana da data informada. */
export function startOfWeek(date: Date): Date {
  const next = startOfDay(date);
  const offset = (next.getDay() + 6) % 7; // 0 = segunda
  return addDays(next, -offset);
}

export function startOfMonth(date: Date): Date {
  return startOfDay(new Date(date.getFullYear(), date.getMonth(), 1));
}

export function endOfMonth(date: Date): Date {
  return endOfDay(new Date(date.getFullYear(), date.getMonth() + 1, 0));
}

export function startOfYear(date: Date): Date {
  return startOfDay(new Date(date.getFullYear(), 0, 1));
}

export function endOfYear(date: Date): Date {
  return endOfDay(new Date(date.getFullYear(), 11, 31));
}

export function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  );
}

/** YYYY-MM-DD em horário local (não usa toISOString, que desloca o fuso). */
export function isoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function parseIsoDate(value: string | undefined | null): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(year, month - 1, day);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** HH:mm local, para input type="time". */
export function timeValue(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function combineDateTime(dateValue: string, timeValueStr: string): Date {
  const base = parseIsoDate(dateValue) ?? new Date();
  const [hours, minutes] = timeValueStr.split(":").map(Number);
  const next = new Date(base);
  next.setHours(Number.isFinite(hours) ? hours : 0, Number.isFinite(minutes) ? minutes : 0, 0, 0);
  return next;
}

/** Número da semana ISO 8601 (semana da quinta-feira). */
export function isoWeekNumber(date: Date): number {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNumber = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNumber);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  return Math.ceil(((target.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/** 42 dias (6 semanas) cobrindo o mês, começando na segunda. */
export function monthGrid(anchor: Date): Date[] {
  const gridStart = startOfWeek(startOfMonth(anchor));
  return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
}

/** Intervalo carregado do banco para um par (âncora, visão). */
export function rangeFor(anchor: Date, view: DiarioView, mode: DiarioMode): { from: Date; to: Date } {
  if (view === "day") {
    return { from: startOfDay(anchor), to: endOfDay(anchor) };
  }
  if (view === "week") {
    const from = startOfWeek(anchor);
    return { from, to: endOfDay(addDays(from, 6)) };
  }
  if (view === "year") {
    return { from: startOfYear(anchor), to: endOfYear(anchor) };
  }
  if (mode === "calendar") {
    const cells = monthGrid(anchor);
    return { from: startOfDay(cells[0]), to: endOfDay(cells[cells.length - 1]) };
  }
  return { from: startOfMonth(anchor), to: endOfMonth(anchor) };
}

export function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function fmtDayLong(date: Date): string {
  return date.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
}

export function periodLabel(anchor: Date, view: DiarioView): string {
  if (view === "day") {
    return fmtDayLong(anchor);
  }
  if (view === "week") {
    const from = startOfWeek(anchor);
    const to = addDays(from, 6);
    const sameMonth = from.getMonth() === to.getMonth();
    const left = sameMonth ? String(from.getDate()) : `${from.getDate()} de ${MONTH_NAMES[from.getMonth()]}`;
    return `${left} a ${to.getDate()} de ${MONTH_NAMES[to.getMonth()]} de ${to.getFullYear()}`;
  }
  if (view === "year") {
    return String(anchor.getFullYear());
  }
  return `${MONTH_NAMES[anchor.getMonth()]} de ${anchor.getFullYear()}`;
}

/** Converte a linha do banco para a regra que o helper de recorrência entende. */
export function toRecurrenceRule(row: EventRecurrence): RecurrenceRule {
  return {
    frequency: row.frequency,
    repeatEvery: row.repeat_every,
    byWeekday: row.by_weekday && row.by_weekday.length > 0 ? row.by_weekday : null,
    endType: row.end_type,
    occurrenceCount: row.occurrence_count,
    until: row.until
  };
}
