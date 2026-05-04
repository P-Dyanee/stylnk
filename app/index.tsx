import { useSession } from "@/src/providers/session-provider";
import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { Colors } from "@/constants/theme";

export default function RootIndex() {
  const { ready, user } = useSession();

  if (!ready) {
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

  return <Redirect href={user ? "/(tabs)" : "/auth/login"} />;
}
