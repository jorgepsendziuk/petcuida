"use client";

import Link from "next/link";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/pt-br";

import type { Database } from "@/types/database";

import styles from "./panels.module.css";

dayjs.extend(relativeTime);
dayjs.locale("pt-br");

type CareRow = Database["public"]["Tables"]["vw_pet_care_status"]["Row"];

type CareBoardProps = {
  items: CareRow[];
  loading?: boolean;
};

export function CareBoard({ items, loading }: CareBoardProps) {
  return (
    <section className={styles.board}>
      <header className={styles.boardHeader}>
        <span className={styles.boardPin}>📌</span>
        <h2 className={styles.boardTitle}>Cuidados</h2>
        <Link href="/treatments/create" className={styles.boardAction}>
          + cadastrar
        </Link>
      </header>
      <div className={styles.boardBody}>
        {loading ? (
          <p className={styles.boardEmpty}>Carregando…</p>
        ) : items.length === 0 ? (
          <p className={styles.boardEmpty}>Tudo em dia! 🎉</p>
        ) : (
          <ul className={styles.noticeList}>
            {items.slice(0, 4).map((item) => {
              const when = item.next_event_at ? dayjs(item.next_event_at) : null;
              const soon = when && when.diff(dayjs(), "day") <= 3;
              return (
                <li key={`${item.pet_id}-${item.title}`} className={soon ? styles.noticeSoon : ""}>
                  <strong>{item.name}</strong>
                  <span>{item.title}</span>
                  {when && <em>{when.format("DD/MM")}</em>}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
