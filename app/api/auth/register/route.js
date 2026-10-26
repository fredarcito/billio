import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabase/server";
import { isValidEmail, jsonError, readJson } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/auth/register — crea la cuenta en Supabase Auth (el nombre va en los metadatos).
// Si el proyecto pide confirmar el email, no hay sesión todavía: el cliente avisa de que revise el correo.
export async function POST(request) {
  const body = await readJson(request);
  const name = String(body?.name || "").trim();
  const email = String(body?.email || "").trim().toLowerCase();
  const password = String(body?.password || "");

  if (!name) return jsonError("El nombre es obligatorio");
  if (!isValidEmail(email)) return jsonError("El email no es válido");
  if (password.length < 8) return jsonError("La contraseña debe tener al menos 8 caracteres");

  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  });

  if (error) {
    const taken = error.code === "user_already_exists" || error.status === 422;
    return jsonError(
      taken ? "Ya existe una cuenta con ese email" : error.message,
      taken ? 409 : 400
    );
  }

  const user = data.user;
  return NextResponse.json(
    {
      user: user ? { id: user.id, name, email: user.email } : null,
      // false = Supabase ha enviado un correo de confirmación y aún no hay sesión
      signedIn: Boolean(data.session),
    },
    { status: 201 }
  );
}
