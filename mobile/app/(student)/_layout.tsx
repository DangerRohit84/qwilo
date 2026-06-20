import { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { Stack, useRouter } from "expo-router";
import { getStoredUser } from "../../services/auth";

export default function StudentLayout() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    getStoredUser().then((user) => {
      if (!user || user.role !== "STUDENT") {
        router.replace("/(auth)");
      } else {
        setReady(true);
      }
    });
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="homework-upload" />
      <Stack.Screen name="progress" />
      <Stack.Screen name="tasks/[id]" />
      <Stack.Screen name="tasks/[id]/questions" />
    </Stack>
  );
}
