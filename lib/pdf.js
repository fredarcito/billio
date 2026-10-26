import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

import { formatMoney, monthName } from "@/lib/format";

// Genera el PDF de una factura usando pdf-lib (fuentes estándar, sin assets externos)
export async function generateInvoicePdf(invoice) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]); // A4 en puntos
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const { width, height } = page.getSize();
  const margin = 50;
  const primary = rgb(0.13, 0.35, 0.85);
  const dark = rgb(0.1, 0.1, 0.12);
  const gray = rgb(0.42, 0.45, 0.5);
  const light = rgb(0.93, 0.95, 0.98);

  const text = (str, x, y, { size = 11, font: f = font, color = dark } = {}) => {
    page.drawText(String(str ?? ""), { x, y, size, font: f, color });
  };

  // Cabecera
  page.drawRectangle({ x: 0, y: height - 120, width, height: 120, color: primary });
  text("FACTURA", margin, height - 70, { size: 26, font: bold, color: rgb(1, 1, 1) });
  text(`Nº ${invoice.number}`, margin, height - 95, {
    size: 11,
    color: rgb(0.85, 0.9, 1),
  });
  const issuer = invoice.issuerName || "Billio";
  text(issuer, width - margin - bold.widthOfTextAtSize(issuer, 14), height - 70, {
    size: 14,
    font: bold,
    color: rgb(1, 1, 1),
  });

  // Datos del emisor y del destinatario
  let y = height - 170;
  text("EMISOR", margin, y, { size: 9, font: bold, color: gray });
  text("DESTINATARIO", width / 2, y, { size: 9, font: bold, color: gray });
  y -= 18;
  text(issuer, margin, y, { size: 12, font: bold });
  // Contacto del emisor: es a donde llegan las respuestas del correo
  if (invoice.replyToEmail) {
    text(invoice.replyToEmail, margin, y - 16, { size: 10, color: gray });
  }

  // Destinatario: nombre (si lo hay), NIF y email, uno debajo de otro
  const recipientLines = [];
  if (invoice.recipientName) {
    recipientLines.push({ value: invoice.recipientName, size: 12, font: bold });
  }
  if (invoice.recipientTaxId) {
    recipientLines.push({ value: `NIF/CIF: ${invoice.recipientTaxId}`, size: 10, color: gray });
  }
  recipientLines.push({ value: invoice.recipientEmail, size: 10, color: gray });
  recipientLines.forEach((line, index) => {
    text(line.value, width / 2, y - index * 16, {
      size: line.size,
      font: line.font || font,
      color: line.color || dark,
    });
  });

  // Metadatos (se dejan 3 líneas libres para el bloque del destinatario)
  y -= Math.max(50, 18 + recipientLines.length * 16 + 16);
  text("Fecha de emisión", margin, y, { size: 9, font: bold, color: gray });
  text("Periodo facturado", width / 2, y, { size: 9, font: bold, color: gray });
  y -= 18;
  text(
    new Intl.DateTimeFormat("es-ES", { dateStyle: "long" }).format(new Date(invoice.issuedAt)),
    margin,
    y,
    { size: 11 }
  );
  text(`${monthName(invoice.month)} ${invoice.year}`, width / 2, y, { size: 11 });

  // Tabla de conceptos
  y -= 60;
  page.drawRectangle({ x: margin, y: y - 6, width: width - margin * 2, height: 26, color: light });
  text("CONCEPTO", margin + 10, y + 2, { size: 9, font: bold, color: gray });
  const amountLabel = "IMPORTE";
  text(amountLabel, width - margin - 10 - bold.widthOfTextAtSize(amountLabel, 9), y + 2, {
    size: 9,
    font: bold,
    color: gray,
  });

  y -= 30;
  // Partimos la descripción en líneas de máximo ~70 caracteres
  const words = String(invoice.description || "").split(/\s+/);
  const lines = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, 11) > 380) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);

  lines.forEach((l, index) => {
    text(l, margin + 10, y - index * 16, { size: 11 });
  });

  const amountText = formatMoney(invoice.amount, invoice.currency);
  text(amountText, width - margin - 10 - font.widthOfTextAtSize(amountText, 11), y, {
    size: 11,
  });

  y -= Math.max(lines.length, 1) * 16 + 20;
  page.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 1,
    color: light,
  });

  // Totales: subtotal, total y saldo adeudado
  const amountTextTotal = formatMoney(invoice.amount, invoice.currency);
  const labelX = width - margin - 260;

  y -= 26;
  text("Subtotal", labelX, y, { size: 10, color: gray });
  text(amountTextTotal, width - margin - font.widthOfTextAtSize(amountTextTotal, 10), y, {
    size: 10,
  });

  y -= 18;
  text("Total factura", labelX, y, { size: 10, color: gray });
  text(amountTextTotal, width - margin - font.widthOfTextAtSize(amountTextTotal, 10), y, {
    size: 10,
  });

  // Caja destacada con lo que el cliente debe pagar
  y -= 46;
  page.drawRectangle({
    x: labelX - 12,
    y: y - 12,
    width: width - margin - labelX + 12,
    height: 40,
    color: light,
  });
  text("SALDO ADEUDADO", labelX, y + 2, { size: 9, font: bold, color: gray });
  const totalText = formatMoney(invoice.amount, invoice.currency);
  text(totalText, width - margin - bold.widthOfTextAtSize(totalText, 16), y - 2, {
    size: 16,
    font: bold,
    color: primary,
  });

  // Nota de pago
  y -= 34;
  text("Importe a abonar por transferencia. Indica el número de factura en el concepto.", margin, y, {
    size: 9,
    color: gray,
  });

  // Pie de página (el número siempre existe; el id no, en un borrador sin guardar)
  const footer = invoice.id
    ? `Factura ${invoice.number} · Generada con Billio · ${invoice.id}`
    : `Factura ${invoice.number} · Generada con Billio`;
  text(footer, margin, 50, { size: 8, color: gray });

  return Buffer.from(await pdf.save());
}
