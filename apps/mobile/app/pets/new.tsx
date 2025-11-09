import { useState } from "react";
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { router, Stack } from "expo-router";

import { supabase } from "../../lib/supabase";

const speciesOptions = [
  { label: "Cachorro", value: "dog" },
  { label: "Gato", value: "cat" },
  { label: "Ave", value: "bird" },
  { label: "Pequenos", value: "small_pet" },
  { label: "Outro", value: "other" },
];

const sexOptions = [
  { label: "Fêmea", value: "female" },
  { label: "Macho", value: "male" },
  { label: "Desconhecido", value: "unknown" },
];

export default function NewPetScreen() {
  const [name, setName] = useState("");
  const [species, setSpecies] = useState("dog");
  const [sex, setSex] = useState("unknown");
  const [birthdate, setBirthdate] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Validação", "Informe o nome do pet.");
      return;
    }

    setLoading(true);

    const { error, data } = await supabase
      .from("pets")
      .insert({
        name,
        species,
        sex,
        birthdate: birthdate || null,
        notes: notes || null,
      })
      .select()
      .single();

    setLoading(false);

    if (error) {
      Alert.alert("Erro ao salvar", error.message);
      return;
    }

    if (data) {
      router.replace(`/pets/${data.id}`);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Novo pet" }} />
      <View style={styles.field}>
        <Text style={styles.label}>Nome</Text>
        <TextInput
          placeholder="Ex: Luna"
          value={name}
          onChangeText={setName}
          style={styles.input}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Espécie</Text>
        <View style={styles.optionRow}>
          {speciesOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[styles.chip, species === option.value && styles.chipActive]}
              onPress={() => setSpecies(option.value)}
            >
              <Text style={[styles.chipLabel, species === option.value && styles.chipLabelActive]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Sexo</Text>
        <View style={styles.optionRow}>
          {sexOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[styles.chip, sex === option.value && styles.chipActive]}
              onPress={() => setSex(option.value)}
            >
              <Text style={[styles.chipLabel, sex === option.value && styles.chipLabelActive]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Data de nascimento (AAAA-MM-DD)</Text>
        <TextInput
          placeholder="2023-01-15"
          value={birthdate}
          onChangeText={setBirthdate}
          style={styles.input}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Observações</Text>
        <TextInput
          placeholder="Informações médicas, alergias..."
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={4}
          style={[styles.input, styles.textArea]}
        />
      </View>

      <TouchableOpacity style={[styles.saveButton, loading && { opacity: 0.6 }]} onPress={handleSave}>
        <Text style={styles.saveLabel}>{loading ? "Salvando..." : "Salvar"}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7fb",
    padding: 16,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  textArea: {
    minHeight: 96,
    textAlignVertical: "top",
  },
  optionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#e5e7eb",
  },
  chipActive: {
    backgroundColor: "#1677ff",
  },
  chipLabel: {
    color: "#111827",
    fontWeight: "500",
  },
  chipLabelActive: {
    color: "#fff",
  },
  saveButton: {
    marginTop: 8,
    backgroundColor: "#1677ff",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  saveLabel: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
});

