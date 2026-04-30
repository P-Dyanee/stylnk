import Constants from "expo-constants";
import { Platform } from "react-native";
import { io } from "socket.io-client";

const getSocketUrl = () => {
  if (process.env.EXPO_PUBLIC_SOCKET_URL) {
    return process.env.EXPO_PUBLIC_SOCKET_URL;
  }
  
  if (Platform.OS === "web") {
    return "http://localhost:4000";
  }

  const candidates = [
    Constants.expoConfig?.hostUri,
    (Constants as any).expoGoConfig?.debuggerHost,
    (Constants as any).manifest2?.extra?.expoClient?.hostUri,
    (Constants as any).manifest?.debuggerHost,
  ].filter(Boolean) as string[];

  for (const value of candidates) {
    const host = value.split("://").pop()?.split(":")[0];
    if (host) return `http://${host}:4000`;
  }

  return "http://localhost:4000";
};

const socket = io(getSocketUrl(), {
  autoConnect: false,
});

export default socket;
