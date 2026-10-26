import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CalendarClock, FileText, Mail, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getSessionUser } from "@/lib/db";

export const dynamic = "force-dynamic";

const features = [
  {
    icon: Zap,
    title: "Emisión en un clic",
    description:
      "Elige el mes y pulsa «Generar y Enviar Factura». Billio usa tu perfil para crear el PDF y enviarlo.",
  },
  {
    icon: CalendarClock,
    title: "Envío automático mensual",
    description:
      "Un cron de Vercel emite y envía tus facturas el primer día de cada mes, sin duplicados.",
  },
  {
    icon: FileText,
    title: "Historial completo",
    description:
      "Consulta todas tus facturas, su estado de envío y descarga el PDF cuando lo necesites.",
  },
  {
    icon: Mail,
    title: "Entrega con Resend",
    description:
      "Correos profesionales con la factura en PDF adjunta, entregados por Resend.",
  },
];

export default async function LandingPage() {
  const user = await getSessionUser();
  if (user) redirect("/dashboard");

  return (
    <main className="min-h-screen bg-gradient-to-b from-muted/60 to-background">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
        <div className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            B
          </span>
          Billio
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost">
            <Link href="/login">Iniciar sesión</Link>
          </Button>
          <Button asChild>
            <Link href="/register">Crear cuenta</Link>
          </Button>
        </div>
      </header>

      <section className="mx-auto flex w-full max-w-6xl flex-col items-center px-6 py-20 text-center">
        <span className="mb-4 rounded-full border bg-white px-3 py-1 text-xs font-medium text-muted-foreground">
          Facturación ágil para autónomos y freelancers
        </span>
        <h1 className="max-w-3xl text-balance text-4xl font-bold tracking-tight sm:text-5xl">
          Tus facturas mensuales, enviadas solas.
        </h1>
        <p className="mt-4 max-w-xl text-balance text-lg text-muted-foreground">
          Configura tu perfil una vez y deja que Billio genere el PDF y lo envíe por email
          cada mes. O emite una factura al instante con un solo clic.
        </p>
        <div className="mt-8 flex gap-3">
          <Button asChild size="lg">
            <Link href="/register">
              Empezar gratis <ArrowRight />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/login">Ya tengo cuenta</Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-4 px-6 pb-24 sm:grid-cols-2 lg:grid-cols-4">
        {features.map(({ icon: Icon, title, description }) => (
          <Card key={title}>
            <CardContent className="p-6">
              <Icon className="mb-4 h-6 w-6 text-primary" />
              <h2 className="mb-1 font-semibold">{title}</h2>
              <p className="text-sm text-muted-foreground">{description}</p>
            </CardContent>
          </Card>
        ))}
      </section>
    </main>
  );
}
