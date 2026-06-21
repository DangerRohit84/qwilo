import { useEffect, useRef } from "react";
import { Platform, TouchableOpacity, StyleSheet, Animated } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../contexts/ThemeContext";

export default function TabsLayout() {
  const { theme, toggle, colors } = useTheme();
  const bgAnim = useRef(new Animated.Value(theme === "dark" ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(bgAnim, {
      toValue: theme === "dark" ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [theme]);

  const bgColor = bgAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["#F9FAFB", "#0F172A"],
  });

  return (
    <Animated.View style={{ flex: 1, backgroundColor: bgColor }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarStyle: {
            backgroundColor: colors.tabBar,
            borderTopColor: colors.tabBorder,
            paddingBottom: Platform.OS === "ios" ? 20 : 8,
            paddingTop: 8,
            height: Platform.OS === "ios" ? 80 : 64,
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
        style={[styles.themeToggle, { backgroundColor: colors.card }]}
        onPress={toggle}
      >
        <Animated.View
          style={{
            transform: [
              {
                rotate: bgAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["0deg", "360deg"],
                }),
              },
            ],
          }}
        >
          <Ionicons
            name={theme === "dark" ? "sunny" : "moon"}
            size={22}
            color={colors.text}
          />
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  themeToggle: {
    position: "absolute",
    top: Platform.OS === "ios" ? 54 : 30,
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
  },
});
