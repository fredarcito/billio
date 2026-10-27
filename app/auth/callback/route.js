// Callback del login con Google (OAuth): Supabase devuelve aquí el código y la sesión
// queda en las cookies. Después se redirige a la app.
import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabase/server";
import { appOrigin } from "@/lib/url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const origin = appOrigin(request);
  const code = searchParams.get("code");
  // Solo rutas internas (evita redirecciones abiertas)
  const nextParam = searchParams.get("next") || "/dashboard";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/dashboard";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=oauth`);
  }

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=oauth`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
