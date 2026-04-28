import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Platform } from "react-native";

const TOKEN_KEY = "stylnk_auth_token";

const getHostFromExpo = () => {
  const candidates = [
    Constants.expoConfig?.hostUri,
    (Constants as any).expoGoConfig?.debuggerHost,
    (Constants as any).manifest2?.extra?.expoClient?.hostUri,
    (Constants as any).manifest?.debuggerHost,
  ].filter(Boolean) as string[];

  for (const value of candidates) {
    const host = value.split("://").pop()?.split(":")[0];
    if (host) return host;
  }
  return null;
};

const resolveBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  if (Platform.OS === "web") {
    return "http://localhost:4000";
  }

  const host = getHostFromExpo();
  if (host) {
    return `http://${host}:4000`;
  }

  return "http://localhost:4000";
};

export const API_BASE_URL = resolveBaseUrl();

export type AuthUser = {
  id: string;
  fullName: string;
  email: string;
};

type AuthResponse = {
  token: string;
  user: AuthUser;
};

export type ChatListItem = {
  id: string;
  name: string;
  lastMessage: string;
  time: string;
  unreadCount: number;
  isOnline: boolean;
  isGroup: boolean;
};

export type ChatMessage = {
  id: string;
  text: string;
  senderId: string;
  senderName?: string;
  createdAt: string;
};

const request = async <T>(
  path: string,
  options: RequestInit = {},
  authenticated = false,
): Promise<T> => {
  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");

  if (authenticated) {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Network request failed";
    throw new Error(`${message} (API: ${API_BASE_URL})`);
  }

  if (!response.ok) {
    let message = "Request failed";
    try {
      const body = await response.json();
      if (body?.message) {
        message = body.message;
      }
    } catch {
      // no-op
    }
    throw new Error(message);
  }

  return response.json();
};

export const authApi = {
  async register(input: { fullName: string; email: string; password: string }) {
    const data = await request<AuthResponse>(
      "/auth/register",
      {
        method: "POST",
        body: JSON.stringify(input),
      },
      false,
    );
    await AsyncStorage.setItem(TOKEN_KEY, data.token);
    await AsyncStorage.setItem("stylnk_user_id", data.user.id);
    return data.user;
  },
  async login(input: { email: string; password: string }) {
    const data = await request<AuthResponse>(
      "/auth/login",
      {
        method: "POST",
        body: JSON.stringify(input),
      },
      false,
    );
    await AsyncStorage.setItem(TOKEN_KEY, data.token);
    await AsyncStorage.setItem("stylnk_user_id", data.user.id);
    return data.user;
  },
};

export const chatApi = {
  listChats() {
    return request<ChatListItem[]>("/chats", {}, true);
  },
  listMessages(chatId: string) {
    return request<ChatMessage[]>(`/chats/${chatId}/messages`, {}, true);
  },
  sendMessage(chatId: string, text: string) {
    return request<ChatMessage>(
      `/chats/${chatId}/messages`,
      {
        method: "POST",
        body: JSON.stringify({ text }),
      },
      true,
    );
  },
};

export const authStorage = {
  async getCurrentUserId() {
    return AsyncStorage.getItem("stylnk_user_id");
  },
};
