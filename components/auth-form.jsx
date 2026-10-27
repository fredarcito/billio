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

// Icono de Google en blanco (versión monocroma de la "G", en línea para no añadir dependencias):
// el logo a color no tiene contraste sobre el botón azul.
function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4" fill="currentColor">
      <path d="M12 11v2.4h5.6c-.24 1.4-1.72 4.1-5.6 4.1A6.5 6.5 0 0 1 12 4.5c1.85 0 3.1.79 3.8 1.47l2.6-2.5A9.6 9.6 0 0 0 12 1a11 11 0 1 0 0 22c6.35 0 10.55-4.46 10.55-10.75 0-.72-.08-1.27-.18-1.82L12 11Z" />
    </svg>
  );
}
