"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";
import dayjs from "dayjs";

import { supabaseClient } from "@/lib/supabase/client";
import { useAuth } from "@/providers/auth-provider";
import type { Database } from "@/types/database";

import styles from "./reminders-panel.module.css";

type Reminder = Database["public"]["Tables"]["reminders"]["Row"] & {
  pets: { name: string } | null;
  pet_treatments: { title: string } | null;
};

type RemindersPanelProps = {
  open: boolean;
  onClose: () => void;
  reminders: Reminder[];
};

export function RemindersPanel({ open, onClose, reminders }: RemindersPanelProps) {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  const mutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabaseClient
        .from("reminders")
        .update({ delivered_at: new Date().toISOString() } as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      message.success("Lembrete marcado como feito.");
      void queryClient.invalidateQueries({ queryKey: ["dashboard-hub"] });
    },
    onError: (e: Error) => message.error(e.message),
  });

  if (!open) return null;

  const pending = reminders.filter((r) => !r.delivered_at);

  return (
    <div className={styles.backdrop} onClick={onClose} role="presentation">
      <div className={styles.panel} role="dialog" aria-label="Lembretes" onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.title}>🔔 Lembretes</h2>
        {pending.length === 0 ? (
          <p className={styles.empty}>Nenhum lembrete pendente nos próximos 30 dias.</p>
        ) : (
          <ul className={styles.list}>
            {pending.map((r) => (
              <li key={r.id}>
                <div>
                  <strong>{r.pets?.name}</strong>
                  <span>{r.pet_treatments?.title ?? r.message}</span>
                  <em>{dayjs(r.remind_at).format("DD/MM HH:mm")}</em>
                </div>
                <button type="button" onClick={() => mutation.mutate(r.id)} disabled={mutation.isPending}>
                  ✓
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
