const shortDate = new Intl.DateTimeFormat("es-VE", {
  day: "numeric",
  month: "short",
  year: "numeric",
});
const longDate = new Intl.DateTimeFormat("es-VE", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});
const timeShort = new Intl.DateTimeFormat("es-VE", {
  hour: "numeric",
  minute: "2-digit",
});

/** Lee YYYY-MM-DD como fecha local (new Date("YYYY-MM-DD") la lee en UTC). */
function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Quita los puntos de las abreviaturas ("nov." -> "nov"). */
function stripDots(text: string): string {
  return text.replace(/\./g, "");
}

function shortDateOf(date: Date): string {
  return stripDots(shortDate.format(date)).replace(/ de /g, " ");
}

export function formatShortDate(iso: string): string {
  return shortDateOf(parseLocalDate(iso));
}

export function formatLongDate(iso: string): string {
  return longDate.format(parseLocalDate(iso));
}

/** Para "Registrada el…"; recibe un instante ISO con zona horaria. */
export function formatDateTimeShort(iso: string): string {
  const date = new Date(iso);
  return `${shortDateOf(date)}, ${timeShort.format(date)}`;
}
