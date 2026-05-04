import AsyncStorage from "@react-native-async-storage/async-storage";
import React from "react";

type ThemeMode = "light" | "dark";

type ThemePalette = {
  mode: ThemeMode;
  background: string;
  surface: string;
  card: string;
  elevated: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  divider: string;
  primarySurface: string;
  statusBar: "dark" | "light";
  tabInactive: string;
};

type ThemeContextValue = {
  mode: ThemeMode;
  palette: ThemePalette;
  ready: boolean;
  setMode: (mode: ThemeMode) => Promise<void>;
  toggleTheme: () => Promise<void>;
};

const THEME_KEY = "stylnk_theme_mode";

const palettes: Record<ThemeMode, ThemePalette> = {
  light: {
    mode: "light",
    background: "#F7F8FB",
    surface: "#EEF1F6",
    card: "#FFFFFF",
    elevated: "#F3F5F9",
    text: "#11181C",
    textSecondary: "#5E6773",
    textMuted: "#7A8594",
    border: "#DCE2EA",
    divider: "#E9EDF3",
    primarySurface: "#EEE9FF",
    statusBar: "dark",
    tabInactive: "#6F7885",
  },
  dark: {
    mode: "dark",
    background: "#0F1115",
    surface: "#181C22",
    card: "#14181E",
    elevated: "#1B2129",
    text: "#F5F7FA",
    textSecondary: "#C0C7D2",
    textMuted: "#98A2B3",
    border: "#29313A",
    divider: "#222932",
    primarySurface: "#2A2342",
    statusBar: "light",
    tabInactive: "#8F99A8",
  },
};

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

export function AppThemeProvider({ children }: React.PropsWithChildren) {
  const [mode, setModeState] = React.useState<ThemeMode>("light");
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    const loadTheme = async () => {
      const stored = await AsyncStorage.getItem(THEME_KEY);
      if (stored === "light" || stored === "dark") {
        setModeState(stored);
      }
      setReady(true);
    };

    void loadTheme();
  }, []);

  const setMode = React.useCallback(async (nextMode: ThemeMode) => {
    setModeState(nextMode);
    await AsyncStorage.setItem(THEME_KEY, nextMode);
  }, []);

  const toggleTheme = React.useCallback(async () => {
    const nextMode: ThemeMode = mode === "light" ? "dark" : "light";
    await setMode(nextMode);
  }, [mode, setMode]);

  const value = React.useMemo<ThemeContextValue>(
    () => ({
      mode,
      palette: palettes[mode],
      ready,
      setMode,
      toggleTheme,
    }),
    [mode, ready, setMode, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  const context = React.useContext(ThemeContext);
  if (!context) {
    throw new Error("useAppTheme must be used inside AppThemeProvider");
  }
  return context;
}
