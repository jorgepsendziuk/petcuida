import { Redirect, Slot } from "expo-router";
import { ActivityIndicator, View } from "react-native";

import { useAuth } from "../../providers/AuthProvider";

export default function AuthLayout() {
  const { session, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (session) {
    return <Redirect href="/(tabs)" />;
  }

  return <Slot />;
}

