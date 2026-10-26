import { NextResponse } from "next/server";

import { getAutoSendUsers } from "@/lib/db";
import { issueInvoice } from "@/lib/invoices";
import { currentPeriod } from "@/lib/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// GET /api/cron — envío automático mensual (Vercel Cron: "0 14 1 * *")
// Requiere cabecera "Authorization: Bearer <CRON_SECRET>"
export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization") || "";

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { year, month } = currentPeriod();
  // Solo las cuentas con envío automático activado (se leen con la clave secreta: no hay sesión)
  const accounts = await getAutoSendUsers();

  const results = [];

  for (const { user } of accounts) {
    try {
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
    period: { year, month },
    processed: results.length,
    sent: results.filter((r) => r.status === "sent").length,
    skipped: results.filter((r) => r.status === "skipped").length,
    failed: results.filter((r) => r.status === "failed").length,
    results,
  };

  return NextResponse.json(summary);
}
