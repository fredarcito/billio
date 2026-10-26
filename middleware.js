import { refreshSession } from "@/lib/supabase/session";

// Renueva la sesión de Supabase en cada petición (las cookies caducan y hay que refrescarlas).
// Next 14 llama a este archivo "middleware" (en Next 16 se llama "proxy").
export const middleware = async (request) => refreshSession(request);

export const config = {
  // Todo menos estáticos e imágenes
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
