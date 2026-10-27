import {
  cancelInvoice,
  deleteInvoice,
  getInvoice,
  getInvoices,
  getProfile,
  saveInvoice,
  updateDraft,
  updateInvoiceOrKeep,
} from "@/lib/db";
import { itemsTotal, normalizeItems, summarizeItems } from "@/lib/items";
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

export function buildNumber(userId, year, month) {
  const short = String(userId).replace(/-/g, "").slice(0, 6).toUpperCase();
  return `BIL-${year}${String(month).padStart(2, "0")}-${short}`;
}

// Borrador de factura con los datos del perfil, sin guardar ni enviar nada.
// Es lo que se muestra en la vista previa antes de confirmar el envío.
// `admin` usa la clave secreta: lo necesita el cron, que no tiene sesión.
export async function buildInvoiceDraft({ user, year, month, source = "manual", admin = false }) {
  const profile = await getProfile(user.id, { admin });
  if (!profile) {
    throw new InvoiceError(
      "Debes configurar tu perfil antes de emitir facturas",
      422,
      "profile_missing"
    );
  }

  const hourly = profile.billingMode === "hourly";

  // En modo por horas la factura nace con 1 unidad a la tarifa del perfil (la tabla exige
  // quantity > 0) y la persona ajusta las horas en el borrador antes de enviarla.
  const items = hourly
    ? [
        {
          description: profile.description,
          quantity: 1,
          unitPrice: Number(profile.hourlyRate) || 0,
          amount: Number(profile.hourlyRate) || 0,
        },
      ]
    : undefined;

  return {
    userId: user.id,
    number: buildNumber(user.id, year, month),
    year,
    month,
    issuerName: profile.issuerName,
    recipientEmail: profile.recipientEmail,
    recipientName: profile.recipientName || null,
    recipientTaxId: profile.recipientTaxId || null,
    amount: hourly ? Number(profile.hourlyRate) || 0 : Number(profile.amount),
    subtotal: hourly ? Number(profile.hourlyRate) || 0 : null,
    currency: profile.currency,
    description: profile.description,
    items,
    billingMode: profile.billingMode,
    hourlyUnit: profile.hourlyUnit,
    // Las respuestas del cliente van a la persona, no al buzón de envío
    replyToEmail: profile.replyToEmail || user.email,
    source,
    status: hourly ? "draft" : "pending",
    issuedAt: new Date().toISOString(),
  };
}

// Crea la factura, genera el PDF y la envía por correo.
// - source: "manual" | "cron"
// - admin: true cuando no hay sesión (cron); usa la clave secreta en todas las consultas
// - idempotente: el índice único (user_id, year, month) impide dos facturas del mismo periodo → 409
export async function issueInvoice({ user, year, month, source, admin = false }) {
  const draft = await buildInvoiceDraft({ user, year, month, source, admin });

  // Si el periodo tenía una factura anulada, la nueva se marca como sustituta
  const previous = (await getInvoices(user.id, { admin })).find(
    (inv) => inv.year === year && inv.month === month && inv.status === "cancelled"
  );
  if (previous) draft.replacesId = previous.id;

  // La base de datos decide: si ya hay una factura vigente de ese periodo, el insert choca
  // con el índice único parcial (las anuladas no cuentan)
  const saved = await saveInvoice(draft, { admin });
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

    // El correo ya salió: a partir de aquí no se borra nada aunque falle el guardado
    try {
      return await updateInvoiceOrKeep(user.id, invoice, {
        status: "sent",
        sentAt: new Date().toISOString(),
        resendId: result?.id || null,
      }, { admin });
    } catch (updateError) {
      console.error("Factura enviada pero no se pudo marcar como enviada:", updateError);
      return { ...invoice, status: "sent", sentAt: new Date().toISOString() };
    }
  } catch (error) {
    // Si el envío falla, la factura no se guarda en el historial (no se emitió) y el periodo
    // queda libre para reintentar.
    await deleteInvoice(user.id, invoice.id, { admin });
    throw new InvoiceError(
      `No se pudo enviar la factura: ${error.message}`,
      502,
      "send_failed"
    );
  }
}

// --- Borradores (facturación por horas) ------------------------------------

// Crea el borrador del periodo si no existe (lo usa el cron en modo por horas).
// Devuelve { invoice, created }. Si el periodo ya tiene una factura (borrador, enviada o
// pendiente), no se toca: el índice único parcial ya lo impide.
export async function createDraft({ user, year, month, source = "cron", admin = false }) {
  const draft = await buildInvoiceDraft({ user, year, month, source, admin });
  draft.status = "draft";

  const saved = await saveInvoice(draft, { admin });
  if (saved.duplicate) return { invoice: null, created: false };
  return { invoice: saved.invoice, created: true };
}

