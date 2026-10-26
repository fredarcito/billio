"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Download,
  Loader2,
  Mail,
  Send,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { formatDate, formatMoney, monthName } from "@/lib/format";

// Fila del resumen de la factura
function Row({ label, children, strong }) {
  return (
    <div className="flex items-start justify-between gap-6 py-2.5">
      <dt className="shrink-0 text-sm text-muted-foreground">{label}</dt>
      <dd className={`text-right text-sm ${strong ? "font-semibold" : "font-medium"}`}>
        {children}
      </dd>
    </div>
  );
}

// Vista previa de la factura antes de enviarla: revisar, descargar el PDF y confirmar
export function InvoicePreviewDialog({ open, onOpenChange, draft, onSent }) {
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [downloading, setDownloading] = useState(false);

  if (!draft) return null;

  // Descarga el PDF del borrador sin emitir la factura (se pide por POST y se abre como blob)
  async function handleDownload() {
    setDownloading(true);
    try {
      const res = await fetch("/api/invoices/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year: draft.year, month: draft.month }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "No se pudo generar el PDF");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noreferrer");
      // Se libera el blob cuando el navegador ya lo ha abierto
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setDownloading(false);
    }
  }

  async function handleSend() {
    setSending(true);
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year: draft.year, month: draft.month }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(data.error || "No se pudo enviar la factura");

      const sentTo = data?.invoice?.recipientEmail || draft.recipientEmail;
      toast.success(`Factura de ${monthName(draft.month)} ${draft.year} enviada`, {
        description: `Enviada a ${sentTo}`,
      });
      onOpenChange(false);
      onSent?.();
      router.refresh();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(value) => !sending && onOpenChange(value)}>
      <DialogContent className="gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="gap-1 border-b bg-muted/40 px-6 py-5">
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="size-4 text-primary" />
            Revisa la factura antes de enviarla
          </DialogTitle>
          <DialogDescription>
            Comprueba los datos. Todavía no se ha enviado nada.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-6 py-5">
          {/* Cabecera tipo factura */}
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-0.5">
                <div className="text-xs text-muted-foreground">Número</div>
                <div className="font-mono text-sm font-medium">{draft.number}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Periodo</div>
                <div className="text-sm font-medium">
                  {monthName(draft.month)} {draft.year}
                </div>
              </div>
            </div>

            <Separator className="my-3" />

            <dl className="divide-y">
              <Row label="Emisor">{draft.issuerName}</Row>
              <Row label="Cliente">
                <div className="space-y-0.5">
                  {draft.recipientName && <div>{draft.recipientName}</div>}
                  {draft.recipientTaxId && (
                    <div className="text-xs font-normal text-muted-foreground">
                      NIF/CIF: {draft.recipientTaxId}
                    </div>
                  )}
                  <div className="break-all text-xs font-normal text-muted-foreground">
                    {draft.recipientEmail}
                  </div>
                </div>
              </Row>
              <Row label="Concepto">{draft.description}</Row>
              <Row label="Importe" strong>
                {formatMoney(draft.amount, draft.currency)}
              </Row>
            </dl>
          </div>

          {/* Avisos */}
          <div className="space-y-2 text-xs">
            <div className="flex items-start gap-2 rounded-lg border bg-muted/40 p-3">
              <Mail className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
              <span className="text-muted-foreground">
                Se enviará un correo con el PDF adjunto. Si el cliente responde, llegará a{" "}
                <span className="font-medium text-foreground">{draft.replyToEmail}</span>.
              </span>
            </div>
            <div className="flex items-start gap-2 rounded-lg border bg-muted/40 p-3">
              <CalendarDays className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
              <span className="text-muted-foreground">
                Fecha de emisión: {formatDate(draft.issuedAt)}.
              </span>
            </div>
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
              <span>
                Al enviar, la factura queda registrada en el historial y no se puede
                modificar. Solo se puede emitir una por mes.
              </span>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 border-t bg-muted/40 px-6 py-4 sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={sending}
          >
            <ArrowLeft />
            Volver
          </Button>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={handleDownload}
              disabled={sending || downloading}
            >
              {downloading ? <Loader2 className="animate-spin" /> : <Download />}
              Ver PDF
            </Button>
            <Button onClick={handleSend} disabled={sending}>
              {sending ? <Loader2 className="animate-spin" /> : <Send />}
              {sending ? "Enviando..." : "Confirmar y enviar"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
