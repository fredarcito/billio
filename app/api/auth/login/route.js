import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabase/server";
import { jsonError, readJson } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/auth/login — inicia sesión con Supabase Auth; la sesión queda en las cookies
export async function POST(request) {
  const body = await readJson(request);
  const email = String(body?.email || "").trim().toLowerCase();
  const password = String(body?.password || "");

  if (!email || !password) return jsonError("Email y contraseña son obligatorios");

  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data?.user) {
    const unconfirmed = error?.code === "email_not_confirmed";
    return jsonError(
      unconfirmed
        ? "Confirma tu email antes de entrar (revisa tu correo)"
        : "Credenciales incorrectas",
      401
    );
  }

  return NextResponse.json({
    user: {
      id: data.user.id,
      name: data.user.user_metadata?.name || data.user.email?.split("@")[0] || "",
      email: data.user.email,
    },
  });
}
