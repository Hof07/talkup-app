import React, { createContext, useContext, useEffect, useState } from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const THEME_KEY = "app_theme_mode";

export type ThemeMode = "light" | "dark" | "system";

interface AppColors {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  text: string;
  textSecondary: string;
  white: string;
  black: string;

  myBubble: string;
  otherBubble: string;
  primaryFaded: string;
  green: string;
  red: string;
  danger: string;

  background: string;
  chatBg: string;
  cardBg: string;
  headerBg: string;
  inputBg: string;
  modalBg: string;

  neutral50: string;
  neutral100: string;
  neutral200: string;
  neutral300: string;
  neutral400: string;
  neutral500: string;
  neutral600: string;
  neutral700: string;
  neutral800: string;
  neutral900: string;

  separator: string;
  overlay: string;
  statusBar: "light-content" | "dark-content";
}

const LightColors: AppColors = {
  primary: "#eab308",
  primaryLight: "#fde047",
  primaryDark: "#ca8a04",
  text: "#1c1917",
  textSecondary: "#78716c",
  white: "#ffffff",
  black: "#000000",

  myBubble: "#DCF8C6",
  otherBubble: "#ffffff",
  primaryFaded: "rgba(255,214,0,0.12)",
  green: "#22c55e",
  red: "#ef4444",
  danger: "#E53935",

  background: "#fafaf9",
  chatBg: "#f5f5f4",
  cardBg: "#ffffff",
  headerBg: "#1c1917",
  inputBg: "#f5f5f4",
  modalBg: "#ffffff",

  neutral50: "#fafaf9",
  neutral100: "#f5f5f4",
  neutral200: "#e7e5e4",
  neutral300: "#d6d3d1",
  neutral400: "#a8a29e",
  neutral500: "#78716c",
  neutral600: "#57534e",
  neutral700: "#44403c",
  neutral800: "#292524",
  neutral900: "#1c1917",

  separator: "#e7e5e4",
  overlay: "rgba(0,0,0,0.3)",
  statusBar: "light-content",
};

const DarkColors: AppColors = {
  primary: "#eab308",
  primaryLight: "#fde047",
  primaryDark: "#ca8a04",
  text: "#f5f5f4",
  textSecondary: "#a8a29e",
  white: "#ffffff",
  black: "#000000",

  myBubble: "#005C4B",
  otherBubble: "#1f2c34",
  primaryFaded: "rgba(255,214,0,0.15)",
  green: "#22c55e",
  red: "#ef4444",
  danger: "#E53935",

  background: "#0b141a",
  chatBg: "#0b141a",
  cardBg: "#1f2c34",
  headerBg: "#1f2c34",
  inputBg: "#1f2c34",
  modalBg: "#1f2c34",

  neutral50: "#111b21",
  neutral100: "#1f2c34",
  neutral200: "#2a3942",
  neutral300: "#3b4a54",
  neutral400: "#8696a0",
  neutral500: "#8696a0",
  neutral600: "#aebac1",
  neutral700: "#d1d7db",
  neutral800: "#e9edef",
  neutral900: "#f0f2f5",

  separator: "#2a3942",
  overlay: "rgba(0,0,0,0.6)",
  statusBar: "light-content",
};

interface ThemeContextType {
  mode: ThemeMode;
  isDark: boolean;
  colors: AppColors;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: "light",
  isDark: false,
  colors: LightColors,
  setMode: () => {},
});

export const useAppTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>("light");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((saved) => {
      if (saved === "dark" || saved === "light" || saved === "system") {
        setModeState(saved);
      }
      setLoaded(true);
    });
  }, []);

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    AsyncStorage.setItem(THEME_KEY, newMode);
  };

  const isDark =
    mode === "dark" || (mode === "system" && systemScheme === "dark");

  const colors = isDark ? DarkColors : LightColors;

  if (!loaded) return null;

  return (
    <ThemeContext.Provider value={{ mode, isDark, colors, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
};
