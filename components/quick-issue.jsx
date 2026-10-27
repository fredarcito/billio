"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarDays, Eye, Loader2, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InvoicePreviewDialog } from "@/components/invoice-preview-dialog";
import { formatMoney, monthName, selectablePeriods } from "@/lib/format";

// Agrupa los periodos por año (de más reciente a más antiguo)
function groupByYear(periods) {
  const groups = [];
  for (const period of periods) {
    let group = groups.find((g) => g.year === period.year);
    if (!group) {
      group = { year: period.year, periods: [] };
      groups.push(group);
    }
    group.periods.push(period);
  }
  return groups;
}

// Emisión manual: el usuario solo elige el mes y pulsa el botón
export function QuickIssue({ profile }) {
  const router = useRouter();
  const periods = useMemo(() => selectablePeriods(), []);
  const groups = useMemo(() => groupByYear(periods), [periods]);
  const [value, setValue] = useState(`${periods[0].year}-${periods[0].month}`);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const [year, month] = value.split("-").map(Number);

  // Paso 1: pide el borrador al servidor (no guarda ni envía nada) y abre la vista previa
  async function handlePreview() {
    setLoading(true);
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, month, preview: true }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || "No se pudo preparar la factura");
      }

      // Modo por horas: el servidor crea el borrador y se edita en su propia pantalla
      if (data?.draft === true && data?.invoice?.id) {
        router.push(`/invoices/draft/${data.invoice.id}`);
        return;
      }

      setDraft(data.draft);
      setPreviewOpen(true);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <CardHeader className="border-b bg-muted/40 py-5">
        <CardTitle className="flex items-center gap-2">
          <Send className="size-4 text-primary" />
          Emitir factura
        </CardTitle>
        <CardDescription>
          {profile.billingMode === "hourly"
            ? "Selecciona el mes. Billio creará un borrador para que pongas las horas y lo confirmes."
            : "Selecciona el mes. Billio usará los datos de tu perfil para generar el PDF y enviarlo."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 py-6">
        <div className="space-y-2">
          <Label htmlFor="period">Mes a facturar</Label>
          <Select value={value} onValueChange={setValue} disabled={loading}>
            <SelectTrigger id="period" className="h-11 w-full">
              <span className="flex items-center gap-2">
                <CalendarDays className="size-4 text-muted-foreground" />
                <SelectValue placeholder="Selecciona un mes" />
              </span>
            </SelectTrigger>
            <SelectContent position="popper" className="max-h-72 w-(--radix-select-trigger-width)">
              {groups.map((group, index) => (
                <SelectGroup key={group.year}>
                  {index > 0 && <SelectSeparator />}
                  <SelectLabel>{group.year}</SelectLabel>
                  {group.periods.map((p) => (
                    <SelectItem key={`${p.year}-${p.month}`} value={`${p.year}-${p.month}`}>
                      {monthName(p.month)}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-lg border bg-muted/40 p-4 text-sm">
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <div className="text-muted-foreground">Emisor</div>
              <div className="font-medium">{profile.issuerName}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Cliente</div>
              <div className="font-medium">{profile.recipientName || "Sin nombre"}</div>
              <div className="break-all text-xs text-muted-foreground">
                {profile.recipientEmail}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">
                {profile.billingMode === "hourly" ? "Tarifa" : "Importe"}
              </div>
              <div className="font-medium">
                {profile.billingMode === "hourly"
                  ? `${formatMoney(profile.hourlyRate, profile.currency)} / ${profile.hourlyUnit}`
                  : formatMoney(profile.amount, profile.currency)}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Concepto</div>
              <div className="font-medium">{profile.description}</div>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="border-t bg-muted/40 py-4">
        <Button size="lg" className="w-full" onClick={handlePreview} disabled={loading}>
          {loading ? <Loader2 className="animate-spin" /> : <Eye />}
          {loading
            ? "Preparando factura..."
            : profile.billingMode === "hourly"
              ? "Preparar borrador"
              : "Revisar y enviar factura"}
        </Button>
      </CardFooter>

      <InvoicePreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        draft={draft}
        onSent={() => setDraft(null)}
      />
    </Card>
  );
}
