import { useCallback, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import dayjs from "dayjs";

import { supabase } from "../../lib/supabase";
import { useAuth } from "../../providers/AuthProvider";

type CareStatus = {
  id: string;
  petName: string;
  title: string;
  nextEventAt: string | null;
  kind: string | null;
};

type Stats = {
  totalPets: number;
  pendingTreatments: number;
  nextReminder: string | null;
};

const initialStats: Stats = {
  totalPets: 0,
  pendingTreatments: 0,
  nextReminder: null,
};

export default function OverviewScreen() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>(initialStats);
  const [careStatus, setCareStatus] = useState<CareStatus[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchDashboard = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const [petsCountResponse, pendingTreatmentsResponse, nextReminderResponse, careStatusResponse] =
        await Promise.all([
          supabase.from("pets").select("id", { head: true, count: "exact" }),
          supabase
            .from("pet_treatments")
            .select("id", { head: true, count: "exact" })
            .neq("status", "completed"),
          supabase
            .from("reminders")
            .select("remind_at")
            .is("delivered_at", null)
            .order("remind_at", { ascending: true })
            .limit(1)
            .maybeSingle(),
          supabase
            .from("vw_pet_care_status")
            .select("pet_id,name,title,next_event_at,kind")
            .order("next_event_at", { ascending: true })
            .limit(5),
        ]);

      const nextReminder = nextReminderResponse.data?.remind_at ?? null;

      const status =
        careStatusResponse.data?.map((item) => ({
          id: `${item.pet_id}-${item.title}`,
          petName: item.name,
          title: item.title ?? "",
          nextEventAt: item.next_event_at,
          kind: item.kind,
        })) ?? [];

      setStats({
        totalPets: petsCountResponse.count ?? 0,
        pendingTreatments: pendingTreatmentsResponse.count ?? 0,
        nextReminder,
      });
      setCareStatus(status);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      void fetchDashboard();
    }, [fetchDashboard]),
  );

  return (
    <FlatList
      style={styles.container}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => fetchDashboard()} />}
      data={careStatus}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <View style={styles.stats}>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Total de pets</Text>
            <Text style={styles.cardValue}>{stats.totalPets}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Cuidados pendentes</Text>
            <Text style={styles.cardValue}>{stats.pendingTreatments}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Próximo lembrete</Text>
            <Text style={styles.cardValue}>
              {stats.nextReminder
                ? dayjs(stats.nextReminder).format("DD/MM/YYYY HH:mm")
                : "Nenhum"}
            </Text>
          </View>
          <Text style={styles.sectionTitle}>Próximos cuidados</Text>
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.listItem}>
          <View>
            <Text style={styles.listTitle}>{item.petName}</Text>
            <Text style={styles.listSubtitle}>{item.title}</Text>
          </View>
          <View>
            <Text style={styles.listKind}>{item.kind}</Text>
            <Text style={styles.listDate}>
              {item.nextEventAt ? dayjs(item.nextEventAt).format("DD/MM/YYYY HH:mm") : "-"}
            </Text>
          </View>
        </View>
      )}
      ListEmptyComponent={
        !loading ? (
          <Text style={styles.emptyText}>Nenhum cuidado agendado por enquanto.</Text>
        ) : null
      }
      contentContainerStyle={{ paddingBottom: 32 }}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7fb",
    paddingHorizontal: 16,
  },
  stats: {
    paddingVertical: 24,
    gap: 12,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardLabel: {
    color: "#6b7280",
    fontSize: 14,
  },
  cardValue: {
    fontSize: 24,
    fontWeight: "600",
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
  },
  listItem: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  listTitle: {
    fontWeight: "600",
    fontSize: 16,
  },
  listSubtitle: {
    color: "#6b7280",
    marginTop: 4,
  },
  listKind: {
    textAlign: "right",
    fontSize: 12,
    color: "#2563eb",
    fontWeight: "600",
  },
  listDate: {
    textAlign: "right",
    color: "#374151",
  },
  emptyText: {
    textAlign: "center",
    color: "#6b7280",
    marginTop: 24,
  },
});

