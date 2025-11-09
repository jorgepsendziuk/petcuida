import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Link } from "expo-router";

import { useAuth } from "../../providers/AuthProvider";

export default function RegisterScreen() {
  const { signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!email || !password) {
      Alert.alert("Validação", "Informe email e senha.");
      return;
    }

    setLoading(true);
    try {
      await signUp({ email, password, fullName });
      Alert.alert("Cadastro realizado!", "Verifique seu email para confirmar a conta.");
    } catch (error) {
      Alert.alert("Erro no cadastro", (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.select({ ios: "padding", android: undefined })}
    >
      <View style={styles.box}>
        <Text style={styles.title}>Criar conta</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Nome completo</Text>
          <TextInput
            placeholder="Nome e sobrenome"
            value={fullName}
            onChangeText={setFullName}
            style={styles.input}
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            placeholder="voce@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
            style={styles.input}
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Senha</Text>
          <TextInput
            placeholder="********"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            style={styles.input}
          />
        </View>

        <TouchableOpacity
          style={[styles.button, loading && { opacity: 0.6 }]}
          onPress={handleRegister}
        >
          <Text style={styles.buttonLabel}>{loading ? "Enviando..." : "Cadastrar"}</Text>
        </TouchableOpacity>

        <Text style={styles.footerText}>
          Já possui conta?{" "}
          <Link href="/(auth)/login" style={styles.link}>
            Fazer login
          </Link>
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 16,
    backgroundColor: "#f5f7fb",
  },
  box: {
    backgroundColor: "#fff",
    padding: 24,
    borderRadius: 16,
    gap: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
  },
  field: {
    gap: 8,
  },
  label: {
    fontWeight: "600",
  },
  input: {
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  button: {
    backgroundColor: "#1677ff",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  buttonLabel: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  footerText: {
    textAlign: "center",
    color: "#6b7280",
  },
  link: {
    color: "#1677ff",
    fontWeight: "600",
  },
});

