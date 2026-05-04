import { Colors } from "@/constants/theme";
import { useAppTheme } from "@/src/theme/app-theme";
import { Ionicons } from "@expo/vector-icons";
import { usePathname } from "expo-router";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";

export default function ThemeToggle() {
  const pathname = usePathname();
  const { mode, ready, toggleTheme, palette } = useAppTheme();

  if (!ready || !pathname.startsWith("/")) {
    return null;
  }

  const showToggle =
    pathname.startsWith("/profile") ||
    pathname.startsWith("/calls") ||
    pathname.startsWith("/groups") ||
    pathname.startsWith("/explore") ||
    pathname.startsWith("/new-message") ||
    pathname.startsWith("/chat/") ||
    pathname === "/";

  if (!showToggle) {
    return null;
  }

  return (
    <View pointerEvents="box-none" style={styles.wrapper}>
      <TouchableOpacity
        onPress={() => void toggleTheme()}
        activeOpacity={0.85}
        style={[
          styles.button,
          {
            backgroundColor: palette.card,
            borderColor: palette.border,
          },
        ]}
      >
        <Ionicons
          name={mode === "dark" ? "sunny-outline" : "moon-outline"}
          size={16}
          color={Colors.primary}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    top: 52,
    left: 14,
    zIndex: 50,
  },
  button: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
});
