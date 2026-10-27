// Acceso a datos en Supabase (Postgres). Todas las consultas van con la sesión de la persona,
// así que las políticas RLS de supabase/migrations limitan cada fila a su dueño.
import { supabaseServer, signedInUserId } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Cliente de Supabase según quién llama: con sesión (la persona) o con la clave secreta (el cron,
// que no tiene sesión). Sin esto, el cron iría como `anon` y la base de datos respondería 42501.
const clientFor = (admin) => (admin ? supabaseAdmin() : supabaseServer());

// --- Conversión de filas (snake_case en la base) a objetos de la app (camelCase) ---

const toProfile = (row) =>
  row
    ? {
        userId: row.user_id,
        issuerName: row.issuer_name,
        recipientEmail: row.recipient_email,
        recipientName: row.recipient_name,
        recipientTaxId: row.recipient_tax_id,
        amount: Number(row.amount),
        currency: row.currency,
        description: row.description,
        autoSend: row.auto_send,
        sendDay: row.send_day ?? 1,
        billingMode: row.billing_mode ?? "fixed",
        hourlyRate: row.hourly_rate === null || row.hourly_rate === undefined ? null : Number(row.hourly_rate),
        hourlyUnit: row.hourly_unit || "h",
        replyToEmail: row.reply_to_email,
        updatedAt: row.updated_at,
      }
    : null;

const toInvoiceItem = (row) => ({
  id: row.id,
  invoiceId: row.invoice_id,
  position: row.position,
  description: row.description,
  quantity: Number(row.quantity),
  unitPrice: Number(row.unit_price),
  amount: Number(row.amount),
});

const toInvoice = (row) =>
  row
    ? {
        id: row.id,
        userId: row.user_id,
        number: row.number,
        year: row.year,
        month: row.month,
        issuerName: row.issuer_name,
        recipientEmail: row.recipient_email,
        recipientName: row.recipient_name,
        recipientTaxId: row.recipient_tax_id,
        amount: Number(row.amount),
        currency: row.currency,
        description: row.description,
        replyToEmail: row.reply_to_email,
        source: row.source,
        status: row.status,
        resendId: row.resend_id,
        error: row.error,
        issuedAt: row.issued_at,
        sentAt: row.sent_at,
        cancelledAt: row.cancelled_at,
        cancelReason: row.cancel_reason,
        replacesId: row.replaces_id,
        subtotal: row.subtotal === null || row.subtotal === undefined ? null : Number(row.subtotal),
        items: Array.isArray(row.invoice_items) ? row.invoice_items.map(toInvoiceItem) : undefined,
      }
    : null;

// --- Usuarios --------------------------------------------------------------

// El usuario de la sesión, con el mismo formato que antes: { id, name, email }
export async function getSessionUser() {
  // Sin configuración de Supabase no hay sesión posible (p. ej. en local antes de rellenar .env.local)
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    return null;
  }
  const supabase = await supabaseServer();
  const userId = await signedInUserId(supabase);
  if (!userId) return null;

  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) return null;

  const { user } = data;
  return {
    id: user.id,
    name: user.user_metadata?.name || user.email?.split("@")[0] || "",
    email: user.email,
  };
}

// --- Perfil ----------------------------------------------------------------

export async function getProfile(userId, { admin = false } = {}) {
  const supabase = await clientFor(admin);
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return toProfile(data);
}

