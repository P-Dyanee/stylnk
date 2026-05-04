import { io, type Socket } from "socket.io-client";
import {
  SOCKET_BASE_URL,
  type ChatMessage,
  type MessageStatus,
  authStorage,
} from "./api";

type EventMap = {
  "presence:snapshot": { userIds: number[] };
  "presence:update": { userId: number; isOnline: boolean };
  "conversation:refresh": undefined;
  "message:new": ChatMessage;
  "message:status": {
    conversationId: number;
    messageId: number;
    status: MessageStatus;
  };
  "call:incoming": {
    callId: string;
    conversationId: number;
    mode: "audio" | "video";
    initiatedBy: { id: number; name: string };
    createdAt: string;
  };
  "call:accepted": {
    callId: string;
    conversationId: number;
    userId: number;
  };
  "call:declined": {
    callId: string;
    conversationId: number;
    userId: number;
  };
  "call:ended": {
    callId: string;
    conversationId: number;
    userId: number;
  };
  "webrtc:offer": {
    callId: string;
    fromUserId: number;
    payload: unknown;
  };
  "webrtc:answer": {
    callId: string;
    fromUserId: number;
    payload: unknown;
  };
  "webrtc:ice-candidate": {
    callId: string;
    fromUserId: number;
    payload: unknown;
  };
};

class RealtimeClient {
  private socket: Socket | null = null;

  async connect() {
    const token = await authStorage.getToken();
    if (!token) {
      return null;
    }

    if (this.socket) {
      if (!this.socket.connected) {
        this.socket.connect();
      }
      return this.socket;
    }

    this.socket = io(SOCKET_BASE_URL, {
      transports: ["websocket"],
      auth: { token },
      autoConnect: true,
    });

    return this.socket;
  }

  disconnect() {
    if (!this.socket) {
      return;
    }

    this.socket.removeAllListeners();
    this.socket.disconnect();
    this.socket = null;
  }

  getSocket() {
    return this.socket;
  }

  isConnected() {
    return Boolean(this.socket?.connected);
  }

  on<K extends keyof EventMap>(event: K, handler: (payload: EventMap[K]) => void) {
    if (!this.socket) {
      return () => undefined;
    }

    this.socket.on(event as never, handler as never);
    return () => {
      this.socket?.off(event as never, handler as never);
    };
  }

  onConnect(handler: () => void) {
    if (!this.socket) {
      return () => undefined;
    }

    this.socket.on("connect", handler);
    return () => {
      this.socket?.off("connect", handler);
    };
  }

  onDisconnect(handler: () => void) {
    if (!this.socket) {
      return () => undefined;
    }

    this.socket.on("disconnect", handler);
    return () => {
      this.socket?.off("disconnect", handler);
    };
  }

  emit(event: string, payload?: unknown) {
    this.socket?.emit(event, payload);
  }

  emitWithAck<TResponse>(event: string, payload: unknown) {
    return new Promise<TResponse>((resolve, reject) => {
      if (!this.socket) {
        reject(new Error("Socket is not connected"));
        return;
      }

      this.socket.emit(event, payload, (response: TResponse & { ok?: boolean; message?: string }) => {
        if (typeof response === "object" && response && "ok" in response && response.ok === false) {
          reject(new Error(response.message || "Socket request failed"));
          return;
        }
        resolve(response);
      });
    });
  }
}

export const realtimeClient = new RealtimeClient();
