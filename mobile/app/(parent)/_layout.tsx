import { useEffect, useRef, useState } from "react";
import { View, ActivityIndicator, TouchableOpacity, StyleSheet, Platform, Animated } from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@react-native-vector-icons/ionicons";
import { getStoredUser } from "../../services/auth";
import { setOnUnauthorized } from "../../services/api";
import { useTheme } from "../../contexts/ThemeContext";

export default function ParentLayout() {
  const router = useRouter();
  const { theme, toggle, colors } = useTheme();
  const [ready, setReady] = useState(false);
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const toggleCount = useRef(0);

  useEffect(() => {
    setOnUnauthorized(() => router.replace("/(auth)"));
    getStoredUser().then((user) => {
      if (!user || user.role !== "PARENT") {
        router.replace("/(auth)");
      } else {
        setReady(true);
      }
    }).catch(() => router.replace("/(auth)"));
  }, []);

  function handleToggle() {
    toggleCount.current += 1;
    Animated.timing(rotateAnim, {
      toValue: toggleCount.current,
      duration: 500,
      useNativeDriver: true,
    }).start();
    toggle();
  }

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
    extrapolate: "extend",
  });

  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#13376D" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="child/[id]" />
        <Stack.Screen name="sessions/[sessionId]" />
      </Stack>

      <TouchableOpacity
        style={[styles.themeToggle, { backgroundColor: colors.card }]}
        onPress={handleToggle}
      >
        <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
          <Ionicons
            name={theme === "dark" ? "sunny" : "moon"}
            size={22}
            color={colors.text}
          />
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  themeToggle: {
    position: "absolute",
    top: Platform.OS === "ios" ? 58 : 34,
    right: 14,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    zIndex: 10,
  },
});
