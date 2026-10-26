import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  CircleSlash,
  FileText,
  Mail,
  Receipt,
  Sparkles,
  Wallet,
} from "lucide-react";

import { InvoiceHistory } from "@/components/invoice-history";
import { QuickIssue } from "@/components/quick-issue";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getInvoices, getProfile, getSessionUser } from "@/lib/db";
import { formatMoney, monthName } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata = { title: "Dashboard · Billio" };

// Tarjeta de métrica del panel
function StatCard({ icon: Icon, label, value, hint, tone = "default" }) {
  const tones = {
    default: "bg-muted text-muted-foreground",
    primary: "bg-primary/10 text-primary",
    success: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400",
  };

  return (
    <Card className="gap-0 py-0">
      <CardContent className="space-y-3 p-5">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{label}</span>
          <span className={`flex size-8 items-center justify-center rounded-lg ${tones[tone]}`}>
            <Icon className="size-4" />
          </span>
        </div>
        <div className="text-2xl font-semibold tracking-tight tabular-nums">{value}</div>
        {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  );
}

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const [profile, invoices] = await Promise.all([getProfile(user.id), getInvoices(user.id)]);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const sent = invoices.filter((inv) => inv.status === "sent");
  const totalYear = sent
    .filter((inv) => inv.year === currentYear)
    .reduce((sum, inv) => sum + Number(inv.amount || 0), 0);
  const lastInvoice = sent[0];
  const currentMonthInvoice = sent.find(
    (inv) => inv.year === currentYear && inv.month === currentMonth
  );
  const firstName = user.name.split(" ")[0];

  return (
    <div className="space-y-8">
      {/* Cabecera */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Hola, {firstName}</h1>
          <p className="text-sm text-muted-foreground">
            {profile
              ? `Tu factura de ${monthName(currentMonth)} está a un clic.`
              : "Configura tu perfil para empezar a facturar."}
          </p>
        </div>
        {profile && (
          <Badge variant={profile.autoSend ? "success" : "outline"} className="gap-1.5 px-3 py-1">
            {profile.autoSend ? <CheckCircle2 /> : <CircleSlash />}
            {profile.autoSend ? "Envío automático activo" : "Envío automático desactivado"}
          </Badge>
        )}
      </div>

      {!profile ? (
        /* Estado vacío: invitar a configurar el perfil */
        <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background">
          <CardContent className="flex flex-col items-start gap-5 p-8 sm:flex-row sm:items-center">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Sparkles className="size-6" />
            </span>
            <div className="flex-1 space-y-1">
              <h2 className="font-semibold">Configura tu perfil para empezar</h2>
              <p className="text-sm text-muted-foreground">
                Necesitamos tus datos de facturación (emisor, destinatario, importe y
                concepto) antes de poder emitir facturas.
              </p>
            </div>
            <Button asChild>
              <Link href="/profile">
                Configurar perfil <ArrowRight />
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Métricas */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={Receipt}
              label="Facturas enviadas"
              value={sent.length}
              hint="Total histórico"
              tone="primary"
            />
            <StatCard
              icon={Wallet}
              label={`Facturado en ${currentYear}`}
              value={formatMoney(totalYear, profile.currency)}
              hint={`${sent.filter((inv) => inv.year === currentYear).length} facturas este año`}
              tone="success"
            />
            <StatCard
              icon={CalendarDays}
              label={`Factura de ${monthName(currentMonth)}`}
              value={currentMonthInvoice ? "Emitida" : "Pendiente"}
              hint={
                currentMonthInvoice
                  ? `Enviada a ${currentMonthInvoice.recipientEmail}`
                  : "Aún no la has enviado este mes"
              }
            />
            <StatCard
              icon={Mail}
              label="Cliente"
              value={
                <span className="block truncate text-base font-medium">
                  {profile.recipientName || profile.recipientEmail}
                </span>
              }
              hint={profile.recipientName ? profile.recipientEmail : "Sin nombre en la factura"}
            />
          </div>

          {/* Emisión + resumen del perfil */}
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <QuickIssue profile={profile} />
            </div>

            <Card className="gap-0 self-start py-0">
              <CardContent className="space-y-5 p-6">
                <div className="flex items-center justify-between">
                  <h2 className="flex items-center gap-2 text-sm font-semibold">
                    <FileText className="size-4 text-primary" />
                    Resumen del perfil
                  </h2>
                  <Button asChild variant="ghost" size="sm" className="-mr-2">
                    <Link href="/profile">
                      Editar <ArrowUpRight />
                    </Link>
                  </Button>
                </div>

                <dl className="space-y-3 text-sm">
                  <div className="flex items-start justify-between gap-4">
                    <dt className="text-muted-foreground">Emisor</dt>
                    <dd className="text-right font-medium">{profile.issuerName}</dd>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <dt className="shrink-0 text-muted-foreground">Cliente</dt>
                    <dd className="text-right font-medium">
                      {profile.recipientName || "—"}
                    </dd>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <dt className="text-muted-foreground">Importe</dt>
                    <dd className="text-right font-medium tabular-nums">
                      {formatMoney(profile.amount, profile.currency)}
                    </dd>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <dt className="shrink-0 text-muted-foreground">Concepto</dt>
                    <dd className="text-right">{profile.description}</dd>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <dt className="shrink-0 text-muted-foreground">Respuestas</dt>
                    <dd className="break-all text-right">{profile.replyToEmail || user.email}</dd>
                  </div>
                </dl>

                <div className="flex items-start gap-2.5 rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
                  <CalendarClock className="mt-0.5 size-3.5 shrink-0" />
                  <span>
                    {profile.autoSend
                      ? `Cada día ${profile.sendDay ?? 1} del mes se emite y envía la factura automáticamente.`
                      : "El envío automático está desactivado: emite cada factura a mano."}
                  </span>
                </div>

                {lastInvoice && (
                  <div className="space-y-1 border-t pt-4 text-xs text-muted-foreground">
                    <div className="font-medium text-foreground">Última factura</div>
                    <div>
                      {monthName(lastInvoice.month)} {lastInvoice.year} ·{" "}
                      {formatMoney(lastInvoice.amount, lastInvoice.currency)}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Historial reciente */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Últimas facturas</h2>
          <Button asChild variant="ghost" size="sm">
            <Link href="/invoices">
              Ver historial <ArrowRight />
            </Link>
          </Button>
        </div>
        <InvoiceHistory
          invoices={invoices.slice(0, 5)}
          emptyMessage="Aún no has emitido facturas. La primera aparecerá aquí."
        />
      </div>
    </div>
  );
}
