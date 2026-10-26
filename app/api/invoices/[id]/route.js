import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/db";
import { removeInvoice, voidInvoice } from "@/lib/invoices";
import { jsonError, readJson } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// DELETE /api/invoices/[id] — borra una factura que nunca se envió (pending/failed).
// Las enviadas no se borran: se anulan con POST /api/invoices/[id]/cancel.
export async function DELETE(_request, { params }) {
  const user = await getSessionUser();
  if (!user) return jsonError("No autenticado", 401);

  try {
    const result = await removeInvoice({ user, id: params.id });
    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error.message || "No se pudo borrar la factura", error.status || 500, {
      code: error.code || "delete_failed",
    });
  }
}

// POST /api/invoices/[id] — anula una factura enviada: { reason? }
// No se borra (queda en el historial) y el periodo vuelve a estar libre.
export async function POST(request, { params }) {
  const user = await getSessionUser();
  if (!user) return jsonError("No autenticado", 401);

  const body = await readJson(request);
  const reason = String(body?.reason || "").trim().slice(0, 200);

  try {
    const invoice = await voidInvoice({ user, id: params.id, reason });
    return NextResponse.json({ invoice });
  } catch (error) {
    return jsonError(error.message || "No se pudo anular la factura", error.status || 500, {
      code: error.code || "cancel_failed",
    });
  }
}
