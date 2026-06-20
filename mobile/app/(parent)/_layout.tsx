import { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { Stack, useRouter } from "expo-router";
import { getStoredUser } from "../../services/auth";

export default function ParentLayout() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    getStoredUser().then((user) => {
      if (!user || user.role !== "PARENT") {
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
      <Stack.Screen name="child/[id]" />
      <Stack.Screen name="sessions/[sessionId]" />
    </Stack>
  );
}
