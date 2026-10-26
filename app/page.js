import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  CalendarCheck,
  Check,
  Download,
  FileText,
  Mail,
  Send,
  Sparkles,
  Zap,
} from "lucide-react";

import { ParallaxGroup } from "@/components/parallax-group";
import { Button } from "@/components/ui/button";
import { getSessionUser } from "@/lib/db";

export const dynamic = "force-dynamic";

const benefits = [
  {
    icon: Zap,
    title: "Cobras antes",
    description:
      "La factura sale el primer día del mes, no cuando te acuerdas. Menos días esperando y menos conversaciones incómodas para reclamar.",
  },
  {
    icon: CalendarCheck,
    title: "Dejas de acordarte de facturar",
    description:
      "Ni alarmas, ni notas en el móvil, ni el agobio del último día. Tu facturación funciona aunque estés de vacaciones o a tope de trabajo.",
  },
  {
    icon: Download,
    title: "Tienes todo a mano cuando te lo piden",
    description:
      "El gestor, el banco o el cliente te piden una factura de hace meses y la tienes en segundos, con su PDF y su estado.",
  },
];

const steps = [
  {
    title: "Entra con Google",
    description: "Un clic y ya estás dentro. Sin formularios ni contraseñas nuevas que recordar.",
  },
  {
    title: "Dinos qué facturas",
    description: "Tus datos, los de tu cliente y el importe. Una sola vez, y nunca más.",
  },
  {
    title: "Cobra sin pensar en ello",
    description: "Cada mes tu factura sale sola, en PDF y por email. Tú solo ves que el dinero entra.",
  },
];

// Tarjetas que flotan alrededor del titular (decorativas)
// `depth` marca cuánto se mueve cada tarjeta con el parallax (más alto = más cerca)
const floaters = [
  {
    icon: FileText,
    className: "left-[2%] top-[6%] -rotate-6 sm:left-[4%] sm:top-[16%]",
    depth: 2.2,
  },
  {
    icon: Mail,
    className: "left-[4%] top-[46%] rotate-3 sm:left-[11%] sm:top-[54%]",
    depth: 1.1,
  },
  {
    icon: Send,
    className: "right-[2%] top-[10%] rotate-6 sm:right-[5%] sm:top-[20%]",
    depth: 1.7,
  },
  {
    icon: CalendarCheck,
    className: "right-[5%] top-[50%] -rotate-3 sm:right-[13%] sm:top-[58%]",
    depth: 0.8,
  },
];

