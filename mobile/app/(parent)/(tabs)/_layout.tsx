import { Platform, StyleSheet, View } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@react-native-vector-icons/ionicons";
import { useTheme } from "../../../contexts/ThemeContext";

export default function TabsLayout() {
  const { theme, colors } = useTheme();

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
            borderRadius: 28,
            paddingBottom: 8,
            paddingTop: 8,
            height: 64,
            elevation: 0,
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
    </View>
  );
}
