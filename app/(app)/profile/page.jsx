import { redirect } from "next/navigation";

import { ProfileForm } from "@/components/profile-form";
import { getProfile, getSessionUser } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata = { title: "Facturación · Billio" };

export default async function ProfilePage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const profile = await getProfile(user.id);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Datos de facturación</h1>
        <p className="text-muted-foreground">
          Estos datos se usan en cada factura que generes, manual o automáticamente.
        </p>
      </div>
      <ProfileForm initialProfile={profile} userEmail={user.email} />
    </div>
  );
}
