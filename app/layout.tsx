import type { Metadata } from "next";
import { Toaster } from "@/components/ui/toaster";
import { BRAND_NAME } from "@/lib/brand";
import "./globals.css";

export const metadata: Metadata = {
  title: BRAND_NAME,
  description: "Gestão simples e acolhedora para produção, pedidos e custos.",
  icons: {
    icon: "/brand/casa-fratoni.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
