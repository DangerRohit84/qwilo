import { useEffect, useRef } from "react";
import { View, Animated, Text, Image } from "react-native";
import { useRouter } from "expo-router";
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
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0A1428" }}>
      <Animated.View style={{ alignItems: "center", opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}>
        <Image source={require("../assets/logo_with_name_qwilo.png")} style={{ width: 220, height: 80, resizeMode: "contain", marginBottom: 16 }} />
        <Text style={{ fontSize: 14, color: "#64748B", marginTop: 8 }}>Homework, simplified.</Text>
      </Animated.View>
    </View>
  );
}
