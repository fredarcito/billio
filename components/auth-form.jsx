"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { supabaseBrowser } from "@/lib/supabase/browser";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Formulario compartido para login y registro
export function AuthForm({ mode = "login" }) {
  const isRegister = mode === "register";
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const searchParams = useSearchParams();

  // Si el callback de Google falla, vuelve a /login?error=oauth
  useEffect(() => {
    if (searchParams.get("error") === "oauth") {
      toast.error("No se pudo completar el acceso con Google. Inténtalo de nuevo.");
    }
  }, [searchParams]);

  function update(field) {
    return (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }));
  }

  // Login con Google: Supabase redirige a Google y vuelve a /auth/callback
  async function handleGoogle() {
    setGoogleLoading(true);
    try {
      const { error } = await supabaseBrowser().auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: { prompt: "select_account" },
        },
      });
      // Si no hay error, el navegador ya está navegando a Google
      if (error) throw error;
    } catch (error) {
      toast.error(error.message || "No se pudo iniciar sesión con Google");
      setGoogleLoading(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);

    try {
      const endpoint = isRegister ? "/api/auth/register" : "/api/auth/login";
      const payload = isRegister
        ? form
        : { email: form.email, password: form.password };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || "Ha ocurrido un error");
      }

      if (isRegister) {
        // Supabase puede pedir confirmar el email: en ese caso todavía no hay sesión
        if (!data.signedIn) {
          toast.success("Cuenta creada. Revisa tu correo para confirmarla.");
          router.push("/login");
          return;
        }
        toast.success("¡Bienvenido a Billio!");
      } else {
        toast.success("Sesión iniciada");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle className="text-xl">
            {isRegister ? "Crea tu cuenta" : "Bienvenido de nuevo"}
          </CardTitle>
          <CardDescription>
            {isRegister
              ? "Empieza a enviar tus facturas en un clic."
              : "Accede para gestionar tus facturas."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogle}
            disabled={googleLoading || loading}
          >
            {googleLoading ? <Loader2 className="animate-spin" /> : <GoogleIcon />}
            Continuar con Google
          </Button>

          <div className="relative text-center text-xs text-muted-foreground">
            <span className="relative z-10 bg-card px-2">o con tu email</span>
            <span className="absolute inset-x-0 top-1/2 -z-0 border-t" />
          </div>

          {isRegister && (
            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                autoComplete="name"
                placeholder="Tu nombre"
                value={form.name}
                onChange={update("name")}
                required
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="tu@email.com"
              value={form.email}
              onChange={update("email")}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              autoComplete={isRegister ? "new-password" : "current-password"}
              placeholder={isRegister ? "Mínimo 8 caracteres" : "••••••••"}
              minLength={isRegister ? 8 : undefined}
              value={form.password}
              onChange={update("password")}
              required
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="animate-spin" />}
            {isRegister ? "Crear cuenta" : "Iniciar sesión"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            {isRegister ? "¿Ya tienes cuenta? " : "¿No tienes cuenta? "}
            <Link
              href={isRegister ? "/login" : "/register"}
              className="font-medium text-primary hover:underline"
            >
              {isRegister ? "Inicia sesión" : "Regístrate"}
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}

// Icono de Google (SVG oficial, en línea para no añadir dependencias)
function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.57 5.57 0 0 1-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A11.99 11.99 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29a7.2 7.2 0 0 1 0-4.58V6.62H1.29a11.99 11.99 0 0 0 0 10.76l3.98-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.7 0 3.99 2.47 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75Z"
      />
    </svg>
  );
}
