import { Resend } from "resend";

import { formatMoney, monthName } from "@/lib/format";

// Cliente de Resend (se instancia de forma perezosa para no romper el build sin API key)
function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("Falta la variable de entorno RESEND_API_KEY");
  return new Resend(apiKey);
}

// Remitente configurable; en pruebas Resend permite "onboarding@resend.dev"
function getFrom() {
  return process.env.RESEND_FROM || "Billio <onboarding@resend.dev>";
}

function buildHtml(invoice) {
  const amount = formatMoney(invoice.amount, invoice.currency);
  return `<!doctype html>
<html lang="es">
  <body style="margin:0;padding:0;background:#f4f6fb;font-family:Arial,Helvetica,sans-serif;color:#111827;">
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 0;">
      <tr>
        <td align="center">
          <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
            <tr>
              <td style="background:#2159d9;padding:24px 32px;color:#ffffff;">
                <div style="font-size:22px;font-weight:bold;">Factura ${invoice.number}</div>
                <div style="font-size:13px;opacity:.85;margin-top:4px;">${monthName(invoice.month)} ${invoice.year}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <p style="margin:0 0 16px;font-size:15px;">Hola,</p>
                <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">
                  Adjuntamos la factura emitida por <strong>${invoice.issuerName}</strong>
                  correspondiente a <strong>${monthName(invoice.month)} ${invoice.year}</strong>.
                </p>
                <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:8px;margin:24px 0;">
                  <tr>
                    <td style="padding:16px 20px;font-size:13px;color:#6b7280;">Concepto</td>
                    <td style="padding:16px 20px;font-size:13px;text-align:right;">${invoice.description}</td>
                  </tr>
                  <tr>
                    <td style="padding:0 20px 16px;font-size:13px;color:#6b7280;">Importe</td>
                    <td style="padding:0 20px 16px;font-size:18px;font-weight:bold;text-align:right;color:#2159d9;">${amount}</td>
                  </tr>
                </table>
                <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.6;">
                  Encontrarás el PDF de la factura adjunto a este correo.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px;background:#f9fafb;font-size:11px;color:#9ca3af;">
                Enviado con Billio
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

// Envía la factura por email con el PDF adjunto
export async function sendInvoiceEmail(invoice, pdfBuffer) {
  const resend = getResend();
  const { data, error } = await resend.emails.send({
    from: getFrom(),
    to: [invoice.recipientEmail],
    subject: `Factura ${monthName(invoice.month)} ${invoice.year} · ${invoice.issuerName}`,
    html: buildHtml(invoice),
    attachments: [
      {
        filename: `factura-${invoice.number}.pdf`,
        content: pdfBuffer.toString("base64"),
      },
    ],
  });

  if (error) {
    throw new Error(error.message || "Error al enviar el correo con Resend");
  }
  return data;
}
