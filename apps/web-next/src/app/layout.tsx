import type { Metadata } from "next";
import { AntdRegistry } from "@ant-design/nextjs-registry";

import { Providers } from "@/components/providers";

import "@ant-design/v5-patch-for-react-19";
import "./globals.css";

export const metadata: Metadata = {
  title: "PetCuida",
  description: "Gestão completa de pets com lembretes de cuidados.",
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
