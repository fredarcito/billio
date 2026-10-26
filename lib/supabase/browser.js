// Supabase en el navegador: registro, login y logout.
// Solo la clave publicable llega al navegador; la sesión viaja en cookies compartidas con el servidor.
import { createBrowserClient } from "@supabase/ssr";

let client = null;

// Un cliente para toda la página (guarda la sesión en cookies, compartidas con el servidor)
export const supabaseBrowser = () => {
  client ??= createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
  return client;
};
