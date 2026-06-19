"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { getNavTheme } from "@/lib/nav-theme";

import styles from "./nav-tile.module.css";

type NavTileProps = {
  href: string;
  label: string;
  icon?: ReactNode;
  size?: "large" | "normal";
  onClick?: () => void;
};

export function NavTile({ href, label, icon, size, onClick }: NavTileProps) {
  const theme = getNavTheme(href);
  const isLarge = size === "large" || theme.size === "large";

  const inner = (
    <>
      <div className={styles.bgImage} style={{ backgroundImage: `url(${theme.image})` }} />
      <div className={styles.overlay} style={{ background: theme.gradient }} />
      <div className={styles.shine} />
      {icon && <div className={styles.iconWrap}>{icon}</div>}
      <div className={styles.content}>
        <span className={styles.emoji}>{theme.emoji}</span>
        <span className={styles.label}>{label}</span>
      </div>
      <span className={styles.arrow}>→</span>
    </>
  );

  const className = `${styles.petTile} ${isLarge ? styles.petTileLarge : ""}`;

  if (onClick) {
    return (
      <button type="button" className={className} onClick={onClick}>
        {inner}
      </button>
    );
  }

  return (
    <Link href={href} className={className}>
      {inner}
    </Link>
  );
}
