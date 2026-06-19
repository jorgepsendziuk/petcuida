"use client";

import Link from "next/link";
import dayjs from "dayjs";

import type { PartnerAppointment } from "@/components/clinic/use-partner-data";

import styles from "./panels.module.css";

type Props = {
  appointments: PartnerAppointment[];
};

export function ClinicAppointmentsBoard({ appointments }: Props) {
  const upcoming = appointments.filter(
    (a) => a.status === "scheduled" && dayjs(a.scheduled_at).isAfter(dayjs().subtract(1, "hour")),
  );

  if (!upcoming.length) return null;

  return (
    <section className={`${styles.board} ${styles.boardClinic}`}>
      <header className={styles.boardHeader}>
        <span className={styles.boardPin}>🏥</span>
        <h2 className={styles.boardTitle}>Consultas na clínica</h2>
        <span className={styles.boardMeta}>{upcoming.length}</span>
      </header>
      <div className={styles.boardBody}>
        <ul className={styles.noticeList}>
          {upcoming.slice(0, 5).map((apt) => (
            <li key={apt.id} className={styles.noticeClinic}>
              <strong>{apt.clinics?.name ?? "Parceiro"}</strong>
              <span>
                {apt.pets?.name} · {dayjs(apt.scheduled_at).format("DD/MM HH:mm")}
              </span>
              {apt.reason && <em>{apt.reason}</em>}
            </li>
          ))}
        </ul>
        <Link href="/sharing" className={styles.boardAction}>
          Ver tudo
        </Link>
      </div>
    </section>
  );
}
