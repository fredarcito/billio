// Utilidades de las líneas de factura (facturación por horas). Sin dependencias: las usan
// el servidor (API, PDF, cron) y se pueden probar de forma aislada.

// Redondeo a céntimos, para no arrastrar errores de coma flotante en los importes
export const roundMoney = (value) => Math.round((Number(value) || 0) * 100) / 100;

// Importe de una línea: cantidad × precio
export const lineAmount = (item) =>
  roundMoney(Number(item.quantity) * Number(item.unitPrice));

// Total de una factura a partir de sus líneas
export const itemsTotal = (items) =>
  roundMoney((items || []).reduce((sum, item) => sum + lineAmount(item), 0));

// Resumen de conceptos para la columna `description` (historial, asunto del correo, PDF antiguo)
export function summarizeItems(items) {
  if (!items || items.length === 0) return "";
  if (items.length === 1) return items[0].description;
  return `${items[0].description} y ${items.length - 1} concepto${items.length === 2 ? "" : "s"} más`;
}

// Valida y normaliza las líneas que llegan del cliente. El importe se recalcula siempre aquí:
// el cliente nunca decide cuánto se factura.
export function normalizeItems(rawItems) {
  if (!Array.isArray(rawItems)) return [];
  return rawItems
    .map((item) => {
      const quantity = Number(item?.quantity);
      const rawPrice = Number(item?.unitPrice);
      const unitPrice = Number.isFinite(rawPrice) && rawPrice >= 0 ? roundMoney(rawPrice) : 0;
      return {
        description: String(item?.description || "").trim().slice(0, 200),
        quantity: roundMoney(quantity),
        unitPrice,
        amount: roundMoney(quantity * unitPrice),
      };
    })
    .filter((item) => item.description && Number.isFinite(item.quantity) && item.quantity > 0);
}
