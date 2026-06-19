"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogoutOutlined, MoreOutlined, PlusOutlined } from "@ant-design/icons";
import { Dropdown, Spin } from "antd";

import { PersonaPreviewBanner } from "@/components/admin/persona-preview-banner";
import { PersonaSwitcher } from "@/components/admin/persona-switcher";
import { FloatingAssistant } from "@/components/assistant/floating-assistant";
import { LandingShapes } from "@/components/landing/landing-shapes";
import { BrandLogo } from "@/components/ui/brand-logo";
import styles from "@/components/layout/shell.module.css";
import {
  findSelectedNavKey,
  homePathForPersona,
  isFullscreenHubPath,
  isPathAllowedForPersona,
  menuItemsForPersona,
  primaryNavForPersona,
  showPetFab,
} from "@/lib/nav-menu";
import { getNavTheme } from "@/lib/nav-theme";
import { usePlatformAdmin } from "@/hooks/use-platform-admin";
import { useAuth } from "@/providers/auth-provider";
import { usePersona } from "@/providers/persona-provider";

export const DashboardShell = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading, signOut } = useAuth();
  const { persona } = usePersona();
  const { isPlatformAdmin } = usePlatformAdmin();
  const pathname = usePathname();
  const router = useRouter();

  const allMenuItems = useMemo(() => menuItemsForPersona(persona), [persona]);
  const primaryItems = useMemo(() => primaryNavForPersona(persona), [persona]);
  const secondaryItems = useMemo(
    () => allMenuItems.filter((item) => !primaryItems.some((p) => p.key === item.key)),
    [allMenuItems, primaryItems],
  );
  const selectedKey = useMemo(() => findSelectedNavKey(pathname, persona), [pathname, persona]);
  const withFab = showPetFab(persona);
  const isFullScreenFlow = pathname === "/clinic/setup";
  const isHubFullscreen = isFullscreenHubPath(pathname, persona);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/");
    }
  }, [isLoading, router, user]);

  useEffect(() => {
    if (isLoading || isHubFullscreen || isFullScreenFlow) return;
    if (!isPathAllowedForPersona(pathname, persona)) {
      router.replace(homePathForPersona(persona));
    }
  }, [isFullScreenFlow, isHubFullscreen, isLoading, pathname, persona, router]);

  if (isLoading || !user) {
    return (
      <div className={styles.shell} style={{ placeItems: "center", display: "grid" }}>
        <Spin size="large" />
      </div>
    );
  }

  if (isFullScreenFlow || isHubFullscreen) {
    return <>{children}</>;
  }

  const bottomSlots = withFab
    ? [
        primaryItems[0],
        primaryItems[1],
        null,
        primaryItems[2] ?? primaryItems[1],
        primaryItems[3] ?? primaryItems[primaryItems.length - 1],
      ]
    : primaryItems.slice(0, 4);

  return (
    <div className={styles.shell}>
      <LandingShapes />
      <div className={styles.shellInner}>
        <PersonaPreviewBanner />
        <header className={styles.topBar}>
          <Link href={homePathForPersona(persona)} className={styles.brand}>
            <BrandLogo />
          </Link>
          <div className={styles.topActions}>
            {isPlatformAdmin && <PersonaSwitcher />}
            {secondaryItems.length > 0 && (
              <Dropdown
                menu={{
                  items: secondaryItems.map((item) => ({
                    key: item.key,
                    label: item.label,
                    icon: item.icon,
                    onClick: () => router.push(item.key),
                  })),
                }}
                trigger={["click"]}
              >
                <button type="button" className={styles.iconBtn} aria-label="Mais opções">
                  <MoreOutlined />
                </button>
              </Dropdown>
            )}
            <button type="button" className={styles.iconBtn} onClick={() => signOut()} aria-label="Sair">
              <LogoutOutlined />
            </button>
          </div>
        </header>

        <main className={styles.content}>{children}</main>

        <nav className={styles.bottomNav} aria-label="Menu inferior">
          {bottomSlots.map((item, index) => {
            if (withFab && index === 2) {
              return (
                <div key="fab" className={styles.fabSlot}>
                  <Link href="/pets/create" className={styles.fab} aria-label="Cadastrar pet">
                    <PlusOutlined />
                  </Link>
                </div>
              );
            }
            if (!item) return <div key={`empty-${index}`} style={{ width: 58 }} />;
            const active = selectedKey === item.key;
            const theme = getNavTheme(item.key);
            return (
              <button
                key={item.key}
                type="button"
                className={`${styles.bottomNavItem} ${active ? styles.bottomNavItemActive : ""}`}
                style={
                  active
                    ? ({
                        "--nav-accent": `${theme.accent}55`,
                        "--nav-glow": `${theme.accent}66`,
                      } as React.CSSProperties)
                    : undefined
                }
                onClick={() => router.push(item.key)}
              >
                <span className={styles.bottomNavIcon}>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {persona !== "partner" && <FloatingAssistant />}
      </div>
    </div>
  );
};