// Borrador del usuario, con sus líneas. Solo se pueden editar facturas en estado 'draft'.
export async function getDraft({ user, id }) {
  const invoice = await getInvoice(user.id, id);
  if (!invoice) throw new InvoiceError("La factura no existe", 404, "not_found");
  if (invoice.status !== "draft") {
    throw new InvoiceError("Esta factura ya no es un borrador", 409, "not_draft");
  }
  return invoice;
}

// Guarda las líneas del borrador y recalcula el total en el servidor.
export async function saveDraft({ user, id, items }) {
  const invoice = await getDraft({ user, id });
  const normalized = normalizeItems(items);

  if (normalized.length === 0) {
    throw new InvoiceError("Añade al menos un concepto", 422, "items_required");
  }
  const total = itemsTotal(normalized);
  if (total <= 0) {
    throw new InvoiceError("El total debe ser mayor que 0", 422, "amount_invalid");
  }

  const updated = await updateDraft(user.id, invoice.id, {
    amount: total,
    subtotal: total,
    description: summarizeItems(normalized),
    items: normalized,
  });
  if (!updated) throw new InvoiceError("No se pudo guardar el borrador", 500, "save_failed");
  return updated;
}

// Confirma el borrador: guarda las líneas, genera el PDF y lo envía.
// Si el envío falla, el borrador se conserva (no se borra) para poder reintentar.
export async function sendDraft({ user, id, items }) {
  const saved = await saveDraft({ user, id, items });

  // Pasa a 'pending' antes de enviar: si el correo sale y falla el guardado posterior,
  // la factura no queda como borrador editable.
  // `updateInvoiceOrKeep` devuelve la fila de `invoices` sin sus líneas, así que los items
  // se toman de `saved`: si no, el PDF y el correo saldrían sin el detalle de conceptos.
  const pending = await updateInvoiceOrKeep(user.id, saved, { status: "pending" });
  const invoice = {
    ...saved,
    ...pending,
    items: saved.items,
    status: "pending",
  };

  try {
    const pdf = await generateInvoicePdf(invoice);
    const result = await sendInvoiceEmail(invoice, pdf);

    try {
      return await updateInvoiceOrKeep(user.id, invoice, {
        status: "sent",
        sentAt: new Date().toISOString(),
        resendId: result?.id || null,
      });
    } catch (updateError) {
      console.error("Factura enviada pero no se pudo marcar como enviada:", updateError);
      return { ...invoice, status: "sent", sentAt: new Date().toISOString() };
    }
  } catch (error) {
    // Vuelve a borrador: el correo no salió y la persona puede corregir y reintentar
    await updateInvoiceOrKeep(user.id, invoice, {
      status: "draft",
      error: error.message,
    }).catch(() => {});
    throw new InvoiceError(`No se pudo enviar la factura: ${error.message}`, 502, "send_failed");
  }
}

// Anula una factura enviada. No se borra: queda en el historial como anulada y el periodo
// vuelve a estar libre para emitir una nueva (que se marca como sustituta).
export async function voidInvoice({ user, id, reason }) {
  const invoice = await getInvoice(user.id, id);
  if (!invoice) {
    throw new InvoiceError("La factura no existe", 404, "not_found");
  }
  if (invoice.status === "cancelled") {
    throw new InvoiceError("La factura ya está anulada", 409, "already_cancelled");
  }
  if (invoice.status !== "sent") {
    throw new InvoiceError(
      "Solo se pueden anular facturas enviadas. Las que no se enviaron se pueden eliminar.",
      422,
      "not_sent"
    );
  }

  return cancelInvoice(user.id, id, reason);
}

// Elimina una factura que nunca se envió (pending/failed). Las enviadas no se borran: se anulan.
export async function removeInvoice({ user, id }) {
  const invoice = await getInvoice(user.id, id);
  if (!invoice) {
    throw new InvoiceError("La factura no existe", 404, "not_found");
  }
  if (invoice.status === "sent" || invoice.status === "cancelled") {
    throw new InvoiceError(
      "Las facturas enviadas no se pueden borrar: anúlalas para conservar el registro",
      422,
      "cannot_delete"
    );
  }
  // Un borrador que ya se intentó enviar y falló se puede descartar; las líneas se van en cascada

  await deleteInvoice(user.id, id);
  return { id };
}

// Indica si ya existe factura enviada para el periodo
export async function hasInvoiceForPeriod(invoices, year, month) {
  return invoices.some(
    (inv) => inv.year === year && inv.month === month && inv.status === "sent"
  );
}

export { getInvoice, getInvoices };
