import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { getStoredData, storeData } from "../services/auth";

type Theme = "light" | "dark";

export const lightColors = {
  bg: "#F5F3FF",
  card: "#fff",
  text: "#1E1B4B",
  textSecondary: "#4338CA",
  textMuted: "#A5B4FC",
  border: "#E0E7FF",
  primary: "#4F46E5",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
  tabBar: "#fff",
  tabBorder: "#E0E7FF",
  inputBg: "#fff",
};

export const darkColors = {
  bg: "#0E0C1A",
  card: "#1C1936",
  text: "#EEF2FF",
  textSecondary: "#A5B4FC",
  textMuted: "#6366F1",
  border: "#2D2A50",
  primary: "#818CF8",
  success: "#34D399",
  warning: "#FBBF24",
  danger: "#DC2626",
  tabBar: "#1C1936",
  tabBorder: "#2D2A50",
  inputBg: "#2D2A50",
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
