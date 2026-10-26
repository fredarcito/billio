// Utilidades de fechas y formato compartidas entre cliente y servidor

export const MONTHS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

// Devuelve el nombre del mes (1-12) en español
export function monthName(month) {
  return MONTHS[Number(month) - 1] || "";
}

// Formatea un importe con su moneda (ISO 4217, ej. EUR, USD, MXN)
export function formatMoney(amount, currency = "EUR") {
  const value = Number(amount) || 0;
  try {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: currency || "EUR",
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}

// Formatea una fecha ISO en formato legible
export function formatDate(iso) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

// Periodo actual según la zona horaria del cron (UTC)
export function currentPeriod(date = new Date()) {
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
}

// Periodo que corresponde facturar en la fecha dada, según el día de envío elegido.
// Si el día de envío es el 1, se factura el mes en curso; si es posterior, todavía no
// ha llegado el momento de facturar este mes y se factura el anterior.
export function periodForSendDay(sendDay, date = new Date()) {
  const day = Math.min(Math.max(Number(sendDay) || 1, 1), 28);
  const { year, month } = currentPeriod(date);
  if (day === 1) return { year, month };
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
}

// Próxima fecha de envío a partir de hoy (para mostrarla en la interfaz)
export function nextSendDate(sendDay, date = new Date()) {
  const day = Math.min(Math.max(Number(sendDay) || 1, 1), 28);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const today = date.getUTCDate();
  // Si el día de este mes ya pasó, la próxima es el mes que viene
  const target = today < day ? new Date(Date.UTC(year, month, day)) : new Date(Date.UTC(year, month + 1, day));
  return target;
}

// Lista de periodos seleccionables (meses del año en curso y anterior)
export function selectablePeriods(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const periods = [];
  for (let y = year; y >= year - 1; y--) {
    const maxMonth = y === year ? month : 12;
    for (let m = maxMonth; m >= 1; m--) {
      periods.push({ year: y, month: m, label: `${MONTHS[m - 1]} ${y}` });
    }
  }
  return periods;
}
