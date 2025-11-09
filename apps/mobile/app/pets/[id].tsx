import { useEffect, useState } from "react";
import { Stack, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import dayjs from "dayjs";

import { supabase } from "../../lib/supabase";
import type { Database } from "../../types/database";

type Pet = Database["public"]["Tables"]["pets"]["Row"];
type Treatment = Database["public"]["Tables"]["pet_treatments"]["Row"];

export default function PetDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [pet, setPet] = useState<Pet | null>(null);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const fetchData = async () => {
      if (!id) return;
      setLoading(true);

      try {
        const [petResponse, treatmentsResponse] = await Promise.all([
          supabase.from("pets").select("*").eq("id", id).maybeSingle(),
          supabase
            .from("pet_treatments")
            .select("*")
            .eq("pet_id", id)
            .order("next_due_at", { ascending: true }),
        ]);

        if (!active) return;

        setPet(petResponse.data ?? null);
        setTreatments(treatmentsResponse.data ?? []);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void fetchData();

    return () => {
      active = false;
    };
  }, [id]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!pet) {
    return (
      <View style={styles.center}>
        <Text>Pet não encontrado.</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: pet.name }} />
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Informações</Text>
          <Text style={styles.label}>
            Espécie: <Text style={styles.value}>{pet.species}</Text>
          </Text>
          <Text style={styles.label}>
            Sexo: <Text style={styles.value}>{pet.sex}</Text>
          </Text>
          <Text style={styles.label}>
            Nascimento:{" "}
            <Text style={styles.value}>
              {pet.birthdate ? dayjs(pet.birthdate).format("DD/MM/YYYY") : "Não informado"}
            </Text>
          </Text>
          <Text style={styles.label}>
            Peso: <Text style={styles.value}>{pet.weight_kg ? `${pet.weight_kg} kg` : "-"}</Text>
          </Text>
          <Text style={styles.label}>
            Observações: <Text style={styles.value}>{pet.notes ?? "-"}</Text>
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Cuidados ativos</Text>
          {treatments.length === 0 ? (
            <Text style={styles.emptyText}>Nenhum cuidado cadastrado.</Text>
          ) : (
            treatments.map((item) => (
              <View key={item.id} style={styles.treatmentItem}>
                <Text style={styles.treatmentTitle}>{item.title}</Text>
                <Text style={styles.label}>
                  Tipo: <Text style={styles.value}>{item.kind}</Text>
                </Text>
                <Text style={styles.label}>
                  Status: <Text style={styles.value}>{item.status}</Text>
                </Text>
                <Text style={styles.label}>
                  Próxima dose:{" "}
                  <Text style={styles.value}>
                    {item.next_due_at ? dayjs(item.next_due_at).format("DD/MM/YYYY") : "-"}
                  </Text>
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
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
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
  },
  label: {
    color: "#6b7280",
    marginTop: 4,
  },
  value: {
    color: "#111827",
    fontWeight: "500",
  },
  emptyText: {
    color: "#6b7280",
  },
  treatmentItem: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#e5e7eb",
    paddingTop: 12,
    marginTop: 12,
  },
  treatmentTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
});

