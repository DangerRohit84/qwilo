import { useRef, useEffect } from "react";
import { Platform, TouchableOpacity, StyleSheet, View, Animated } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../contexts/ThemeContext";

export default function TabsLayout() {
  const { theme, toggle, colors } = useTheme();
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(rotateAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarStyle: {
            position: "absolute",
            bottom: 20,
            left: 20,
            right: 20,
            backgroundColor: colors.tabBar,
            borderTopColor: "transparent",
            borderRadius: 28,
            paddingBottom: 8,
            paddingTop: 8,
            height: 64,
            elevation: 0,
          },
          tabBarLabelStyle: { fontSize: 12, fontWeight: "600" },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="progress"
          options={{
            title: "Progress",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="analytics" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person" size={size} color={color} />
            ),
          }}
        />
      </Tabs>

      <TouchableOpacity
        style={[styles.themeToggle, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={toggle}
        activeOpacity={0.7}
      >
        <Ionicons
          name={theme === "dark" ? "sunny" : "moon"}
          size={20}
          color={colors.primary}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  themeToggle: {
    position: "absolute",
    top: Platform.OS === "ios" ? 54 : 30,
    right: 14,
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    elevation: 4,
    shadowColor: "#13376D",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
});
