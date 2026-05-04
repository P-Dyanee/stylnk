import React from "react";
import { Alert } from "react-native";
import { authApi, authStorage, type AuthUser } from "@/src/services/api";
import { realtimeClient } from "@/src/services/realtime";

type CallMode = "audio" | "video";

type IncomingCall = {
  callId: string;
  conversationId: number;
  mode: CallMode;
  initiatedBy: {
    id: number;
    name: string;
  };
  createdAt: string;
};

export type ActiveCall = {
  callId: string;
  conversationId: number;
  mode: CallMode;
  peerName: string;
  /** Remote user id for WebRTC signaling relay (`webrtc:*` socket events). */
  peerUserId: number;
  direction: "incoming" | "outgoing";
  state: "ringing" | "connected" | "ended";
  createdAt: string;
};

type SessionContextValue = {
  ready: boolean;
  user: AuthUser | null;
  socketConnected: boolean;
  onlineUserIds: number[];
  incomingCall: IncomingCall | null;
  activeCall: ActiveCall | null;
  login: (input: { email: string; password: string }) => Promise<void>;
  register: (input: { name: string; email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  startCall: (input: {
    conversationId: number;
    mode: CallMode;
    peerName: string;
  }) => Promise<void>;
  acceptIncomingCall: () => void;
  declineIncomingCall: () => void;
  endCall: () => void;
};

const SessionContext = React.createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: React.PropsWithChildren) {
  const [ready, setReady] = React.useState(false);
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [socketConnected, setSocketConnected] = React.useState(false);
  const [onlineUserIds, setOnlineUserIds] = React.useState<number[]>([]);
  const [incomingCall, setIncomingCall] = React.useState<IncomingCall | null>(null);
  const [activeCall, setActiveCall] = React.useState<ActiveCall | null>(null);
  const listenersAttachedRef = React.useRef(false);

  const attachRealtime = React.useCallback(async () => {
    const socket = await realtimeClient.connect();
    if (!socket) {
      setSocketConnected(false);
      return;
    }

    if (listenersAttachedRef.current) {
      setSocketConnected(socket.connected);
      return;
    }

    listenersAttachedRef.current = true;
    realtimeClient.onConnect(() => setSocketConnected(true));
    realtimeClient.onDisconnect(() => setSocketConnected(false));

    realtimeClient.on("presence:snapshot", (payload) => {
      setOnlineUserIds(payload.userIds);
    });

    realtimeClient.on("presence:update", (payload) => {
      setOnlineUserIds((current) => {
        const next = new Set(current);
        if (payload.isOnline) {
          next.add(payload.userId);
        } else {
          next.delete(payload.userId);
        }
        return Array.from(next).sort((a, b) => a - b);
      });
    });

    realtimeClient.on("call:incoming", (payload) => {
      setIncomingCall(payload);
      setActiveCall({
        callId: payload.callId,
        conversationId: payload.conversationId,
        mode: payload.mode,
        peerName: payload.initiatedBy.name,
        peerUserId: payload.initiatedBy.id,
        direction: "incoming",
        state: "ringing",
        createdAt: payload.createdAt,
      });
    });

    realtimeClient.on("call:accepted", (payload) => {
      setActiveCall((current) =>
        current && current.callId === payload.callId
          ? { ...current, state: "connected" }
          : current,
      );
    });

    realtimeClient.on("call:declined", (payload) => {
      setIncomingCall((current) =>
        current && current.callId === payload.callId ? null : current,
      );
      setActiveCall((current) =>
        current && current.callId === payload.callId
          ? { ...current, state: "ended" }
          : current,
      );
    });

    realtimeClient.on("call:ended", (payload) => {
      setIncomingCall((current) =>
        current && current.callId === payload.callId ? null : current,
      );
      setActiveCall((current) =>
        current && current.callId === payload.callId
          ? { ...current, state: "ended" }
          : current,
      );
    });
  }, []);

  React.useEffect(() => {
    const bootstrap = async () => {
      const currentUser = await authStorage.getCurrentUser();
      setUser(currentUser);
      if (currentUser) {
        await attachRealtime();
      }
      setReady(true);
    };

    void bootstrap();

    return () => {
      realtimeClient.disconnect();
    };
  }, [attachRealtime]);

  const login = React.useCallback(
    async (input: { email: string; password: string }) => {
      const nextUser = await authApi.login(input);
      setUser(nextUser);
      await attachRealtime();
    },
    [attachRealtime],
  );

  const register = React.useCallback(
    async (input: { name: string; email: string; password: string }) => {
      const nextUser = await authApi.register(input);
      setUser(nextUser);
      await attachRealtime();
    },
    [attachRealtime],
  );

  const logout = React.useCallback(async () => {
    realtimeClient.disconnect();
    listenersAttachedRef.current = false;
    await authStorage.clearSession();
    setUser(null);
    setSocketConnected(false);
    setOnlineUserIds([]);
    setIncomingCall(null);
    setActiveCall(null);
  }, []);

  const startCall = React.useCallback(
    async (input: { conversationId: number; mode: CallMode; peerName: string }) => {
      const conversationId = Math.trunc(Number(input.conversationId));
      if (!Number.isFinite(conversationId) || conversationId <= 0) {
        Alert.alert("Call failed", "That conversation is not valid for a call.");
        return;
      }

      const mode: CallMode = input.mode === "video" ? "video" : "audio";

      try {
        const response = await realtimeClient.emitWithAck<{
          ok: true;
          call: {
            callId: string;
            conversationId: number;
            participantIds: number[];
            mode: CallMode;
            createdAt: string;
          };
        }>("call:start", {
          conversationId,
          mode,
        });

        const peerUserId = response.call.participantIds[0];
        if (peerUserId == null || !Number.isFinite(peerUserId)) {
          Alert.alert("Call failed", "No peer found for this conversation.");
          return;
        }

        setIncomingCall(null);
        setActiveCall({
          callId: response.call.callId,
          conversationId: response.call.conversationId,
          mode,
          peerName: input.peerName,
          peerUserId,
          direction: "outgoing",
          state: "ringing",
          createdAt: response.call.createdAt,
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Could not start call. Try again.";
        Alert.alert("Call failed", message);
      }
    },
    [],
  );

  const acceptIncomingCall = React.useCallback(() => {
    if (!incomingCall) {
      return;
    }

    realtimeClient.emit("call:accept", { callId: incomingCall.callId });
    setActiveCall((current) =>
      current && current.callId === incomingCall.callId
        ? { ...current, state: "connected" }
        : current,
    );
    setIncomingCall(null);
  }, [incomingCall]);

  const declineIncomingCall = React.useCallback(() => {
    if (!incomingCall) {
      return;
    }

    realtimeClient.emit("call:decline", { callId: incomingCall.callId });
    setIncomingCall(null);
    setActiveCall(null);
  }, [incomingCall]);

  const endCall = React.useCallback(() => {
    if (!activeCall) {
      return;
    }

    realtimeClient.emit("call:end", { callId: activeCall.callId });
    setIncomingCall(null);
    setActiveCall(null);
  }, [activeCall]);

  const value = React.useMemo<SessionContextValue>(
    () => ({
      ready,
      user,
      socketConnected,
      onlineUserIds,
      incomingCall,
      activeCall,
      login,
      register,
      logout,
      startCall,
      acceptIncomingCall,
      declineIncomingCall,
      endCall,
    }),
    [
      ready,
      user,
      socketConnected,
      onlineUserIds,
      incomingCall,
      activeCall,
      login,
      register,
      logout,
      startCall,
      acceptIncomingCall,
      declineIncomingCall,
      endCall,
    ],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = React.useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used inside SessionProvider");
  }
  return context;
}
