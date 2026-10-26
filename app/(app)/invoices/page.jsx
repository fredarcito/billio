import { redirect } from "next/navigation";

import { InvoiceHistory } from "@/components/invoice-history";
import { getInvoices, getSessionUser } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata = { title: "Historial · Billio" };

export default async function InvoicesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const invoices = await getInvoices(user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Historial de facturas</h1>
        <p className="text-muted-foreground">
          Todas tus facturas, manuales y automáticas, con su estado de envío.
        </p>
      </div>
      <InvoiceHistory
        invoices={invoices}
        emptyMessage="Todavía no has emitido ninguna factura. Ve al panel para crear la primera."
      />
    </div>
  );
}
