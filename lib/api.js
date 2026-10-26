import { NextResponse } from "next/server";

// Respuesta JSON de error estandarizada
export function jsonError(message, status = 400, extra = {}) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

// Valida un email con una expresión sencilla
export function isValidEmail(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Lee el cuerpo JSON de la petición sin lanzar excepciones
export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
