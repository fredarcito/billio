import { NextResponse } from "next/server";

import { getProfile, getSessionUser, saveProfile } from "@/lib/db";
import { isValidEmail, jsonError, readJson } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/profile — perfil del usuario autenticado
export async function GET() {
  const user = await getSessionUser();
  if (!user) return jsonError("No autenticado", 401);

  const profile = await getProfile(user.id);
  return NextResponse.json({ profile: profile || null });
}

// PUT /api/profile — guarda los datos de facturación del usuario
export async function PUT(request) {
  const user = await getSessionUser();
  if (!user) return jsonError("No autenticado", 401);

  const body = await readJson(request);
  const issuerName = String(body?.issuerName || "").trim();
  const recipientEmail = String(body?.recipientEmail || "").trim().toLowerCase();
  const amount = Number(body?.amount);
  const currency = String(body?.currency || "").trim().toUpperCase();
  const description = String(body?.description || "").trim();
  const autoSend = Boolean(body?.autoSend);
  const sendDay = Number(body?.sendDay ?? 1);
  const replyToEmail = String(body?.replyToEmail || "").trim().toLowerCase();
  const recipientName = String(body?.recipientName || "").trim();
  const recipientTaxId = String(body?.recipientTaxId || "").trim();
  const billingMode = body?.billingMode === "hourly" ? "hourly" : "fixed";
  // La tarifa puede llegar como "" (campo vacío) o null: Number("") es 0, así que se distingue
  const rawRate = body?.hourlyRate;
  const hourlyRate = rawRate === "" || rawRate === null || rawRate === undefined ? NaN : Number(rawRate);
  const hourlyUnit = String(body?.hourlyUnit || "h").trim().slice(0, 10) || "h";

  if (!issuerName) return jsonError("El nombre del emisor es obligatorio");
  if (!isValidEmail(recipientEmail)) return jsonError("El email del destinatario no es válido");
  // En modo por horas el importe fijo no se usa: lo pone cada factura al confirmar el borrador
  if (billingMode === "fixed" && (!Number.isFinite(amount) || amount <= 0)) {
    return jsonError("El importe debe ser mayor que 0");
  }
  if (billingMode === "hourly" && (!Number.isFinite(hourlyRate) || hourlyRate <= 0)) {
    return jsonError("La tarifa por hora debe ser mayor que 0");
  }
  if (!/^[A-Z]{3}$/.test(currency)) return jsonError("La moneda debe ser un código ISO de 3 letras");
  if (!description) return jsonError("La descripción es obligatoria");
  if (!Number.isInteger(sendDay) || sendDay < 1 || sendDay > 28) {
    return jsonError("El día de envío debe estar entre 1 y 28");
  }
  // Opcional: si se deja vacío, las respuestas van al email de la cuenta
  if (replyToEmail && !isValidEmail(replyToEmail)) {
    return jsonError("El email de respuesta no es válido");
  }

  // En modo por horas el importe se conserva (si lo había) en vez de ponerlo a 0: así volver a
  // "importe fijo" no obliga a escribirlo otra vez. Solo cuenta `hourly_rate`.
  const existing = billingMode === "hourly" ? await getProfile(user.id) : null;

  const profile = await saveProfile(user.id, {
    issuerName,
    recipientEmail,
    amount:
      billingMode === "fixed"
        ? Math.round(amount * 100) / 100
        : existing?.amount > 0
          ? existing.amount
          : 0,
    billingMode,
    hourlyRate: billingMode === "hourly" ? Math.round(hourlyRate * 100) / 100 : null,
    hourlyUnit,
    currency,
    description,
    autoSend,
    sendDay,
    replyToEmail: replyToEmail || null,
    recipientName: recipientName || null,
    recipientTaxId: recipientTaxId || null,
  });

  return NextResponse.json({ profile });
}
