import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/db";
import { getDraft, removeInvoice, saveDraft } from "@/lib/invoices";
import { jsonError, readJson } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/invoices/drafts/[id] — borrador con sus líneas
export async function GET(_request, { params }) {
  const user = await getSessionUser();
  if (!user) return jsonError("No autenticado", 401);

  try {
    const invoice = await getDraft({ user, id: params.id });
    return NextResponse.json({ invoice });
  } catch (error) {
    return jsonError(error.message || "No se pudo cargar el borrador", error.status || 500, {
      code: error.code || "draft_error",
    });
  }
}

// PUT /api/invoices/drafts/[id] — guarda las líneas: { items: [{ description, quantity, unitPrice }] }
// El total se recalcula en el servidor a partir de las líneas.
export async function PUT(request, { params }) {
  const user = await getSessionUser();
  if (!user) return jsonError("No autenticado", 401);

  const body = await readJson(request);

  try {
    const invoice = await saveDraft({ user, id: params.id, items: body?.items });
    return NextResponse.json({ invoice });
  } catch (error) {
    return jsonError(error.message || "No se pudo guardar el borrador", error.status || 500, {
      code: error.code || "save_failed",
    });
  }
}

// DELETE /api/invoices/drafts/[id] — descarta el borrador y libera el periodo
export async function DELETE(_request, { params }) {
  const user = await getSessionUser();
  if (!user) return jsonError("No autenticado", 401);

  try {
    const result = await removeInvoice({ user, id: params.id });
    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error.message || "No se pudo descartar el borrador", error.status || 500, {
      code: error.code || "delete_failed",
    });
  }
}