export default async function LandingPage() {
  const user = await getSessionUser();
  if (user) redirect("/dashboard");

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f6f6f4]">
      {/* Cabecera flotante tipo píldora */}
      <header className="sticky top-4 z-40 px-4">
        <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between rounded-full border border-black/5 bg-white/80 pl-5 pr-1.5 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.15)] backdrop-blur-xl">
          <Link href="/" className="flex items-center gap-2 text-base font-semibold tracking-tight">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
              B
            </span>
            Billio
          </Link>
          <Link
            href="/login"
            className="group inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium text-black/70 transition-colors hover:bg-black/[0.04] hover:text-black"
          >
            Iniciar sesión
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative px-5 pt-12 pb-14 sm:pt-24 sm:pb-24">
        {/* Tarjetas flotantes decorativas */}
        <ParallaxGroup
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
        >
          {floaters.map(({ icon: Icon, className, depth }, index) => (
            <div key={index} data-depth={depth} className={`absolute ${className}`}>
              <div className="flex size-14 items-center justify-center rounded-2xl border border-black/5 bg-white shadow-[0_20px_50px_-20px_rgba(0,0,0,0.25)] sm:size-24 sm:rounded-3xl">
                <Icon className="size-5 text-primary/70 sm:size-8" strokeWidth={1.5} />
              </div>
            </div>
          ))}
        </ParallaxGroup>

        {/* En móvil, un velo difuminado sobre las tarjetas para que el texto siempre se lea */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-1/4 h-1/2 bg-[#f6f6f4]/70 backdrop-blur-md sm:hidden"
        />

        <div className="relative mx-auto w-full max-w-3xl text-center">
          <h1 className="relative text-[2.6rem] font-semibold leading-[1.05] tracking-[-0.03em] text-balance sm:text-6xl lg:text-[4.25rem]">
            Cobra a tiempo.{" "}
            <span className="relative isolate inline-block">
              <span
                aria-hidden="true"
                className="absolute inset-x-[-0.15em] inset-y-[0.08em] -z-10 -rotate-1 rounded-md bg-[#ffd84d]"
              />
              Sin perseguir a nadie.
            </span>
          </h1>

          <p className="relative mx-auto mt-6 max-w-md text-[15px] leading-relaxed text-pretty text-black/55 sm:text-base">
            Se acabó facturar a última hora. Tu factura sale sola el día que toca y tú
            cobras sin haber pensado en ello.
          </p>

          <div className="relative mt-8 flex justify-center">
            <Button
              asChild
              size="lg"
              className="h-12 rounded-full px-6 text-[15px] font-medium shadow-[0_10px_30px_-10px_rgba(43,106,224,0.6)]"
            >
              <Link href="/login">
                Empezar con Google
                <span className="ml-1 flex size-6 items-center justify-center rounded-full bg-white/20">
                  <ArrowRight className="size-3.5" />
                </span>
              </Link>
            </Button>
          </div>

          <p className="mt-4 text-xs text-black/40">
            Gratis · Sin tarjeta · Listo en menos de un minuto
          </p>
        </div>

        {/* Vista previa del producto */}
        <div className="relative mx-auto mt-16 w-full max-w-3xl">
          <div className="rounded-[1.75rem] border border-black/5 bg-white p-2 shadow-[0_40px_80px_-40px_rgba(0,0,0,0.35)]">
            <div className="rounded-[1.4rem] bg-[#fafaf9] p-5 sm:p-7">
              <div className="mb-5 flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-black/10" />
                <span className="size-2 rounded-full bg-black/10" />
                <span className="size-2 rounded-full bg-black/10" />
              </div>

              <div className="grid gap-3 sm:grid-cols-[1.4fr_1fr]">
                <div className="rounded-2xl border border-black/5 bg-white p-5 text-left shadow-sm">
                  <p className="text-xs font-medium text-black/45">Factura de octubre</p>
                  <p className="mt-1.5 text-2xl font-semibold tracking-tight tabular-nums">
                    1.385,00{" "}
                    <span className="text-base font-normal text-black/40">US$</span>
                  </p>
                  <div className="mt-4 space-y-2 text-xs text-black/50">
                    <div className="flex items-center gap-2">
                      <FileText className="size-3.5 shrink-0" />
                      <span className="truncate">Servicios de desarrollo de software</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="size-3.5 shrink-0" />
                      <span className="truncate">cliente@empresa.com</span>
                    </div>
                  </div>
                  <div className="mt-5 flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground">
                    <Send className="size-3.5" />
                    Enviar factura
                  </div>
                </div>

                <div className="flex flex-col justify-between gap-3">
                  <div className="rounded-2xl border border-black/5 bg-white p-4 text-left shadow-sm">
                    <div className="flex items-center gap-2 text-xs font-medium text-emerald-600">
                      <span className="flex size-4 items-center justify-center rounded-full bg-emerald-500/15">
                        <Check className="size-2.5" />
                      </span>
                      Enviada
                    </div>
                    <p className="mt-2 text-xs text-black/45">a cliente@empresa.com</p>
                  </div>
                  <div className="rounded-2xl border border-black/5 bg-white p-4 text-left shadow-sm">
                    <p className="text-xs font-medium">Envío automático</p>
                    <p className="mt-1 text-xs text-black/45">Próxima factura: 1 de noviembre</p>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-black/5">
                      <div className="h-full w-2/3 rounded-full bg-primary" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Ventajas */}
      <section className="relative px-5 py-14 sm:px-6 sm:py-24">
        <div className="mx-auto w-full max-w-5xl">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center rounded-full border border-black/5 bg-white px-3 py-1 text-xs font-medium text-black/50 shadow-sm">
              Por qué Billio
            </span>
            <h2 className="mt-5 text-3xl font-semibold tracking-[-0.02em] text-balance sm:text-[2.6rem] sm:leading-[1.1]">
              Facturar no debería quitarte tiempo ni sueño
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-[15px] leading-relaxed text-black/50">
              No es solo que la factura se envíe sola. Es que cobras antes, dejas de perseguir
              pagos y te quitas de encima la tarea que siempre acabas dejando para mañana.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:mt-14 sm:grid-cols-3 sm:gap-5">
            {benefits.map(({ icon: Icon, title, description }, index) => (
              <div
                key={title}
                className="group relative overflow-hidden rounded-3xl border border-black/5 bg-white p-7 shadow-[0_20px_50px_-30px_rgba(0,0,0,0.3)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_30px_60px_-30px_rgba(0,0,0,0.35)]"
              >
                {/* Halo que aparece al pasar el ratón */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -top-16 -right-16 size-40 rounded-full bg-primary/10 opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100"
                />
                <div className="relative flex items-start justify-between">
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[0_10px_20px_-10px_rgba(43,106,224,0.8)]">
                    <Icon className="size-5" strokeWidth={1.75} />
                  </span>
                  <span className="text-4xl font-semibold tracking-tighter text-black/[0.06] tabular-nums">
                    0{index + 1}
                  </span>
                </div>
                <h3 className="relative mt-6 text-lg font-semibold tracking-tight">{title}</h3>
                <p className="relative mt-2 text-sm leading-relaxed text-black/50">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="px-5 py-14 sm:px-6 sm:py-24">
        <div className="mx-auto grid w-full max-w-5xl gap-8 sm:gap-16 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
          {/* Columna izquierda: encabezado */}
          <div className="lg:sticky lg:top-28 lg:self-start">
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
              Cómo funciona
            </span>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.02em] text-balance sm:text-[2.6rem] sm:leading-[1.1]">
              Funciona desde el primer minuto
            </h2>
            <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-black/50">
              Tres pasos y no vuelves a pensar en la factura hasta el mes que viene.
            </p>
          </div>

          {/* Columna derecha: pasos sin tarjetas */}
          <ol className="relative">
            {/* Línea vertical que une los pasos */}
            <span
              aria-hidden="true"
              className="absolute left-[1.375rem] top-3 bottom-3 w-px bg-[linear-gradient(180deg,transparent,rgba(0,0,0,0.12)_12%,rgba(0,0,0,0.12)_88%,transparent)]"
            />

            {steps.map((step, index) => (
              <li key={step.title} className="relative flex gap-6 pb-12 last:pb-0">
                <span className="relative z-10 flex size-11 shrink-0 items-center justify-center rounded-full border border-black/5 bg-white text-sm font-semibold text-black shadow-[0_6px_16px_-8px_rgba(0,0,0,0.3)]">
                  {index + 1}
                </span>
                <div className="pt-1.5">
                  <h3 className="text-lg font-semibold tracking-tight">{step.title}</h3>
                  <p className="mt-1.5 max-w-md text-[15px] leading-relaxed text-black/50">
                    {step.description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Cierre */}
      <section className="px-5 pb-14 sm:px-6 sm:pb-20">
        <div className="relative mx-auto w-full max-w-5xl overflow-hidden rounded-[2rem] border border-black/5 bg-white px-6 py-12 text-center shadow-[0_40px_80px_-50px_rgba(0,0,0,0.35)] sm:py-14">
          {/* Halo azul suave, el mismo lenguaje del hero */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(60%_100%_at_50%_0%,color-mix(in_oklab,var(--color-primary)_12%,transparent),transparent_70%)]"
          />
          {/* Rejilla muy tenue */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-[0.35] [background-image:linear-gradient(to_right,rgba(0,0,0,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.04)_1px,transparent_1px)] [background-size:44px_44px] [mask-image:radial-gradient(60%_60%_at_50%_40%,black,transparent)]"
          />

          <div className="relative mx-auto max-w-xl">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-black/5 bg-[#f6f6f4] px-3 py-1 text-xs font-medium text-black/50">
              <Sparkles className="size-3.5 text-primary" />
              Empieza hoy
            </span>
            <h2 className="mt-5 text-2xl font-semibold tracking-[-0.02em] text-balance sm:text-[2rem] sm:leading-[1.15]">
              Que este mes{" "}
              <span className="relative isolate inline-block">
                <span
                  aria-hidden="true"
                  className="absolute inset-x-[-0.15em] inset-y-[0.08em] -z-10 -rotate-1 rounded-md bg-[#ffd84d]"
                />
                no se te olvide cobrar
              </span>
              .
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-black/50">
              Entra con Google y deja la facturación en piloto automático.
            </p>
            <Button
              asChild
              size="lg"
              className="mt-7 h-11 rounded-full px-5 text-sm font-medium shadow-[0_10px_30px_-10px_rgba(43,106,224,0.6)]"
            >
              <Link href="/login">
                Empezar con Google
                <span className="ml-1 flex size-6 items-center justify-center rounded-full bg-white/20">
                  <ArrowRight className="size-3.5" />
                </span>
              </Link>
            </Button>
            <p className="mt-3 text-xs text-black/40">
              Gratis · Sin tarjeta · Listo en menos de un minuto
            </p>
          </div>
        </div>
      </section>

      {/* Pie */}
      <footer className="border-t border-black/5">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-between gap-3 px-5 py-8 text-xs text-black/40 sm:flex-row sm:px-6">
          <div className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-md bg-primary text-[10px] font-bold text-primary-foreground">
              B
            </span>
            Billio
          </div>
          <p>© {new Date().getFullYear()} Billio. Facturación sin complicaciones.</p>
        </div>
      </footer>
    </main>
  );
}
