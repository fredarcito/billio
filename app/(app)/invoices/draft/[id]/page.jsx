import { notFound, redirect } from "next/navigation";

import { DraftEditor } from "@/components/draft-editor";
import { getInvoice, getProfile, getSessionUser } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata = { title: "Borrador de factura · Billio" };

// Editor del borrador de factura (facturación por horas)
export default async function DraftPage({ params }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const invoice = await getInvoice(user.id, params.id);
  if (!invoice) notFound();
  // Solo los borradores se editan; las enviadas se ven en el historial
  if (invoice.status !== "draft") redirect("/invoices");

  const profile = await getProfile(user.id);

  return (
    <DraftEditor
      invoice={{
        ...invoice,
        hourlyUnit: profile?.hourlyUnit || "h",
        // Tarifa del perfil: es el precio por defecto de una línea nueva y el que se aplica a
        // las líneas que quedaron a 0 (borradores creados antes de tener tarifa)
        hourlyRate: profile?.hourlyRate ?? null,
      }}
    />
  );
}
