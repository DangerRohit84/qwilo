import { useEffect, useRef } from "react";
import { View, Animated, Text } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getStoredUser } from "../services/auth";

export default function SplashScreen() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      getStoredUser().then((user) => {
        if (user) {
          router.replace(
            user.role === "STUDENT" ? "/(student)" : "/(parent)"
          );
        } else {
          router.replace("/(auth)");
        }
      });
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0F172A" }}>
      <Animated.View style={{ alignItems: "center", opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}>
        <View style={{ width: 100, height: 100, borderRadius: 24, backgroundColor: "#4F46E5", justifyContent: "center", alignItems: "center", marginBottom: 24 }}>
          <Ionicons name="book" size={48} color="#FFF" />
        </View>
        <Text style={{ fontSize: 36, fontWeight: "700", color: "#F1F5F9", letterSpacing: 2 }}>Qwilo</Text>
        <Text style={{ fontSize: 14, color: "#64748B", marginTop: 8 }}>Homework, simplified.</Text>
      </Animated.View>
    </View>
  );
}
