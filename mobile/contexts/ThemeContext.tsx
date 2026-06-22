import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { getStoredData, storeData } from "../services/auth";

type Theme = "light" | "dark";

export const lightColors = {
  bg: "#F0F7FA",
  card: "#fff",
  text: "#0A1F3D",
  textSecondary: "#1B4A7A",
  textMuted: "#7AA9C7",
  border: "#D6E4ED",
  primary: "#13376D",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
  tabBar: "#fff",
  tabBorder: "#D6E4ED",
  inputBg: "#fff",
};

export const darkColors = {
  bg: "#0A1428",
  card: "#132244",
  text: "#E8F0FE",
  textSecondary: "#7AA9C7",
  textMuted: "#3D6B97",
  border: "#1E3A5F",
  primary: "#3CD2CE",
  success: "#34D399",
  warning: "#FBBF24",
  danger: "#DC2626",
  tabBar: "#132244",
  tabBorder: "#1E3A5F",
  inputBg: "#1E3A5F",
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