export async function saveProfile(userId, data) {
  const supabase = await supabaseServer();
  const { data: row, error } = await supabase
    .from("profiles")
    .upsert(
      {
        user_id: userId,
        issuer_name: data.issuerName,
        recipient_email: data.recipientEmail,
        recipient_name: data.recipientName || null,
        recipient_tax_id: data.recipientTaxId || null,
        amount: data.amount,
        currency: data.currency,
        description: data.description,
        auto_send: Boolean(data.autoSend),
        send_day: Number(data.sendDay) || 1,
        billing_mode: data.billingMode === "hourly" ? "hourly" : "fixed",
        hourly_rate: data.billingMode === "hourly" ? data.hourlyRate : null,
        hourly_unit: data.hourlyUnit || "h",
        reply_to_email: data.replyToEmail || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    )
    .select()
    .single();
  if (error) throw error;
  return toProfile(row);
}

// --- Facturas --------------------------------------------------------------

export async function getInvoices(userId, { admin = false } = {}) {
  const supabase = await clientFor(admin);
  const { data, error } = await supabase
    .from("invoices")
    .select("*, invoice_items(*)")
    .eq("user_id", userId)
    .order("issued_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(toInvoice);
}

export async function getInvoice(userId, id, { admin = false } = {}) {
  const supabase = await clientFor(admin);
  const { data, error } = await supabase
    .from("invoices")
    .select("*, invoice_items(*)")
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return toInvoice(data);
}

// Guarda la factura. Devuelve { invoice } o { duplicate: true } si ya había una vigente de ese
// periodo (el índice único parcial (user_id, year, month) WHERE cancelled_at IS NULL es la
// idempotencia: las anuladas no cuentan, así se puede emitir una nueva).
export async function saveInvoice(invoice, { admin = false } = {}) {
  const supabase = await clientFor(admin);
  const { data, error } = await supabase
    .from("invoices")
    .insert({
      user_id: invoice.userId,
      number: invoice.number,
      year: invoice.year,
      month: invoice.month,
      issuer_name: invoice.issuerName,
      recipient_email: invoice.recipientEmail,
      recipient_name: invoice.recipientName || null,
      recipient_tax_id: invoice.recipientTaxId || null,
      amount: invoice.amount,
      currency: invoice.currency,
      description: invoice.description,
      reply_to_email: invoice.replyToEmail || null,
      source: invoice.source,
      status: invoice.status,
      replaces_id: invoice.replacesId || null,
      subtotal: invoice.subtotal ?? null,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") return { duplicate: true };
    throw error;
  }

  const items = await saveInvoiceItems(supabase, data.id, invoice.items);
  return { invoice: toInvoice({ ...data, invoice_items: items }) };
}

// Sustituye las líneas de una factura (borrador). El importe de cada línea se recalcula
// aquí: nunca se confía en el que mande el cliente.
async function saveInvoiceItems(supabase, invoiceId, items) {
  if (!Array.isArray(items)) return undefined;

  const { error: deleteError } = await supabase
    .from("invoice_items")
    .delete()
    .eq("invoice_id", invoiceId);
  if (deleteError) throw deleteError;

  if (items.length === 0) return [];

  const rows = items.map((item, index) => ({
    invoice_id: invoiceId,
    position: index,
    description: item.description,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    amount: Math.round(Number(item.quantity) * Number(item.unitPrice) * 100) / 100,
  }));

  const { data, error } = await supabase.from("invoice_items").insert(rows).select();
  if (error) throw error;
  return (data || []).map(toInvoiceItem);
}

// Actualiza un borrador: importe, concepto, subtotal y líneas. Solo para facturas 'draft'.
export async function updateDraft(userId, id, data) {
  const supabase = await supabaseServer();
  const { data: row, error } = await supabase
    .from("invoices")
    .update({
      amount: data.amount,
      subtotal: data.subtotal ?? null,
      description: data.description,
    })
    .eq("user_id", userId)
    .eq("id", id)
    .eq("status", "draft")
    .select()
    .maybeSingle();
  if (error) throw error;
  if (!row) return null;

  const items = await saveInvoiceItems(supabase, row.id, data.items);
  return toInvoice({ ...row, invoice_items: items });
}

export async function updateInvoice(userId, id, patch, { admin = false } = {}) {
  const supabase = await clientFor(admin);
  const row = {};
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.sentAt !== undefined) row.sent_at = patch.sentAt;
  if (patch.resendId !== undefined) row.resend_id = patch.resendId;
  if (patch.error !== undefined) row.error = patch.error;

  const { data, error } = await supabase
    .from("invoices")
    .update(row)
    .eq("user_id", userId)
    .eq("id", id)
    .select()
    .maybeSingle();
  if (error) throw error;
  return toInvoice(data);
}

// Igual que updateInvoice, pero garantiza una factura de vuelta: si la actualización no
// devuelve la fila (p. ej. por una política de lectura), se devuelve la conocida con el cambio.
// Si la fila no se actualizó (sin política de UPDATE, RLS), se avisa en el log: el correo ya
// salió y la factura se quedaría en 'pending' sin que nadie se entere.
export async function updateInvoiceOrKeep(userId, invoice, patch, { admin = false } = {}) {
  const updated = await updateInvoice(userId, invoice.id, patch, { admin });
  if (!updated) {
    console.error(
      `La factura ${invoice.number} no se pudo actualizar en la base de datos (¿falta la política de UPDATE?). Se devuelve el estado local.`
    );
    return { ...invoice, ...patch };
  }
  return updated;
}

// Elimina una factura que no llegó a enviarse (libera el periodo para reintentar)
export async function deleteInvoice(userId, id, { admin = false } = {}) {
  const supabase = await clientFor(admin);
  const { error } = await supabase.from("invoices").delete().eq("user_id", userId).eq("id", id);
  if (error) throw error;
}

// Anula una factura: no se borra (queda como registro), pero libera el periodo para emitir otra
export async function cancelInvoice(userId, id, reason) {
  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from("invoices")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      cancel_reason: reason || null,
    })
    .eq("user_id", userId)
    .eq("id", id)
    .select()
    .maybeSingle();
  if (error) throw error;
  return toInvoice(data);
}

// --- Usuarios con envío automático (para el cron) --------------------------

// Perfiles con envío automático activado, con los datos de su cuenta: [{ user, profile }].
// Usa la clave secreta (lib/supabase/admin.js): el cron no tiene sesión de nadie.
export async function getAutoSendUsers() {
  const supabase = supabaseAdmin();
  const { data, error } = await supabase.from("profiles").select("*").eq("auto_send", true);
  if (error) throw error;

  const users = [];
  for (const row of data || []) {
    const { data: found, error: userError } = await supabase.auth.admin.getUserById(row.user_id);
    if (userError || !found?.user) continue;
    users.push({
      user: {
        id: found.user.id,
        name: found.user.user_metadata?.name || found.user.email?.split("@")[0] || "",
        email: found.user.email,
      },
      profile: toProfile(row),
    });
  }
  return users;
}
