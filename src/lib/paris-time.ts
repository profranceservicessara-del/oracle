// Conversões entre instantes e o relógio de parede de Paris.
//
// O servidor da Vercel roda em UTC. Conta de calendário com setDate/setHours
// locais faz a hora de parede de Paris deslocar 1h a cada mudança de horário de
// verão e erra o dia perto da meia-noite. Aqui a conta é feita no "relógio de
// parede codificado como UTC" (wall-ms), onde não existe horário de verão, e o
// instante real só é calculado no fim.

const TIME_ZONE = "Europe/Paris";

// hourCycle h23 evita "24:00" à meia-noite; en-CA dá partes numéricas simples.
const partsFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit"
});

function wallParts(instant: Date) {
  const values: Record<string, number> = {};
  for (const part of partsFormatter.formatToParts(instant)) {
    if (part.type !== "literal") values[part.type] = Number(part.value);
  }
  return values;
}

/** Relógio de parede de Paris no instante dado, codificado como ms UTC (sem milissegundos). */
export function parisWallAsUtcMs(instant: Date): number {
  const p = wallParts(instant);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
}

// Diferença entre Paris e UTC no instante (ms): +1h no inverno, +2h no verão.
function parisOffsetMs(instantMs: number): number {
  return parisWallAsUtcMs(new Date(instantMs)) - Math.floor(instantMs / 1000) * 1000;
}

/**
 * Instante real de um horário de parede de Paris (codificado como ms UTC).
 * Duas passadas corrigem o deslocamento perto da troca de horário. Horário que
 * não existe (pulo de primavera) avança para depois do pulo; horário repetido
 * (volta do outono) usa a segunda ocorrência.
 */
export function parisWallToInstant(wallMs: number): Date {
  const firstGuess = wallMs - parisOffsetMs(wallMs);
  return new Date(wallMs - parisOffsetMs(firstGuess));
}

/**
 * Meia-noite de Paris do dia de calendário que o Date representa pelos seus
 * componentes locais (ano, mês, dia). Serve para transformar um Date criado com
 * new Date(y, m, d) no servidor no início do dia em Paris.
 */
export function parisStartOfDay(calendarDate: Date): Date {
  return parisWallToInstant(
    Date.UTC(calendarDate.getFullYear(), calendarDate.getMonth(), calendarDate.getDate(), 0, 0, 0)
  );
}

/** Último instante do dia em Paris (23:59:59.999) do dia de calendário do Date. */
export function parisEndOfDay(calendarDate: Date): Date {
  const end = parisWallToInstant(
    Date.UTC(calendarDate.getFullYear(), calendarDate.getMonth(), calendarDate.getDate(), 23, 59, 59)
  );
  return new Date(end.getTime() + 999);
}
