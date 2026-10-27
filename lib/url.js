// URL pública de la app (la que ve la persona en el navegador). Detrás del proxy de Vercel,
// `request.url` puede traer el host interno, así que se usan las cabeceras que añade el proxy.
// Se devuelve a la persona al mismo host por el que entró: así staging y producción (mismo
// proyecto Supabase) no se redirigen entre sí.
// NEXT_PUBLIC_APP_URL = https://tu-dominio.com (sin barra final) solo es el respaldo.
export const appOrigin = (request) => {
  const headers = request.headers;
  const host = headers.get("x-forwarded-host") || headers.get("host");
  if (host) {
    const proto = headers.get("x-forwarded-proto") || new URL(request.url).protocol.replace(":", "");
    return `${proto}://${host}`;
  }

  return process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, "") || new URL(request.url).origin;
};
