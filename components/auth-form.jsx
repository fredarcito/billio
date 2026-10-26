"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

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
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  function update(field) {
    return (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }));
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
