import { redirect } from "next/navigation";

import { AppNav } from "@/components/app-nav";
import { getSessionUser } from "@/lib/db";

export const dynamic = "force-dynamic";

// Layout protegido: redirige a /login si no hay sesión válida
export default async function AppLayout({ children }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-slate-50">
      <AppNav user={{ name: user.name, email: user.email }} />
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
