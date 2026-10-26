// Supabase en el servidor con la clave secreta: salta RLS, para lo que ninguna persona puede tocar
// (el cron: leer los perfiles con envío automático y los datos de cada cuenta). Nunca se importa
// desde código que llega al navegador.
import { createClient } from "@supabase/supabase-js";

export const supabaseAdmin = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
