import "./globals.css";

import { Toaster } from "@/components/ui/sonner";

export const metadata = {
  title: "Billio · Facturación ágil",
  description:
    "Genera y envía tus facturas mensuales por email en un clic, con envío automático programado.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
