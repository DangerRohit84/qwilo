import { useRef } from "react";
import { Platform, TouchableOpacity, StyleSheet, View, Animated } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@react-native-vector-icons/ionicons";
import { useTheme } from "../../../contexts/ThemeContext";

export default function TabsLayout() {
  const { theme, toggle, colors } = useTheme();
  const rotateAnim = useRef(new Animated.Value(0)).current;

  function handleToggle() {
    Animated.timing(rotateAnim, {
      toValue: rotateAnim.__getValue() + 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
    toggle();
  }

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: true,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarStyle: {
            position: "absolute",
            bottom: 20,
            left: 20,
            right: 20,
            backgroundColor: colors.tabBar,
            borderTopColor: "transparent",
            borderTopWidth: 0,
            borderRadius: 28,
            paddingBottom: 8,
            paddingTop: 8,
            height: 64,
            elevation: 0,
            shadowOpacity: 0,
          },
          tabBarLabelStyle: { fontSize: 13, fontWeight: "600" },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarLabel: "Home",
            tabBarIcon: ({ color }) => (
              <Ionicons name="home" size={20} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="progress"
          options={{
            title: "Progress",
            tabBarLabel: "Progress",
            tabBarIcon: ({ color }) => (
              <Ionicons name="analytics" size={20} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarLabel: "Profile",
            tabBarIcon: ({ color }) => (
              <Ionicons name="person" size={20} color={color} />
            ),
          }}
        />
      </Tabs>

      <TouchableOpacity
        style={[styles.themeToggle, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={handleToggle}
        activeOpacity={0.7}
      >
        <Animated.View style={{ transform: [{ rotate: spin }] }}>
          <Ionicons
            name={theme === "dark" ? "sunny" : "moon"}
            size={20}
            color={colors.primary}
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
