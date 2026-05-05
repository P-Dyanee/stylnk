import { authStorage } from "@/src/services/api";
import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useEffect, useState } from "react";
import { Colors } from "@/constants/theme";

export default function RootIndex() {
  const [targetRoute, setTargetRoute] = useState<"/auth/login" | "/(tabs)" | null>(
    null,
  );

  useEffect(() => {
    const bootstrap = async () => {
      const hasSession = await authStorage.hasSession();
      setTargetRoute(hasSession ? "/(tabs)" : "/auth/login");
    };

    bootstrap();
  }, []);

  if (!targetRoute) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: Colors.background,
        }}
      >
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  return <Redirect href={targetRoute} />;
}
