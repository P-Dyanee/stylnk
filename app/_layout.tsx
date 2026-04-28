import { AppThemeProvider, useAppTheme } from "@/src/theme/app-theme";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Colors } from "../constants/theme";

function RootNavigator() {
  const { palette } = useAppTheme();
  return (
    <>
      <StatusBar style={palette.statusBar === "dark" ? "dark" : "light"} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        {/* Auth Stack */}
        <Stack.Screen name="auth" />

        {/* Main App (Tabs) */}
        <Stack.Screen name="(tabs)" />

        <Stack.Screen
          name="modal"
          options={{
            presentation: "modal",
            headerShown: true,
            title: "About StyLnk",
          }}
        />
        <Stack.Screen
          name="new-message"
          options={{
            headerShown: true,
            title: "New Message",
            headerStyle: { backgroundColor: palette.card },
            headerTintColor: Colors.primary,
          }}
        />
        <Stack.Screen name="settings/[slug]" options={{ headerShown: false }} />

        {/* Stack Screens (pushed on top of tabs) */}
        <Stack.Screen
          name="chat/[id]"
          options={{
            headerShown: true,
            headerStyle: { backgroundColor: palette.card },
            headerTintColor: Colors.primary,
            headerBackTitle: "Back",
          }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <AppThemeProvider>
      <RootNavigator />
    </AppThemeProvider>
  );
}
