import Link from "next/link";
import { Check } from "lucide-react";

// Marco visual de las pantallas de acceso. Usa el mismo lenguaje que la home:
// fondo cálido, tarjetas blancas con sombra suave y el amarillo como acento.
const highlights = [
  "Tu factura sale sola el día que toca",
  "En PDF y por email, sin plantillas",
  "Cobras antes y dejas de perseguir pagos",
];

export function AuthShell({ children }) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f6f6f4]">
      {/* Halo azul suave, igual que el hero */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(60%_100%_at_50%_0%,color-mix(in_oklab,var(--color-primary)_10%,transparent),transparent_70%)]"
      />

      <div className="relative mx-auto flex min-h-screen w-full max-w-5xl flex-col px-5 sm:px-6">
        {/* Cabecera */}
        <header className="flex h-16 items-center justify-between sm:h-20">
          <Link href="/" className="flex items-center gap-2 text-base font-semibold tracking-tight">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
              B
            </span>
            Billio
          </Link>
          <Link
            href="/"
            className="text-sm font-medium text-black/50 transition-colors hover:text-black"
          >
            Volver al inicio
          </Link>
        </header>

        {/* Contenido */}
        <div className="flex flex-1 flex-col justify-center py-8 sm:py-10">
          <div className="grid w-full items-center gap-10 lg:grid-cols-2 lg:gap-20">
            {/* Columna de marca */}
            <div className="text-center lg:text-left">
              <span className="inline-flex items-center rounded-full border border-black/5 bg-white px-3 py-1 text-xs font-medium text-black/50 shadow-sm">
                Facturación sin complicaciones
              </span>
              <h2 className="mt-4 text-[1.9rem] font-semibold leading-[1.12] tracking-[-0.03em] text-balance sm:text-[2.4rem]">
                Cobra a tiempo.{" "}
                <span className="relative isolate inline-block">
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-[-0.15em] inset-y-[0.08em] -z-10 -rotate-1 rounded-md bg-[#ffd84d]"
                  />
                  Sin perseguir a nadie.
                </span>
              </h2>
              <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-black/50 sm:text-[15px] lg:mx-0">
                Se acabó facturar a última hora. Tu factura sale sola el día que toca y tú cobras
                sin haber pensado en ello.
              </p>
              <ul className="mx-auto mt-6 hidden max-w-sm space-y-2.5 sm:block lg:mx-0">
                {highlights.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-black/60">
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Check className="size-3" strokeWidth={3} />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Tarjeta del formulario */}
            <div className="mx-auto w-full max-w-sm rounded-3xl border border-black/5 bg-white p-6 shadow-[0_30px_70px_-40px_rgba(0,0,0,0.35)] sm:p-9">
              {children}
            </div>
          </div>
        </div>

        {/* Pie */}
        <footer className="flex h-14 items-center justify-center text-xs text-black/40">
          © {new Date().getFullYear()} Billio. Facturación sin complicaciones.
        </footer>
      </div>
    </main>
  );
}
