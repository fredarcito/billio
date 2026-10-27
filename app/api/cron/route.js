import { NextResponse } from "next/server";

import { getAutoSendUsers } from "@/lib/db";
import { createDraft, issueInvoice } from "@/lib/invoices";
import { currentPeriod, periodForSendDay } from "@/lib/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// GET /api/cron — envío automático diario (Vercel Cron: "0 14 * * *")
// Cada cuenta elige su día del mes (1-28); solo se factura a quien le toca hoy.
// Requiere cabecera "Authorization: Bearer <CRON_SECRET>"
export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization") || "";

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const today = currentPeriod();
  // Solo las cuentas con envío automático activado (se leen con la clave secreta: no hay sesión)
  const accounts = await getAutoSendUsers();

  const results = [];

  for (const { user, profile } of accounts) {
    // Cada cuenta tiene su día de envío: si hoy no es el suyo, se omite
    if (Number(profile?.sendDay) !== today.day) {
      results.push({ userId: user.id, status: "not_today", sendDay: profile?.sendDay ?? 1 });
      continue;
    }

    const { year, month } = periodForSendDay(profile?.sendDay);

    try {
      // Por horas el importe cambia cada mes: no se puede enviar sin revisar. Se crea un
      // borrador con las horas a 0 y la persona lo completa y confirma.
      if (profile?.billingMode === "hourly") {
        const { invoice, created } = await createDraft({
          user,
          year,
          month,
          source: "cron",
          admin: true,
        });
        results.push({
          userId: user.id,
          status: created ? "drafted" : "skipped",
          invoiceId: invoice?.id,
          number: invoice?.number,
        });
        continue;
      }

      const invoice = await issueInvoice({ user, year, month, source: "cron", admin: true });
      results.push({ userId: user.id, status: "sent", invoiceId: invoice.id, number: invoice.number });
    } catch (error) {
      // 409 = ya enviada en este periodo (idempotencia), no es un error real
      const status = error.code === "already_issued" ? "skipped" : "failed";
      results.push({
        userId: user.id,
        status,
        reason: error.code || "error",
        message: error.message,
      });
    }
  }

  const summary = {
    today,
    processed: results.filter((r) => r.status !== "not_today").length,
    sent: results.filter((r) => r.status === "sent").length,
    drafted: results.filter((r) => r.status === "drafted").length,
    skipped: results.filter((r) => r.status === "skipped").length,
    failed: results.filter((r) => r.status === "failed").length,
    notToday: results.filter((r) => r.status === "not_today").length,
    results,
  };

  return NextResponse.json(summary);
}
