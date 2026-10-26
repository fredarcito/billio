import { NextResponse } from "next/server";

import { getProfile, getSessionUser } from "@/lib/db";
import { jsonError } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/auth/me — devuelve el usuario de la sesión y su perfil
export async function GET() {
  const user = await getSessionUser();
  if (!user) return jsonError("No autenticado", 401);

  const profile = await getProfile(user.id);
  return NextResponse.json({
    user: { id: user.id, name: user.name, email: user.email },
    profile: profile || null,
  });
}
