"use client";

import dayjs from "dayjs";
import "dayjs/locale/pt-br";

import type { PartnerAppointment } from "@/components/clinic/use-partner-data";
import type { Database } from "@/types/database";

import styles from "./panels.module.css";

dayjs.locale("pt-br");

type Reminder = Database["public"]["Tables"]["reminders"]["Row"] & {
  pets: { name: string } | null;
  pet_treatments: { title: string } | null;
};

type CareRow = Database["public"]["Tables"]["vw_pet_care_status"]["Row"];

type AgendaStripProps = {
  reminders: Reminder[];
  careFeed: CareRow[];
  clinicAppointments?: PartnerAppointment[];
};

type DayEvent = {
  key: string;
  label: string;
  type: "reminder" | "care" | "clinic";
};

export function AgendaStrip({ reminders, careFeed, clinicAppointments = [] }: AgendaStripProps) {
  const start = dayjs().startOf("day");
  const days = Array.from({ length: 30 }, (_, i) => start.add(i, "day"));

  const eventsByDay = new Map<string, DayEvent[]>();

  for (const r of reminders) {
    const d = dayjs(r.remind_at).format("YYYY-MM-DD");
    const list = eventsByDay.get(d) ?? [];
    list.push({
      key: r.id,
      label: `${r.pets?.name ?? "Pet"}: ${r.pet_treatments?.title ?? r.message}`,
      type: "reminder",
    });
    eventsByDay.set(d, list);
  }

  for (const c of careFeed) {
    if (!c.next_event_at) continue;
    const d = dayjs(c.next_event_at).format("YYYY-MM-DD");
    const list = eventsByDay.get(d) ?? [];
    list.push({
      key: `${c.pet_id}-${c.title}`,
      label: `${c.name}: ${c.title}`,
      type: "care",
    });
    eventsByDay.set(d, list);
  }

  for (const apt of clinicAppointments) {
    if (apt.status !== "scheduled") continue;
    const d = dayjs(apt.scheduled_at).format("YYYY-MM-DD");
    const list = eventsByDay.get(d) ?? [];
    list.push({
      key: apt.id,
      label: `${apt.clinics?.name ?? "Clínica"}: ${apt.pets?.name ?? "Pet"}`,
      type: "clinic",
    });
    eventsByDay.set(d, list);
  }

  const todayKey = start.format("YYYY-MM-DD");

  return (
    <section className={`${styles.board} ${styles.boardAgenda}`}>
      <header className={styles.boardHeader}>
        <span className={styles.boardPin}>📅</span>
        <h2 className={styles.boardTitle}>Agenda</h2>
        <span className={styles.boardMeta}>30 dias</span>
      </header>
      <div className={styles.agendaScroll}>
        {days.map((day) => {
          const key = day.format("YYYY-MM-DD");
          const events = eventsByDay.get(key) ?? [];
          const isToday = key === todayKey;
          const hasEvents = events.length > 0;
          return (
            <div
              key={key}
              className={`${styles.agendaDay} ${isToday ? styles.agendaToday : ""} ${hasEvents ? styles.agendaHasEvents : ""}`}
              title={events.map((e) => e.label).join("\n")}
            >
              <span className={styles.agendaWeekday}>{day.format("ddd")}</span>
              <span className={styles.agendaDate}>{day.format("D")}</span>
              {hasEvents && (
                <span className={styles.agendaDots}>
                  {events.slice(0, 3).map((e) => (
                    <i
                      key={e.key}
                      className={
                        e.type === "care"
                          ? styles.dotCare
                          : e.type === "clinic"
                            ? styles.dotClinic
                            : styles.dotReminder
                      }
                    />
                  ))}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
