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
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
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
