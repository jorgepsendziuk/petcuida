"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  AppstoreOutlined,
  CalendarOutlined,
  HomeOutlined,
  MessageOutlined,
  ProfileOutlined,
  SolutionOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { Button, Layout, Menu, Spin, Typography } from "antd";

import { useAuth } from "@/providers/auth-provider";

const { Header, Sider, Content } = Layout;

const menuItems = [
  { label: "Visão geral", key: "/dashboard", icon: <HomeOutlined /> },
  { label: "Pets", key: "/pets", icon: <TeamOutlined /> },
  { label: "Cuidados", key: "/treatments", icon: <SolutionOutlined /> },
  { label: "Lembretes", key: "/reminders", icon: <CalendarOutlined /> },
  { label: "Assistente", key: "/chatbot", icon: <MessageOutlined /> },
  { label: "Perfil", key: "/profile", icon: <ProfileOutlined /> },
];

const findSelectedKey = (pathname: string) => {
  if (pathname === "/") return "/dashboard";
  const match = menuItems.find((item) => pathname.startsWith(item.key));
  return match?.key ?? "/dashboard";
};

export const DashboardShell = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [isLoading, router, user]);

  const selectedKey = useMemo(() => findSelectedKey(pathname), [pathname]);

  if (isLoading || !user) {
    return (
      <div style={{ display: "grid", placeItems: "center", minHeight: "100vh" }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider breakpoint="lg" collapsedWidth={64}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: 64,
            color: "#fff",
            fontWeight: 700,
            letterSpacing: 0.5,
          }}
        >
          <Link href="/dashboard" style={{ color: "inherit" }}>
            <AppstoreOutlined style={{ marginRight: 8 }} />
            PetCuida
          </Link>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={(info) => {
            if (info.key !== selectedKey) {
              router.push(info.key);
            }
          }}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            background: "#fff",
            paddingInline: 24,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <Typography.Title level={4} style={{ margin: 0 }}>
            {menuItems.find((item) => item.key === selectedKey)?.label ?? "PetCuida"}
          </Typography.Title>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Typography.Text type="secondary">{user.email}</Typography.Text>
            <Button onClick={() => signOut()}>Sair</Button>
          </div>
        </Header>
        <Content style={{ padding: 24, background: "#f5f7fa" }}>{children}</Content>
      </Layout>
    </Layout>
  );
};

