import "./globals.css";

import { Toaster } from "@/components/ui/sonner";

export const metadata = {
  title: "Billio · Facturación ágil",
  description:
    "Genera y envía tus facturas mensuales por email en un clic, con envío automático programado.",
  // El icono lo aportan app/icon.svg y app/apple-icon.jsx (convención de Next)
  applicationName: "Billio",
  openGraph: {
    title: "Billio · Facturación ágil",
    description:
      "Genera y envía tus facturas mensuales por email en un clic, con envío automático programado.",
    siteName: "Billio",
    locale: "es_ES",
    type: "website",
  },
};

export const viewport = {
  themeColor: "#2b6ae0",
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
