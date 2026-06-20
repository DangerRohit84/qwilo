import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { getStoredUser } from "../services/auth";

export default function SplashScreen() {
  const router = useRouter();

  useEffect(() => {
    getStoredUser().then((user) => {
      if (user) {
        router.replace(
          user.role === "STUDENT" ? "/(student)" : "/(parent)"
        );
      } else {
        router.replace("/(auth)");
      }
    });
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F9FAFB" }}>
      <ActivityIndicator size="large" color="#4F46E5" />
    </View>
  );
}
