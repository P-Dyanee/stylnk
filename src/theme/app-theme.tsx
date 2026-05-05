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
    background: "#F3F8FC",
    surface: "#E7F1F8",
    card: "#FFFFFF",
    elevated: "#EEF7FB",
    text: "#11181C",
    textSecondary: "#52667A",
    textMuted: "#7590A6",
    border: "#CFE1EC",
    divider: "#DDEBF3",
    primarySurface: "#E4F8F5",
    statusBar: "dark",
    tabInactive: "#A8D8EA",
  },
  dark: {
    mode: "dark",
    background: "#132A52",
    surface: "#17345F",
    card: "#1E3A6E",
    elevated: "#21477E",
    text: "#F5F7FA",
    textSecondary: "#D0ECF5",
    textMuted: "#A8D8EA",
    border: "#2C5B93",
    divider: "#244C7E",
    primarySurface: "#123F68",
    statusBar: "light",
    tabInactive: "#A8D8EA",
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
