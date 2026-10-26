import { deleteInvoice, getProfile, saveInvoice, updateInvoice } from "@/lib/db";
import { generateInvoicePdf } from "@/lib/pdf";
import { sendInvoiceEmail } from "@/lib/resend";

// Error de negocio con código HTTP asociado
export class InvoiceError extends Error {
  constructor(message, status = 400, code = "invoice_error") {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function buildNumber(userId, year, month) {
  const short = String(userId).replace(/-/g, "").slice(0, 6).toUpperCase();
  return `BIL-${year}${String(month).padStart(2, "0")}-${short}`;
}

// Crea la factura, genera el PDF y la envía por correo.
// - source: "manual" | "cron"
// - idempotente: el índice único (user_id, year, month) impide dos facturas del mismo periodo → 409
export async function issueInvoice({ user, year, month, source }) {
  const profile = await getProfile(user.id);
  if (!profile) {
    throw new InvoiceError(
      "Debes configurar tu perfil antes de emitir facturas",
      422,
      "profile_missing"
    );
  }

  const draft = {
    userId: user.id,
    number: buildNumber(user.id, year, month),
    year,
    month,
    issuerName: profile.issuerName,
    recipientEmail: profile.recipientEmail,
    amount: Number(profile.amount),
    currency: profile.currency,
    description: profile.description,
    source,
    status: "pending",
  };

  // La base de datos decide: si ya hay una factura de ese periodo, el insert choca con el índice único
  const saved = await saveInvoice(draft);
  if (saved.duplicate) {
    throw new InvoiceError(
      `Ya existe una factura para ${month}/${year}`,
      409,
      "already_issued"
    );
  }

  const invoice = saved.invoice;

  try {
    const pdf = await generateInvoicePdf(invoice);
    const result = await sendInvoiceEmail(invoice, pdf);
    return await updateInvoice(user.id, invoice.id, {
      status: "sent",
      sentAt: new Date().toISOString(),
      resendId: result?.id || null,
    });
  } catch (error) {
    // Si el envío falla, la factura no se guarda en el historial (no se emitió) y el periodo
    // queda libre para reintentar.
    await deleteInvoice(user.id, invoice.id);
    throw new InvoiceError(
      `No se pudo enviar la factura: ${error.message}`,
      502,
      "send_failed"
    );
  }
}

// Indica si ya existe factura enviada para el periodo
export async function hasInvoiceForPeriod(invoices, year, month) {
  return invoices.some(
    (inv) => inv.year === year && inv.month === month && inv.status === "sent"
  );
}

export { getInvoice } from "@/lib/db";
