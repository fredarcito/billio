"use client";

// Editor de un borrador de factura (facturación por horas): la persona ajusta las horas,
// ve el total recalculado y confirma el envío. El total siempre lo calcula el servidor.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Download, Loader2, Plus, Send, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { formatMoney, monthName } from "@/lib/format";

const roundMoney = (value) => Math.round((Number(value) || 0) * 100) / 100;
const lineAmount = (line) => roundMoney(Number(line.quantity) * Number(line.unitPrice));

// Input numérico que acepta coma decimal (es-ES)
function NumberInput({ value, onChange, suffix, ...props }) {
  return (
    <div className="relative">
      <Input
        inputMode="decimal"
        value={value}
        onChange={(event) => onChange(event.target.value.replace(",", "."))}
        className={suffix ? "pr-10" : undefined}
        {...props}
      />
      {suffix && (
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
          {suffix}
        </span>
      )}
    </div>
  );
}

// Convierte las líneas del borrador al formato que espera la API
const toPayload = (lines) =>
  lines.map((line) => ({
    description: line.description,
    quantity: Number(line.quantity) || 0,
    unitPrice: Number(line.unitPrice) || 0,
  }));

export function DraftEditor({ invoice }) {
  const router = useRouter();
  const unit = invoice.hourlyUnit || "h";
  // Precio por defecto de una línea: la tarifa del perfil
  const defaultPrice = invoice.hourlyRate != null ? String(invoice.hourlyRate) : "";
  // Una línea con precio 0 (borrador creado antes de tener tarifa) se rellena con la tarifa
  // del perfil, para no obligar a escribirla a mano en cada línea.
  const withDefaultPrice = (price) =>
    Number(price) > 0 || !defaultPrice ? String(price) : defaultPrice;

  const [lines, setLines] = useState(
    invoice.items?.length
      ? invoice.items.map((item) => ({
          id: item.id,
          description: item.description,
          quantity: String(item.quantity),
          unitPrice: withDefaultPrice(item.unitPrice),
        }))
      : [
          {
            id: `new-${Date.now()}-0`,
            description: invoice.description || "",
            quantity: "1",
            unitPrice: defaultPrice || "0",
          },
        ]
  );
  const [nextId, setNextId] = useState(1);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  const total = roundMoney(lines.reduce((sum, line) => sum + lineAmount(line), 0));
  const hasValidLine = lines.some((line) => lineAmount(line) > 0);
  const busy = saving || sending;

  const updateLine = (id, patch) =>
    setLines((prev) => prev.map((line) => (line.id === id ? { ...line, ...patch } : line)));

  // El id de cada línea nueva debe ser único: si dos líneas comparten id, React las trata como
  // la misma y editar una modifica la otra. Se usa un contador que nunca se repite.
  const addLine = () => {
    setLines((prev) => {
      const id = `new-${Date.now()}-${nextId}`;
      return [
        ...prev,
        {
          id,
          description: "",
          quantity: "1",
          unitPrice: String(prev[0]?.unitPrice || defaultPrice),
        },
      ];
    });
    setNextId((id) => id + 1);
  };

  const removeLine = (id) => setLines((prev) => prev.filter((line) => line.id !== id));

  // Descarta el borrador: se borra la factura y el periodo queda libre
  async function handleDiscard() {
    if (!window.confirm("¿Descartar este borrador? Se borra definitivamente.")) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/invoices/drafts/${invoice.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "No se pudo descartar el borrador");
      toast.success("Borrador descartado");
      router.push("/invoices");
      router.refresh();
    } catch (error) {
      toast.error(error.message);
      setSaving(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/invoices/drafts/${invoice.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: toPayload(lines) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "No se pudo guardar el borrador");
      toast.success("Borrador guardado");
      router.refresh();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSend() {
    setSending(true);
    try {
      const res = await fetch(`/api/invoices/drafts/${invoice.id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: toPayload(lines) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "No se pudo enviar la factura");

      toast.success(`Factura de ${monthName(invoice.month)} ${invoice.year} enviada`, {
        description: `Enviada a ${data?.invoice?.recipientEmail || invoice.recipientEmail}`,
      });
      router.push("/invoices");
      router.refresh();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      {/* Cabecera */}
      <div className="space-y-3">
        <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
          <a href="/invoices">
            <ArrowLeft /> Volver
          </a>
        </Button>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">
              Factura de {monthName(invoice.month)} {invoice.year}
            </h1>
            <p className="font-mono text-sm text-muted-foreground">{invoice.number}</p>
          </div>
          <Badge variant="warning">Borrador</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Revisa las horas y confirma. Hasta que no envíes, el cliente no recibe nada.
        </p>
      </div>

      {/* Conceptos */}
      <Card>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Conceptos</h2>
            <span className="text-xs text-muted-foreground">
              {lines.length} {lines.length === 1 ? "línea" : "líneas"}
            </span>
          </div>

          <div className="hidden grid-cols-[minmax(0,1fr)_5rem_7rem_7rem_2.25rem] gap-3 px-1 text-xs font-medium text-muted-foreground sm:grid">
            <span>Concepto</span>
            <span>Cant.</span>
            <span>Precio</span>
            <span className="text-right">Importe</span>
            <span />
          </div>

          <div className="space-y-3">
            {lines.map((line) => (
              <div key={line.id} className="rounded-lg border border-border/60 p-3 sm:border-0 sm:p-0">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_5rem_7rem_7rem_2.25rem] sm:items-center">
                  <div className="space-y-1.5 sm:space-y-0">
                    <Label htmlFor={`desc-${line.id}`} className="text-xs text-muted-foreground sm:hidden">
                      Concepto
                    </Label>
                    <Input
                      id={`desc-${line.id}`}
                      placeholder="Ej. Diseño de landing page"
                      value={line.description}
                      onChange={(event) => updateLine(line.id, { description: event.target.value })}
                      disabled={busy}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:contents">
                    <div className="min-w-0 space-y-1.5 sm:space-y-0">
                      <Label htmlFor={`qty-${line.id}`} className="text-xs text-muted-foreground sm:hidden">
                        Cantidad
                      </Label>
                      <NumberInput
                        id={`qty-${line.id}`}
                        value={line.quantity}
                        onChange={(value) => updateLine(line.id, { quantity: value })}
                        suffix={unit}
                        aria-label="Cantidad"
                        disabled={busy}
                      />
                    </div>
                    <div className="min-w-0 space-y-1.5 sm:space-y-0">
                      <Label htmlFor={`price-${line.id}`} className="text-xs text-muted-foreground sm:hidden">
                        Precio
                      </Label>
                      <NumberInput
                        id={`price-${line.id}`}
                        value={line.unitPrice}
                        onChange={(value) => updateLine(line.id, { unitPrice: value })}
                        placeholder="0,00"
                        aria-label="Precio por hora"
                        disabled={busy}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <span className="text-xs text-muted-foreground sm:hidden">Importe</span>
                    <span className="text-sm font-medium tabular-nums">
                      {formatMoney(lineAmount(line), invoice.currency)}
                    </span>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => removeLine(line.id)}
                    disabled={busy || lines.length === 1}
                    title="Quitar concepto"
                    className="justify-self-end text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 />
                    <span className="sr-only">Quitar concepto</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <Button variant="outline" size="sm" onClick={addLine} disabled={busy}>
            <Plus /> Añadir concepto
          </Button>
        </CardContent>
      </Card>

      {/* Resumen */}
      <Card>
        <CardContent className="space-y-3">
          <h2 className="font-semibold">Resumen</h2>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="tabular-nums">{formatMoney(total, invoice.currency)}</span>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <span className="font-medium">Total</span>
            <span className="text-lg font-semibold tabular-nums">
              {formatMoney(total, invoice.currency)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Acciones */}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
        <Button
          variant="ghost"
          onClick={handleDiscard}
          disabled={busy}
          className="text-muted-foreground hover:text-destructive sm:mr-auto"
        >
          <Trash2 /> Descartar borrador
        </Button>
        <Button asChild variant="outline" disabled={busy}>
          <a href={`/api/invoices/${invoice.id}/pdf`} target="_blank" rel="noreferrer">
            <Download /> Ver PDF
          </a>
        </Button>
        <Button variant="secondary" onClick={handleSave} disabled={busy || !hasValidLine}>
          {saving ? <Loader2 className="animate-spin" /> : null}
          Guardar borrador
        </Button>
        <Button onClick={handleSend} disabled={busy || !hasValidLine}>
          {sending ? <Loader2 className="animate-spin" /> : <Send />}
          {sending ? "Enviando..." : "Confirmar y enviar"}
        </Button>
      </div>
      {!hasValidLine && (
        <p className="text-right text-xs text-muted-foreground">
          Añade al menos un concepto con importe mayor que 0 para poder enviar.
        </p>
      )}
    </div>
  );
}
