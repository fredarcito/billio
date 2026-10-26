import { getSessionUser } from "@/lib/db";
import { buildInvoiceDraft } from "@/lib/invoices";
import { generateInvoicePdf } from "@/lib/pdf";
import { jsonError, readJson } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/invoices/preview — PDF del borrador, sin emitir ni enviar la factura
// Va por POST (no por GET) para que no exista una URL que genere facturas sin confirmar.
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
    const draft = await buildInvoiceDraft({ user, year, month, source: "manual" });
    const pdf = await generateInvoicePdf(draft);

    return new Response(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="borrador-${draft.number}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return jsonError(error.message || "No se pudo generar el PDF", error.status || 500, {
      code: error.code || "preview_error",
    });
  }
}
