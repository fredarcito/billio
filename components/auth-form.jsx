"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { supabaseBrowser } from "@/lib/supabase/browser";

import { Button } from "@/components/ui/button";

// Acceso a Billio: solo con Google. No hay registro aparte, la cuenta se crea al entrar
// la primera vez (el resto de métodos está oculto; el código de email sigue en app/api/auth).
export function AuthForm() {
  const [googleLoading, setGoogleLoading] = useState(false);
  const searchParams = useSearchParams();

  // Si el callback de Google falla, vuelve a /login?error=oauth
  useEffect(() => {
    if (searchParams.get("error") === "oauth") {
      toast.error("No se pudo completar el acceso con Google. Inténtalo de nuevo.");
    }
  }, [searchParams]);

  // Login con Google: Supabase redirige a Google y vuelve a /auth/callback
  async function handleGoogle() {
    setGoogleLoading(true);
    try {
      const { error } = await supabaseBrowser().auth.signInWithOAuth({
        provider: "google",
        options: {
          // El host desde el que se entra manda (así staging y producción no se pisan);
          // NEXT_PUBLIC_APP_URL solo es el respaldo si el navegador no da un origen válido.
          redirectTo: `${window.location.origin || process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "")}/auth/callback`,
          queryParams: { prompt: "select_account" },
        },
      });
      // Si no hay error, el navegador ya está navegando a Google
      if (error) throw error;
    } catch (error) {
      toast.error(error.message || "No se pudo iniciar sesión con Google");
      setGoogleLoading(false);
    }
  }

  return (
    <div className="w-full">
      <div className="mb-7 space-y-1.5">
        <h1 className="text-xl font-semibold tracking-tight">Inicia sesión</h1>
        <p className="text-sm text-black/50">Accede a tu panel para gestionar tus facturas.</p>
      </div>

      <Button
        type="button"
        className="h-11 w-full gap-3 rounded-full text-sm font-medium shadow-[0_10px_30px_-10px_rgba(43,106,224,0.6)]"
        onClick={handleGoogle}
        disabled={googleLoading}
      >
        {googleLoading ? <Loader2 className="size-4 animate-spin" /> : <GoogleIcon />}
        {googleLoading ? "Conectando con Google..." : "Iniciar sesión con Google"}
      </Button>

      <p className="mt-5 text-xs leading-relaxed text-black/40">
        Si es tu primera vez, tu cuenta se crea automáticamente con tu nombre y email de Google.
      </p>
    </div>
  );
}

// Icono de Google (SVG oficial, en línea para no añadir dependencias)
function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.57 5.57 0 0 1-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A11.99 11.99 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29a7.2 7.2 0 0 1 0-4.58V6.62H1.29a11.99 11.99 0 0 0 0 10.76l3.98-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.7 0 3.99 2.47 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75Z"
      />
    </svg>
  );
}
