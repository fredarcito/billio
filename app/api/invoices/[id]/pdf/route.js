import { NextResponse } from "next/server";

import { getInvoice, getSessionUser } from "@/lib/db";
import { generateInvoicePdf } from "@/lib/pdf";
import { jsonError } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/invoices/[id]/pdf — descarga el PDF de una factura del usuario
export async function GET(_request, { params }) {
  const user = await getSessionUser();
  if (!user) return jsonError("No autenticado", 401);

  const invoice = await getInvoice(user.id, params.id);
  if (!invoice) return jsonError("Factura no encontrada", 404);

  const pdf = await generateInvoicePdf(invoice);

  return new NextResponse(pdf, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="factura-${invoice.number}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
