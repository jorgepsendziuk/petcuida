"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ConfigProvider, App as AntdApp } from "antd";
import ptBR from "antd/locale/pt_BR";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

import { AuthProvider } from "@/providers/auth-provider";

import "antd/dist/reset.css";

export const Providers = ({ children }: { children: ReactNode }) => {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  const theme = useMemo(
    () => ({
      token: {
        colorPrimary: "#1677ff",
        colorBgLayout: "#f5f7fa",
        borderRadius: 8,
      },
    }),
    [],
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ConfigProvider locale={ptBR} theme={theme}>
          <AntdApp>
            {children}
            <ReactQueryDevtools initialIsOpen={false} />
          </AntdApp>
        </ConfigProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

