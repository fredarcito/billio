"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Building2,
  CalendarClock,
  Check,
  Info,
  Loader2,
  Mail,
  Receipt,
  Save,
  User,
  Wallet,
} from "lucide-react";

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
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatMoney, nextSendDate } from "@/lib/format";

const CURRENCIES = ["EUR", "USD", "MXN", "ARS", "COP", "CLP", "PEN", "GBP", "BRL"];

// Ayuda bajo cada campo: qué es y para qué se usa en la factura
function FieldHint({ children }) {
  return (
    <p className="flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground">
      <Info className="mt-0.5 size-3 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

// Título de bloque dentro de la tarjeta
function SectionTitle({ icon: Icon, title, description }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-4" />
      </span>
      <div className="space-y-0.5">
        <h3 className="text-sm font-semibold">{title}</h3>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
    </div>
  );
}

// Formulario de configuración del perfil de facturación
export function ProfileForm({ initialProfile, userEmail }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    issuerName: initialProfile?.issuerName || "",
    recipientEmail: initialProfile?.recipientEmail || "",
    recipientName: initialProfile?.recipientName || "",
    recipientTaxId: initialProfile?.recipientTaxId || "",
    amount: initialProfile?.amount ?? "",
    currency: initialProfile?.currency || "EUR",
    description: initialProfile?.description || "",
    autoSend: initialProfile?.autoSend ?? true,
    sendDay: initialProfile?.sendDay ?? 1,
    replyToEmail: initialProfile?.replyToEmail || "",
  });

  const replyTo = form.replyToEmail || userEmail;
  const amountValue = Number(form.amount);
  const amountPreview =
    Number.isFinite(amountValue) && amountValue > 0
      ? formatMoney(amountValue, form.currency)
      : null;

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
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card className="gap-0 overflow-hidden py-0">
        <CardHeader className="border-b bg-muted/40 py-5">
          <CardTitle className="flex items-center gap-2">
            <Receipt className="size-4 text-primary" />
            Datos de facturación
          </CardTitle>
          <CardDescription>
            Cuenta: <span className="font-medium text-foreground">{userEmail}</span>
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-8 py-6">
          {/* --- Emisor --- */}
          <section className="space-y-4">
            <SectionTitle
              icon={User}
              title="Emisor"
              description="Quién aparece como autor de la factura."
            />
            <div className="space-y-2">
              <Label htmlFor="issuerName">Nombre o razón social</Label>
              <Input
                id="issuerName"
                placeholder="Ej. Ana García · Diseño Web"
                value={form.issuerName}
                onChange={update("issuerName")}
                required
              />
              <FieldHint>
                Se imprime en la cabecera del PDF y en el asunto del correo.
              </FieldHint>
            </div>
          </section>

          <Separator />

          {/* --- Destinatario --- */}
          <section className="space-y-4">
            <SectionTitle
              icon={Mail}
              title="Destinatario"
              description="A quién se envía la factura cada mes."
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="recipientName">Nombre del cliente</Label>
                <Input
                  id="recipientName"
                  placeholder="Ej. Acme Studio S.L."
                  value={form.recipientName}
                  onChange={update("recipientName")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="recipientTaxId">
                  NIF / CIF
                  <span className="ml-2 font-normal text-muted-foreground">(opcional)</span>
                </Label>
                <Input
                  id="recipientTaxId"
                  placeholder="Ej. B12345678"
                  value={form.recipientTaxId}
                  onChange={update("recipientTaxId")}
                />
              </div>
            </div>
            <FieldHint>
              El nombre y el NIF aparecen en el bloque DESTINATARIO de la factura. Son
              obligatorios en una factura real, pero puedes completarlos más tarde.
            </FieldHint>

            <div className="space-y-2">
              <Label htmlFor="recipientEmail">Email del cliente</Label>
              <Input
                id="recipientEmail"
                type="email"
                placeholder="cliente@empresa.com"
                value={form.recipientEmail}
                onChange={update("recipientEmail")}
                required
              />
              <FieldHint>
                Recibirá el correo con el PDF adjunto. Puedes cambiarlo antes de cada envío
                manual.
              </FieldHint>
            </div>

            <div className="space-y-2">
              <Label htmlFor="replyToEmail">
                Email para respuestas
                <span className="ml-2 font-normal text-muted-foreground">(opcional)</span>
              </Label>
              <Input
                id="replyToEmail"
                type="email"
                placeholder={userEmail}
                value={form.replyToEmail}
                onChange={update("replyToEmail")}
              />
              <FieldHint>
                Si tu cliente pulsa «Responder», el mensaje llega a{" "}
                <span className="font-medium text-foreground">{replyTo}</span>. El correo
                siempre se envía desde el dominio de Billio para que no acabe en spam.
              </FieldHint>
            </div>
          </section>

          <Separator />

          {/* --- Importe --- */}
          <section className="space-y-4">
            <SectionTitle
              icon={Wallet}
              title="Importe"
              description="El valor que se factura cada mes."
            />
            <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
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
                  <SelectTrigger id="currency" className="sm:w-28">
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
            <FieldHint>
              {amountPreview
                ? `Se facturarán ${amountPreview} al mes.`
                : "Introduce un importe mayor que 0."}
            </FieldHint>
          </section>

          <Separator />

          {/* --- Concepto --- */}
          <section className="space-y-4">
            <SectionTitle
              icon={Building2}
              title="Concepto"
              description="La descripción del servicio que aparece en la factura."
            />
            <div className="space-y-2">
              <Label htmlFor="description">Descripción del servicio</Label>
              <Input
                id="description"
                placeholder="Ej. Servicios de diseño y mantenimiento web"
                value={form.description}
                onChange={update("description")}
                required
              />
              <FieldHint>
                Aparece en la línea de detalle del PDF y en el cuerpo del correo.
              </FieldHint>
            </div>
          </section>

          <Separator />

          {/* --- Automatización --- */}
          <section className="space-y-4">
            <SectionTitle
              icon={CalendarClock}
              title="Automatización"
              description="Envío mensual sin intervención."
            />
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border bg-muted/30 p-4 transition-colors hover:bg-muted/50">
              <input
                type="checkbox"
                className="mt-0.5 size-4 accent-primary"
                checked={form.autoSend}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, autoSend: event.target.checked }))
                }
              />
              <span className="space-y-1 text-sm">
                <span className="block font-medium">Envío automático mensual</span>
                <span className="block text-xs leading-relaxed text-muted-foreground">
                  Cada mes Billio emite y envía la factura sin que tengas que hacer nada.
                  Nunca se duplica: si ya existe una factura de ese periodo, se omite.
                </span>
              </span>
            </label>

            {form.autoSend && (
              <div className="space-y-2">
                <Label htmlFor="sendDay" className="text-sm">
                  Día del mes
                </Label>
                <Select
                  value={String(form.sendDay)}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, sendDay: Number(value) }))}
                >
                  <SelectTrigger id="sendDay">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 28 }, (_, index) => index + 1).map((day) => (
                      <SelectItem key={day} value={String(day)}>
                        Día {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldHint>
                  {form.sendDay === 1
                    ? "El día 1 se factura el mes en curso."
                    : `El día ${form.sendDay} se factura el mes anterior. La próxima saldrá el ${nextSendDate(Number(form.sendDay)).toLocaleDateString("es-ES", { day: "numeric", month: "long", timeZone: "UTC" })}.`}
                </FieldHint>
              </div>
            )}
          </section>
        </CardContent>

        <CardFooter className="justify-between gap-4 border-t bg-muted/40 py-4">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Check className="size-3.5 text-primary" />
            Los cambios se aplican a las próximas facturas.
          </p>
          <Button type="submit" disabled={loading}>
            {loading ? <Loader2 className="animate-spin" /> : <Save />}
            Guardar perfil
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
