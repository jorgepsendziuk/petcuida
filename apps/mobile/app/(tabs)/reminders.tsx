import { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import dayjs from "dayjs";

import { supabase } from "../../lib/supabase";
import type { Database } from "../../types/database";

type Reminder = Database["public"]["Tables"]["reminders"]["Row"] & {
  pets?: Pick<Database["public"]["Tables"]["pets"]["Row"], "name">;
};

export default function RemindersScreen() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReminders = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("reminders")
        .select("*, pets(name)")
        .order("remind_at", { ascending: true });
      setReminders(data ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void fetchReminders();
    }, [fetchReminders]),
  );

  const markAsDone = async (reminderId: string) => {
    const { error } = await supabase
      .from("reminders")
      .update({ delivered_at: new Date().toISOString() })
      .eq("id", reminderId);

    if (error) {
      Alert.alert("Erro", error.message);
      return;
    }

    void fetchReminders();
  };

  return (
    <FlatList
      style={styles.container}
      data={reminders}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => fetchReminders()} />}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{item.pets?.name ?? "Pet"}</Text>
            <Text style={styles.message}>{item.message}</Text>
            <Text style={styles.date}>{dayjs(item.remind_at).format("DD/MM/YYYY HH:mm")}</Text>
          </View>
          {!item.delivered_at ? (
            <TouchableOpacity style={styles.button} onPress={() => markAsDone(item.id)}>
              <Text style={styles.buttonLabel}>Concluir</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.doneLabel}>
              Entregue {dayjs(item.delivered_at).format("DD/MM/YYYY HH:mm")}
            </Text>
          )}
        </View>
      )}
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      ListEmptyComponent={
        !loading ? (
          <Text style={styles.emptyText}>Sem lembretes por enquanto.</Text>
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7fb",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  title: {
    fontWeight: "600",
    fontSize: 16,
  },
  message: {
    color: "#4b5563",
    marginTop: 4,
  },
  date: {
    color: "#2563eb",
    marginTop: 8,
    fontWeight: "500",
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#1677ff",
    borderRadius: 10,
  },
  buttonLabel: {
    color: "#fff",
    fontWeight: "600",
  },
  doneLabel: {
    fontSize: 12,
    color: "#16a34a",
  },
  emptyText: {
    textAlign: "center",
    color: "#6b7280",
    marginTop: 24,
  },
});

