import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Platform } from "react-native";

const TOKEN_KEY = "stylnk_auth_token";
const USER_ID_KEY = "stylnk_user_id";
const USER_KEY = "stylnk_auth_user";

const getHostFromExpo = () => {
  const candidates = [
    Constants.expoConfig?.hostUri,
    (Constants as Record<string, any>).expoGoConfig?.debuggerHost,
    (Constants as Record<string, any>).manifest2?.extra?.expoClient?.hostUri,
    (Constants as Record<string, any>).manifest?.debuggerHost,
  ].filter(Boolean) as string[];

  for (const value of candidates) {
    const host = value.split("://").pop()?.split(":")[0];
    if (host) {
      return host;
    }
  }

  return null;
};

/** Android emulator: `localhost` is the emulator itself, not your PC. This reaches the host machine. */
const ANDROID_EMULATOR_HOST = "10.0.2.2";

const resolveHostForApi = (host: string | null) => {
  if (Platform.OS !== "android") {
    return host ?? "localhost";
  }
  if (!host || host === "localhost" || host === "127.0.0.1") {
    return ANDROID_EMULATOR_HOST;
  }
  return host;
};

const resolveBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  if (Platform.OS === "web") {
    return "http://localhost:4000";
  }

  const rawHost = getHostFromExpo();
  const host = resolveHostForApi(rawHost);
  return `http://${host}:4000`;
};

export const API_BASE_URL = resolveBaseUrl();
export const SOCKET_BASE_URL = API_BASE_URL;

export type MessageStatus = "sent" | "delivered" | "seen";

export type AuthUser = {
  id: number;
  name: string;
  fullName: string;
  email: string;
  avatarUrl?: string | null;
  createdAt?: string;
};

type AuthResponse = {
  token: string;
  user: AuthUser;
};

export type ConversationParticipant = {
  id: number;
  name: string;
  fullName: string;
  email: string;
  avatarUrl?: string | null;
  isOnline: boolean;
};

export type ConversationSummary = {
  id: number;
  title: string;
  isGroup: boolean;
  unreadCount: number;
  lastMessage: string;
  lastMessageAt: string | null;
  lastMessageStatus: MessageStatus | null;
  participants: ConversationParticipant[];
};

export type ChatMessage = {
  id: number;
  conversationId: number;
  senderId: number;
  senderName: string;
  content: string;
  createdAt: string;
  status: MessageStatus;
  clientId?: string | null;
};

export type DirectoryUser = {
  id: number;
  name: string;
  fullName: string;
  email: string;
  avatarUrl?: string | null;
  isOnline: boolean;
};

export type ConversationResult = {
  id: number;
  title: string;
  isGroup: boolean;
};

export type ChatListItem = {
  id: number;
  name: string;
  lastMessage: string;
  time: string;
  unreadCount: number;
  isOnline: boolean;
  isGroup: boolean;
  participants?: ConversationParticipant[];
  lastMessageStatus?: MessageStatus | null;
};

export type GroupListItem = {
  id: number;
  name: string;
  description: string;
  memberCount: number;
  lastMessage: string;
  time: string;
  unreadCount: number;
  participants?: ConversationParticipant[];
};

const withLegacyUserFields = <T extends { name: string }>(value: T) => ({
  ...value,
  fullName: value.name,
});

const formatClock = (value: string | null) =>
  value
    ? new Date(value).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

const toChatListItem = (conversation: ConversationSummary): ChatListItem => ({
  id: conversation.id,
  name: conversation.title,
  lastMessage: conversation.lastMessage,
  time: formatClock(conversation.lastMessageAt),
  unreadCount: conversation.unreadCount,
  isOnline: conversation.participants.some((participant) => participant.isOnline),
  isGroup: conversation.isGroup,
  participants: conversation.participants,
  lastMessageStatus: conversation.lastMessageStatus,
});

