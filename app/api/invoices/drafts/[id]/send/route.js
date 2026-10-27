import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/db";
import { sendDraft } from "@/lib/invoices";
import { jsonError, readJson } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/invoices/drafts/[id]/send — confirma el borrador: { items: [...] }
// Guarda las líneas, genera el PDF y lo envía. Si el envío falla, el borrador se conserva.
export async function POST(request, { params }) {
  const user = await getSessionUser();
  if (!user) return jsonError("No autenticado", 401);

  const body = await readJson(request);

  try {
    const invoice = await sendDraft({ user, id: params.id, items: body?.items });
    return NextResponse.json({ invoice });
  } catch (error) {
    return jsonError(error.message || "No se pudo enviar la factura", error.status || 500, {
      code: error.code || "send_failed",
    });
  }
}
