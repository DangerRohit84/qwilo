import { useRef, useState, useEffect } from "react";
import {
  Platform,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  View,
} from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../contexts/ThemeContext";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

export default function TabsLayout() {
  const { theme, toggle, colors } = useTheme();
  const toggleRef = useRef<TouchableOpacity>(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [btnPos, setBtnPos] = useState({ x: 0, y: 0, size: 40 });
  const [cover, setCover] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => {
      toggleRef.current?.measureInWindow((x, y, w, h) => {
        if (x || y) setBtnPos({ x: x + w / 2, y: y + h / 2, size: Math.max(w, h) });
      });
    }, 200);
    return () => clearTimeout(id);
  }, []);

  function handleToggle() {
    const cx = btnPos.x;
    const cy = btnPos.y;
    const maxDist = Math.max(
      Math.sqrt(cx * cx + cy * cy),
      Math.sqrt((SCREEN_W - cx) * (SCREEN_W - cx) + cy * cy),
      Math.sqrt(cx * cx + (SCREEN_H - cy) * (SCREEN_H - cy)),
      Math.sqrt((SCREEN_W - cx) * (SCREEN_W - cx) + (SCREEN_H - cy) * (SCREEN_H - cy))
    );
    const startScale = (maxDist * 2) / btnPos.size;

    scaleAnim.setValue(startScale);
    setCover(true);

    toggle();

    Animated.timing(scaleAnim, {
      toValue: 0,
      duration: 900,
      useNativeDriver: true,
    }).start(() => setCover(false));
  }

  return (
    <View style={{ flex: 1 }}>
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
        ref={toggleRef}
        style={[styles.themeToggle, { backgroundColor: colors.card }]}
        onPress={handleToggle}
      >
        <Ionicons
          name={theme === "dark" ? "sunny" : "moon"}
          size={22}
          color={colors.text}
        />
      </TouchableOpacity>

      {cover && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: btnPos.x - btnPos.size / 2,
            top: btnPos.y - btnPos.size / 2,
            width: btnPos.size,
            height: btnPos.size,
            borderRadius: btnPos.size / 2,
            backgroundColor: theme === "dark" ? "#F9FAFB" : "#0F172A",
            transform: [{ scale: scaleAnim }],
          }}
        />
      )}
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
