import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/auth/logout — cierra la sesión de Supabase (borra sus cookies)
export async function POST() {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}
