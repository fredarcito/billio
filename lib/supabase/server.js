// Supabase en el servidor (route handlers y componentes de servidor), con la sesión de las cookies.
// Con Fluid compute un cliente no se comparte entre peticiones: se crea uno por petición.
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const supabaseServer = async () => {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Se llama mientras se renderiza, donde no se pueden escribir cookies:
            // el middleware renueva la sesión en la siguiente petición.
          }
        },
      },
    }
  );
};

// La persona con sesión (su id) desde las cookies, o null
export const signedInUserId = async (supabase) => {
  const { data } = await supabase.auth.getClaims();
  return data?.claims?.sub ?? null;
};
