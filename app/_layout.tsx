import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Colors } from "../constants/theme";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        {/* Auth Stack */}
        <Stack.Screen name="auth" />

        {/* Main App (Tabs) */}
        <Stack.Screen name="(tabs)" />

        {/* Stack Screens (pushed on top of tabs) */}
        <Stack.Screen
          name="chat/[id]"
          options={{
            headerShown: true,
            headerStyle: { backgroundColor: Colors.light.background },
            headerTintColor: Colors.primary,
            headerBackTitle: "Back",
          }}
        />
      </Stack>
    </>
  );
}
