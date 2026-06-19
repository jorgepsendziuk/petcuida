import type { Metadata } from "next";
import { AntdRegistry } from "@ant-design/nextjs-registry";

import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "AuAuAuMiau",
  description: "Cadastre seu pet com IA — vacinas, tratamentos e conexão com clínicas.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <AntdRegistry>
          <Providers>{children}</Providers>
        </AntdRegistry>
      </body>
    </html>
  );
}
