import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertCircle, ArrowRight, CheckCircle2 } from "lucide-react";

import { InvoiceHistory } from "@/components/invoice-history";
import { QuickIssue } from "@/components/quick-issue";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getInvoices, getProfile, getSessionUser } from "@/lib/db";
import { formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata = { title: "Panel · Billio" };

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const [profile, invoices] = await Promise.all([getProfile(user.id), getInvoices(user.id)]);

  const sent = invoices.filter((inv) => inv.status === "sent");
  const currentYear = new Date().getFullYear();
  const totalYear = sent
    .filter((inv) => inv.year === currentYear)
    .reduce((sum, inv) => sum + Number(inv.amount || 0), 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Hola, {user.name.split(" ")[0]}</h1>
        <p className="text-muted-foreground">
          Genera y envía tu factura mensual en un solo clic.
        </p>
      </div>

      {!profile ? (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-900">
              <AlertCircle className="h-5 w-5" /> Configura tu perfil para empezar
            </CardTitle>
            <CardDescription className="text-amber-800">
              Necesitamos tus datos de facturación (emisor, destinatario, importe y concepto)
              antes de poder emitir facturas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/profile">
                Configurar perfil <ArrowRight />
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <QuickIssue profile={profile} />
          </div>
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Facturas enviadas</CardDescription>
                <CardTitle className="text-3xl">{sent.length}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Total histórico
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Facturado en {currentYear}</CardDescription>
                <CardTitle className="text-3xl">
                  {formatMoney(totalYear, profile.currency)}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                {profile.autoSend ? "Envío automático activado" : "Envío automático desactivado"}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Destinatario</CardDescription>
                <CardTitle className="break-all text-base">{profile.recipientEmail}</CardTitle>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" size="sm">
                  <Link href="/profile">Editar perfil</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Últimas facturas</h2>
          <Button asChild variant="link">
            <Link href="/invoices">Ver historial completo</Link>
          </Button>
        </div>
        <InvoiceHistory invoices={invoices.slice(0, 5)} emptyMessage="Aún no has emitido facturas." />
      </div>
    </div>
  );
}
