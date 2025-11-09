import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Link } from "expo-router";
import dayjs from "dayjs";

import { supabase } from "../../lib/supabase";
import type { Database } from "../../types/database";

type Pet = Database["public"]["Tables"]["pets"]["Row"];

export default function PetsScreen() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPets = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from("pets").select("*").order("name", { ascending: true });
      setPets(data ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void fetchPets();
    }, [fetchPets]),
  );

  const renderItem = ({ item }: { item: Pet }) => (
    <Link href={`/pets/${item.id}`} asChild>
      <TouchableOpacity style={styles.card}>
        <View>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.meta}>
            {item.species} • {item.sex}
          </Text>
        </View>
        <View>
          <Text style={styles.meta}>
            {item.birthdate ? dayjs(item.birthdate).format("DD/MM/YYYY") : "Sem data"}
          </Text>
          <Text style={styles.meta}>{item.weight_kg ? `${item.weight_kg} kg` : "-"}</Text>
        </View>
      </TouchableOpacity>
    </Link>
  );

  if (loading && pets.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <FlatList
        data={pets}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => fetchPets()} />}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 120 }}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Cadastre o primeiro pet para começar o controle.</Text>
        }
      />

      <Link href="/pets/new" asChild>
        <TouchableOpacity style={styles.fab}>
          <Text style={styles.fabLabel}>+</Text>
        </TouchableOpacity>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: "#f5f7fb",
    padding: 16,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  name: {
    fontSize: 18,
    fontWeight: "600",
  },
  meta: {
    color: "#6b7280",
    marginTop: 4,
  },
  emptyText: {
    textAlign: "center",
    color: "#6b7280",
    marginTop: 24,
  },
  fab: {
    position: "absolute",
    bottom: 32,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#1677ff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  fabLabel: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "600",
  },
});

