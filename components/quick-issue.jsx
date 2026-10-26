"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";

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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatMoney, monthName, selectablePeriods } from "@/lib/format";

// Emisión manual: el usuario solo elige el mes y pulsa el botón
export function QuickIssue({ profile }) {
  const router = useRouter();
  const periods = useMemo(() => selectablePeriods(), []);
  const [value, setValue] = useState(`${periods[0].year}-${periods[0].month}`);
  const [loading, setLoading] = useState(false);

  const [year, month] = value.split("-").map(Number);

  async function handleIssue() {
    setLoading(true);
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, month }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || "No se pudo emitir la factura");
      }

      toast.success(`Factura de ${monthName(month)} ${year} enviada`, {
        description: `Enviada a ${data.invoice.recipientEmail}`,
      });
      router.refresh();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Emitir factura</CardTitle>
        <CardDescription>
          Selecciona el mes. Billio usará los datos de tu perfil para generar el PDF y enviarlo.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="period">Mes a facturar</Label>
          <Select value={value} onValueChange={setValue} disabled={loading}>
            <SelectTrigger id="period" className="h-11">
              <SelectValue placeholder="Selecciona un mes" />
            </SelectTrigger>
            <SelectContent>
              {periods.map((p) => (
                <SelectItem key={`${p.year}-${p.month}`} value={`${p.year}-${p.month}`}>
                  {p.label}
                </SelectItem>
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
              <div className="text-muted-foreground">Destinatario</div>
              <div className="break-all font-medium">{profile.recipientEmail}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Importe</div>
              <div className="font-medium">{formatMoney(profile.amount, profile.currency)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Concepto</div>
              <div className="font-medium">{profile.description}</div>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button size="lg" className="w-full" onClick={handleIssue} disabled={loading}>
          {loading ? <Loader2 className="animate-spin" /> : <Send />}
          {loading ? "Generando y enviando…" : "Generar y Enviar Factura"}
        </Button>
      </CardFooter>
    </Card>
  );
}
