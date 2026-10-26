"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Ban, Download, Loader2, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatMoney, monthName } from "@/lib/format";

const statusMap = {
  sent: { label: "Enviada", variant: "success" },
  pending: { label: "Pendiente", variant: "warning" },
  failed: { label: "Fallida", variant: "destructive" },
  cancelled: { label: "Anulada", variant: "outline" },
};

const sourceMap = {
  manual: "Manual",
  cron: "Automática",
};

// Icono grande en un círculo tonal: da contexto al diálogo antes de leer el texto
function DialogIcon({ icon: Icon, tone = "destructive" }) {
  const tones = {
    destructive: "bg-destructive/10 text-destructive ring-destructive/15",
    warning: "bg-amber-500/10 text-amber-600 ring-amber-500/20 dark:text-amber-400",
  };

  return (
    <div
      className={`mx-auto flex size-12 items-center justify-center rounded-full ring-8 sm:mx-0 ${tones[tone]}`}
    >
      <Icon className="size-5" />
    </div>
  );
}

// Resumen compacto de la factura afectada, para saber sobre cuál se actúa
function InvoiceSummary({ invoice }) {
  return (
    <div className="rounded-xl border bg-muted/40 px-4 py-3">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="font-mono text-xs text-muted-foreground">{invoice.number}</div>
          <div className="truncate text-sm font-medium">
            {monthName(invoice.month)} {invoice.year}
            {invoice.recipientName && (
              <span className="font-normal text-muted-foreground"> · {invoice.recipientName}</span>
            )}
          </div>
        </div>
        <div className="shrink-0 text-right text-sm font-semibold tabular-nums">
          {formatMoney(invoice.amount, invoice.currency)}
        </div>
      </div>
    </div>
  );
}

// Diálogo de anulación: pide un motivo opcional y explica qué pasa
function CancelDialog({ invoice, onClose, onDone }) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  async function confirm() {
    setLoading(true);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "No se pudo anular la factura");

      toast.success("Factura anulada", {
        description: `Ya puedes emitir una nueva para ${monthName(invoice.month)} ${invoice.year}.`,
      });
      onDone();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !loading && onClose()}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
        <div className="space-y-4 px-6 pt-7 pb-5">
          <DialogIcon icon={Ban} />

          <DialogHeader className="gap-1.5">
            <DialogTitle className="text-base">Anular factura</DialogTitle>
            <DialogDescription className="leading-relaxed">
              Dejará de contar como emitida y el periodo quedará libre para generar una nueva.
              La factura se conserva en el historial marcada como anulada.
            </DialogDescription>
          </DialogHeader>

          <InvoiceSummary invoice={invoice} />

          <div className="space-y-2">
            <Label htmlFor="reason" className="text-xs font-medium text-muted-foreground">
              Motivo <span className="font-normal">(opcional)</span>
            </Label>
            <Input
              id="reason"
              placeholder="Ej. Importe incorrecto"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={200}
              disabled={loading}
              className="h-10"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 border-t bg-muted/40 px-6 py-4">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={confirm} disabled={loading}>
            {loading ? <Loader2 className="animate-spin" /> : <Ban />}
            Anular factura
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Diálogo de borrado: solo para facturas que nunca se enviaron
function DeleteDialog({ invoice, onClose, onDone }) {
  const [loading, setLoading] = useState(false);

  async function confirm() {
    setLoading(true);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "No se pudo borrar la factura");

      toast.success("Factura eliminada");
      onDone();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !loading && onClose()}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
        <div className="space-y-4 px-6 pt-7 pb-5">
          <DialogIcon icon={Trash2} />

          <DialogHeader className="gap-1.5">
            <DialogTitle className="text-base">Eliminar factura</DialogTitle>
            <DialogDescription className="leading-relaxed">
              Esta factura nunca se envió, así que se borra definitivamente y el periodo queda
              libre. Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>

          <InvoiceSummary invoice={invoice} />
        </div>

        <DialogFooter className="gap-2 border-t bg-muted/40 px-6 py-4">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={confirm} disabled={loading}>
            {loading ? <Loader2 className="animate-spin" /> : <Trash2 />}
            Eliminar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Tabla de historial de facturas con acciones (anular / eliminar)
export function InvoiceHistory({ invoices, emptyMessage = "No hay facturas todavía." }) {
  const router = useRouter();
  const [showCancelled, setShowCancelled] = useState(false);
  const [cancelling, setCancelling] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const cancelledCount = invoices.filter((inv) => inv.status === "cancelled").length;
  const visible = showCancelled
    ? invoices
    : invoices.filter((inv) => inv.status !== "cancelled");

  function refresh() {
    setCancelling(null);
    setDeleting(null);
    router.refresh();
  }

  if (!invoices || invoices.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          {emptyMessage}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="gap-0 overflow-hidden py-0">
        {cancelledCount > 0 && (
          <div className="flex items-center justify-between gap-4 border-b bg-muted/40 px-6 py-3 text-sm">
            <span className="text-muted-foreground">
              {cancelledCount} factura{cancelledCount === 1 ? "" : "s"} anulada
              {cancelledCount === 1 ? "" : "s"}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCancelled((value) => !value)}
            >
              {showCancelled ? "Ocultar anuladas" : "Mostrar anuladas"}
            </Button>
          </div>
        )}

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Emitida</TableHead>
                <TableHead>Periodo</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Concepto</TableHead>
                <TableHead className="text-right">Importe</TableHead>
                <TableHead>Origen</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="pr-6 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((invoice) => {
                const status = statusMap[invoice.status] || {
                  label: invoice.status,
                  variant: "outline",
                };
                const cancelled = invoice.status === "cancelled";
                const canDelete = invoice.status === "pending" || invoice.status === "failed";

                return (
                  <TableRow key={invoice.id} className={cancelled ? "opacity-60" : undefined}>
                    <TableCell className="pl-6 whitespace-nowrap text-muted-foreground">
                      {formatDate(invoice.issuedAt)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap font-medium">
                      <span className={cancelled ? "line-through" : undefined}>
                        {monthName(invoice.month)} {invoice.year}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-[180px] truncate">
                      {invoice.recipientName || invoice.recipientEmail}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-muted-foreground">
                      {invoice.description}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right font-medium">
                      {formatMoney(invoice.amount, invoice.currency)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {sourceMap[invoice.source] || invoice.source}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={status.variant}
                        title={invoice.cancelReason || invoice.error || undefined}
                      >
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button asChild variant="ghost" size="icon" title="Descargar PDF">
                          <a
                            href={`/api/invoices/${invoice.id}/pdf`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <Download />
                            <span className="sr-only">Descargar PDF</span>
                          </a>
                        </Button>
                        {invoice.status === "sent" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Anular factura"
                            onClick={() => setCancelling(invoice)}
                          >
                            <Ban />
                            <span className="sr-only">Anular factura</span>
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Eliminar factura"
                            onClick={() => setDeleting(invoice)}
                          >
                            <Trash2 />
                            <span className="sr-only">Eliminar factura</span>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {cancelling && (
        <CancelDialog invoice={cancelling} onClose={() => setCancelling(null)} onDone={refresh} />
      )}
      {deleting && (
        <DeleteDialog invoice={deleting} onClose={() => setDeleting(null)} onDone={refresh} />
      )}
    </>
  );
}