const toGroupListItem = (conversation: ConversationSummary): GroupListItem => ({
  id: conversation.id,
  name: conversation.title,
  description: `Group chat with ${conversation.participants.length} members`,
  memberCount: conversation.participants.length,
  lastMessage: conversation.lastMessage,
  time: formatClock(conversation.lastMessageAt),
  unreadCount: conversation.unreadCount,
  participants: conversation.participants,
});

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
  async register(input: { name: string; email: string; password: string }) {
    const data = await request<AuthResponse>(
      "/auth/register",
      {
        method: "POST",
        body: JSON.stringify(input),
      },
      false,
    );
    await authStorage.saveSession(data);
    return withLegacyUserFields(data.user);
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
    return withLegacyUserFields(data.user);
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
    return currentUser ?? withLegacyUserFields(data.user);
  },
};

export const chatApi = {
  async listChats() {
    const conversations = await request<ConversationSummary[]>("/conversations", {}, true);
    return conversations.map(toChatListItem);
  },
  async listConversations() {
    const conversations = await request<ConversationSummary[]>("/conversations", {}, true);
    return conversations.map((conversation) => ({
      ...conversation,
      participants: conversation.participants.map((participant) =>
        withLegacyUserFields(participant),
      ),
    }));
  },
  async listGroups() {
    const conversations = await request<ConversationSummary[]>("/groups", {}, true);
    return conversations.map((conversation) => ({
      ...conversation,
      participants: conversation.participants.map((participant) =>
        withLegacyUserFields(participant),
      ),
    }));
  },
  listMessages(conversationId: number) {
    return request<ChatMessage[]>(`/conversations/${conversationId}/messages`, {}, true);
  },
  sendMessage(conversationId: number, content: string, clientId?: string) {
    return request<ChatMessage>(
      `/conversations/${conversationId}/messages`,
      {
        method: "POST",
        body: JSON.stringify({ content, clientId }),
      },
      true,
    );
  },
  markSeen(conversationId: number) {
    return request<{ ok: boolean }>(
      `/conversations/${conversationId}/seen`,
      { method: "POST" },
      true,
    );
  },
  startDirectConversation(recipientId: number) {
    return request<ConversationResult>(
      "/conversations/direct",
      {
        method: "POST",
        body: JSON.stringify({ recipientId }),
      },
      true,
    );
  },
  createGroupConversation(input: { title: string; participantIds: number[] }) {
    return request<ConversationResult>(
      "/conversations/group",
      {
        method: "POST",
        body: JSON.stringify(input),
      },
      true,
    );
  },
};

export const groupApi = {
  async listGroups() {
    const groups = await chatApi.listGroups();
    return groups.map(toGroupListItem);
  },
};

export const userApi = {
  async listUsers() {
    const users = await request<DirectoryUser[]>("/users", {}, true);
    return users.map((user) => withLegacyUserFields(user));
  },
};

export const composeApi = {
  async startDirectChat(recipientId: number) {
    const conversation = await chatApi.startDirectConversation(recipientId);
    return {
      id: conversation.id,
      name: conversation.title,
    };
  },
  async createGroup(title: string, participantIds: number[]) {
    const conversation = await chatApi.createGroupConversation({ title, participantIds });
    return {
      id: conversation.id,
      name: conversation.title,
    };
  },
};

export const authStorage = {
  async saveSession(data: AuthResponse) {
    await AsyncStorage.multiSet([
      [TOKEN_KEY, data.token],
      [USER_ID_KEY, String(data.user.id)],
      [USER_KEY, JSON.stringify(withLegacyUserFields(data.user))],
    ]);
  },
  async hasSession() {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    return Boolean(token);
  },
  async getToken() {
    return AsyncStorage.getItem(TOKEN_KEY);
  },
  async getCurrentUserId() {
    const value = await AsyncStorage.getItem(USER_ID_KEY);
    return value ? Number(value) : null;
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

    const nextUser = {
      ...currentUser,
      ...updates,
      name: updates.name ?? updates.fullName ?? currentUser.name,
      fullName: updates.fullName ?? updates.name ?? currentUser.fullName ?? currentUser.name,
    };
    await AsyncStorage.multiSet([
      [USER_ID_KEY, String(nextUser.id)],
      [USER_KEY, JSON.stringify(nextUser)],
    ]);
    return nextUser;
  },
  async clearSession() {
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_ID_KEY, USER_KEY]);
  },
};
