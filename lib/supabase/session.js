// Renueva la sesión de Supabase en cada petición (se llama desde middleware.js): leer los claims
// refresca un token caducado y las cookies nuevas van a la petición y a la respuesta.
import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

export const refreshSession = async (request) => {
  let response = NextResponse.next({ request });
  // Sin configuración no hay nada que renovar (p. ej. en local antes de rellenar .env.local)
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    return response;
  }
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );
  // Nada puede ejecutarse entre crear el cliente y esta llamada (Supabase: o las sesiones
  // terminan de forma aleatoria)
  await supabase.auth.getClaims();
  // Esta respuesta exacta lleva las cookies renovadas
  return response;
};
