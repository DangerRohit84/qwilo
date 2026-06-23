import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Platform } from "react-native";
import ExpoFontLoader from "expo-font/build/ExpoFontLoader";
import { ThemeProvider } from "../contexts/ThemeContext";

export default function RootLayout() {
  useEffect(() => {
    if (Platform.OS === "android") {
      ExpoFontLoader.loadAsync("Ionicons", "asset:///fonts/Ionicons.ttf").catch(() => {});
    }
  }, []);

  return (
    <ThemeProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(student)" />
        <Stack.Screen name="(parent)" />
      </Stack>
    </ThemeProvider>
  );
}
