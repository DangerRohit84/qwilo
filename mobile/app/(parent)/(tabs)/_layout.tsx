import { useRef } from "react";
import { Platform, TouchableOpacity, StyleSheet, View, Animated } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../contexts/ThemeContext";

export default function TabsLayout() {
  const { theme, toggle, colors } = useTheme();
  const rotateAnim = useRef(new Animated.Value(0)).current;

  function handleToggle() {
    Animated.timing(rotateAnim, {
      toValue: rotateAnim._value + 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
    toggle();
  }

  const rotateInterpolate = rotateAnim.interpolate({
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
            borderRadius: 30,
            paddingBottom: 8,
            paddingTop: 8,
            height: 64,
            elevation: 8,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 12,
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
