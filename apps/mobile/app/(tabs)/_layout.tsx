import { Tabs, Redirect } from "expo-router";
import { ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "../../providers/AuthProvider";

export default function TabsLayout() {
  const { session, isLoading } = useAuth();

  if (isLoading) {
    return <ActivityIndicator style={{ flex: 1 }} />;
  }

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: "#1677ff",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Visão geral",
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="pets"
        options={{
          title: "Pets",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="paw-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="reminders"
        options={{
          title: "Lembretes",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="notifications-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Perfil",
          tabBarIcon: ({ color, size }) => <Ionicons name="person-circle-outline" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}

