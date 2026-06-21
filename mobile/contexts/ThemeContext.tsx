import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { getStoredData, storeData } from "../services/auth";

type Theme = "light" | "dark";

export const lightColors = {
  bg: "#F9FAFB",
  card: "#fff",
  text: "#111827",
  textSecondary: "#6B7280",
  textMuted: "#9CA3AF",
  border: "#E5E7EB",
  primary: "#4F46E5",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
  tabBar: "#fff",
  tabBorder: "#E5E7EB",
  inputBg: "#fff",
};

export const darkColors = {
  bg: "#0F172A",
  card: "#1E293B",
  text: "#F1F5F9",
  textSecondary: "#94A3B8",
  textMuted: "#64748B",
  border: "#334155",
  primary: "#818CF8",
  success: "#34D399",
  warning: "#FBBF24",
  danger: "#F87171",
  tabBar: "#1E293B",
  tabBorder: "#334155",
  inputBg: "#334155",
};

const ThemeContext = createContext<{
  theme: Theme;
  toggle: () => void;
  colors: typeof lightColors;
}>({
  theme: "light",
  toggle: () => {},
  colors: lightColors,
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    getStoredData("theme").then((saved) => {
      if (saved === "light" || saved === "dark") setTheme(saved);
    });
  }, []);

  function toggle() {
    setTheme((prev) => {
      const next = prev === "light" ? "dark" : "light";
      storeData("theme", next);
      return next;
    });
  }

  return (
    <ThemeContext.Provider
      value={{ theme, toggle, colors: theme === "dark" ? darkColors : lightColors }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
