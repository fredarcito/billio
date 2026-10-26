"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CURRENCIES = ["EUR", "USD", "MXN", "ARS", "COP", "CLP", "PEN", "GBP", "BRL"];

// Formulario de configuración del perfil de facturación
export function ProfileForm({ initialProfile, userEmail }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    issuerName: initialProfile?.issuerName || "",
    recipientEmail: initialProfile?.recipientEmail || "",
    amount: initialProfile?.amount ?? "",
    currency: initialProfile?.currency || "EUR",
    description: initialProfile?.description || "",
    autoSend: initialProfile?.autoSend ?? true,
  });

  function update(field) {
    return (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, amount: Number(form.amount) }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(data.error || "No se pudo guardar el perfil");

      toast.success("Perfil guardado correctamente");
      router.refresh();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle>Datos de facturación</CardTitle>
          <CardDescription>Cuenta: {userEmail}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="issuerName">Nombre del emisor</Label>
            <Input
              id="issuerName"
              placeholder="Ej. Ana García · Diseño Web"
              value={form.issuerName}
              onChange={update("issuerName")}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="recipientEmail">Email predeterminado del destinatario</Label>
            <Input
              id="recipientEmail"
              type="email"
              placeholder="cliente@empresa.com"
              value={form.recipientEmail}
              onChange={update("recipientEmail")}
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="amount">Valor mensual por defecto</Label>
              <Input
                id="amount"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="1200.00"
                value={form.amount}
                onChange={update("amount")}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Moneda</Label>
              <Select
                value={form.currency}
                onValueChange={(value) => setForm((prev) => ({ ...prev, currency: value }))}
              >
                <SelectTrigger id="currency">
                  <SelectValue placeholder="Moneda" />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((code) => (
                    <SelectItem key={code} value={code}>
                      {code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción / concepto base</Label>
            <Input
              id="description"
              placeholder="Ej. Servicios de diseño y mantenimiento web"
              value={form.description}
              onChange={update("description")}
              required
            />
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-4">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 accent-primary"
              checked={form.autoSend}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, autoSend: event.target.checked }))
              }
            />
            <span className="text-sm">
              <span className="font-medium">Envío automático mensual</span>
              <span className="block text-muted-foreground">
                Emitir y enviar la factura automáticamente el primer día de cada mes.
              </span>
            </span>
          </label>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={loading}>
            {loading ? <Loader2 className="animate-spin" /> : <Save />}
            Guardar perfil
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
