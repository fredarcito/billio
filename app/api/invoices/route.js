import { NextResponse } from "next/server";

import { getInvoices, getSessionUser } from "@/lib/db";
import { buildInvoiceDraft, createDraft, issueInvoice } from "@/lib/invoices";
import { jsonError, readJson } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/invoices — historial de facturas del usuario
export async function GET() {
  const user = await getSessionUser();
  if (!user) return jsonError("No autenticado", 401);

  const invoices = await getInvoices(user.id);
  return NextResponse.json({ invoices });
}

// POST /api/invoices — vista previa o emisión manual: { year, month, preview? }
// Con preview: true devuelve el borrador sin guardar ni enviar nada.
export async function POST(request) {
  const user = await getSessionUser();
  if (!user) return jsonError("No autenticado", 401);

  const body = await readJson(request);
  const year = Number(body?.year);
  const month = Number(body?.month);

  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return jsonError("El año no es válido");
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return jsonError("El mes no es válido");
  }

  try {
    // En modo por horas no hay importe fijo: se crea el borrador y se edita en su pantalla.
    // Se comprueba antes de la vista previa, porque esa vista previa (importe fijo, 0 h) no
    // tiene sentido con facturación por horas.
    const draft = await buildInvoiceDraft({ user, year, month, source: "manual" });
    if (draft.billingMode === "hourly") {
      const { invoice, created } = await createDraft({ user, year, month, source: "manual" });
      if (!created) {
        return jsonError(
          `Ya existe una factura para ${month}/${year}`,
          409,
          { code: "already_issued" }
        );
      }
      return NextResponse.json({ invoice, draft: true }, { status: 201 });
    }

    // Paso 1: vista previa (no toca la base de datos ni envía correo)
    if (body?.preview) {
      return NextResponse.json({ draft });
    }

    // Paso 2: emisión y envío confirmados
    const invoice = await issueInvoice({ user, year, month, source: "manual" });
    return NextResponse.json({ invoice }, { status: 201 });
  } catch (error) {
    return jsonError(error.message || "No se pudo emitir la factura", error.status || 500, {
      code: error.code || "invoice_error",
    });
  }
}
