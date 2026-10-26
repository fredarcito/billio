import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth-form";
import { AuthShell } from "@/components/auth-shell";
import { getSessionUser } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata = { title: "Iniciar sesión · Billio" };

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) redirect("/dashboard");

  return (
    <AuthShell>
      <AuthForm />
    </AuthShell>
  );
}
