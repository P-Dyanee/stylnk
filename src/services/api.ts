import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Platform } from "react-native";

const TOKEN_KEY = "stylnk_auth_token";
const USER_ID_KEY = "stylnk_user_id";
const USER_KEY = "stylnk_auth_user";

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

// ─── Types ────────────────────────────────────────────────────────────────────

export type AuthUser = {
  id: string;
  fullName: string;
  email: string;
  avatarUrl?: string | null;
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

export type GroupListItem = {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  lastMessage: string;
  time: string;
  unreadCount: number;
};

export type DirectoryUser = {
  id: string;
  fullName: string;
  email: string;
};

export type DirectChatResult = {
  id: string;
  name: string;
};

export type CallListItem = {
  id: string;
  name: string;
  peerId: string;
  avatar: string | null;
  type: "incoming" | "outgoing" | "missed";
  callType: "audio" | "video";
  duration: string | null;
  time: string;
  createdAt: string;
};

export type LogCallPayload = {
  recipientId: string;
  callType: "audio" | "video";
  status: "incoming" | "outgoing" | "missed";
  duration?: string;
};

// ─── Core request helper ──────────────────────────────────────────────────────

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

  // 204 No Content — nothing to parse
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
};

// ─── API services ─────────────────────────────────────────────────────────────

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
    await authStorage.saveSession(data);
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
    await authStorage.saveSession(data);
    return data.user;
  },
  async uploadAvatar(avatarUrl: string) {
    const data = await request<{ user: AuthUser }>(
      "/me/avatar",
      {
        method: "PATCH",
        body: JSON.stringify({ avatarUrl }),
      },
      true,
    );
    const currentUser = await authStorage.updateCurrentUser(data.user);
    return currentUser ?? data.user;
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

export const groupApi = {
  listGroups() {
    return request<GroupListItem[]>("/groups", {}, true);
  },
};

export const userApi = {
  listUsers() {
    return request<DirectoryUser[]>("/users", {}, true);
  },
};

export const userStatsApi = {
  getStats() {
    return request<{ chats: number; groups: number; calls: number }>("/me/stats", {}, true);
  },
};

export const composeApi = {
  startDirectChat(recipientId: string) {
    return request<DirectChatResult>(
      "/chats/direct",
      {
        method: "POST",
        body: JSON.stringify({ recipientId }),
      },
      true,
    );
  },
};

export const callApi = {
  listCalls() {
    return request<CallListItem[]>("/calls", {}, true);
  },
  logCall(payload: LogCallPayload) {
    return request<{ id: string }>(
      "/calls",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      true,
    );
  },
  deleteCall(callId: string) {
    return request<void>(
      `/calls/${callId}`,
      { method: "DELETE" },
      true,
    );
  },
};

// ─── Auth storage ─────────────────────────────────────────────────────────────

export const authStorage = {
  async saveSession(data: AuthResponse) {
    await AsyncStorage.multiSet([
      [TOKEN_KEY, data.token],
      [USER_ID_KEY, data.user.id],
      [USER_KEY, JSON.stringify(data.user)],
    ]);
  },
  async hasSession() {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    return Boolean(token);
  },
  async getCurrentUserId() {
    return AsyncStorage.getItem(USER_ID_KEY);
  },
  async getCurrentUser() {
    const value = await AsyncStorage.getItem(USER_KEY);
    if (!value) {
      return null;
    }

    try {
      return JSON.parse(value) as AuthUser;
    } catch {
      await AsyncStorage.removeItem(USER_KEY);
      return null;
    }
  },
  async updateCurrentUser(updates: Partial<AuthUser>) {
    const currentUser = await authStorage.getCurrentUser();
    if (!currentUser) {
      return null;
    }

    const nextUser = { ...currentUser, ...updates };
    await AsyncStorage.multiSet([
      [USER_ID_KEY, nextUser.id],
      [USER_KEY, JSON.stringify(nextUser)],
    ]);
    return nextUser;
  },
  async clearSession() {
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_ID_KEY, USER_KEY]);
  },
};
