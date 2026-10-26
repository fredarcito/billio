import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth-form";
import { getSessionUser } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata = { title: "Iniciar sesión · Billio" };

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) redirect("/dashboard");

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2 text-xl font-bold">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            B
          </span>
          Billio
        </Link>
        <AuthForm mode="login" />
      </div>
    </main>
  );
}
