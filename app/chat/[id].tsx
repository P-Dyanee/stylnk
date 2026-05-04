import {
  BorderRadius,
  Colors,
  Shadows,
  Spacing,
  Typography,
} from "@/constants/theme";
import { useSession } from "@/src/providers/session-provider";
import { authStorage, chatApi, type ChatMessage } from "@/src/services/api";
import { realtimeClient } from "@/src/services/realtime";
import { useAppTheme } from "@/src/theme/app-theme";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type MessageViewModel = ChatMessage & {
  isMine: boolean;
  time: string;
  pending?: boolean;
};

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusIcon({ status }: { status: ChatMessage["status"] }) {
  if (status === "sent") {
    return <Ionicons name="checkmark" size={12} color={Colors.white} />;
  }

  if (status === "delivered") {
    return <Ionicons name="checkmark-done" size={12} color="rgba(255,255,255,0.85)" />;
  }

  return <Ionicons name="checkmark-done" size={12} color="#C7BCFF" />;
}

function MessageBubble({
  message,
  palette,
}: {
  message: MessageViewModel;
  palette: ReturnType<typeof useAppTheme>["palette"];
}) {
  return (
    <View style={[styles.messageRow, message.isMine && styles.messageRowMine]}>
      <View
        style={[
          styles.bubble,
          message.isMine
            ? [styles.bubbleMine, message.pending && styles.bubblePending]
            : [styles.bubbleOther, { backgroundColor: palette.surface }],
        ]}
      >
        {!message.isMine && (
          <Text style={[styles.senderName, { color: palette.textMuted }]}>
            {message.senderName}
          </Text>
        )}
        <Text
          style={[
            styles.messageText,
            { color: message.isMine ? Colors.white : palette.text },
          ]}
        >
          {message.content}
        </Text>
      </View>
      <View style={[styles.messageMeta, message.isMine && styles.messageMetaMine]}>
        <Text style={[styles.messageTime, { color: palette.textMuted }]}>
          {message.time}
        </Text>
        {message.isMine && (
          <View style={styles.statusWrap}>
            <StatusIcon status={message.status} />
          </View>
        )}
      </View>
    </View>
  );
}

export default function ChatScreen() {
  const router = useRouter();
  const { palette } = useAppTheme();
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const { activeCall, incomingCall, startCall, acceptIncomingCall, declineIncomingCall, endCall } =
    useSession();
  const conversationId = Number(id);
  const [messages, setMessages] = React.useState<MessageViewModel[]>([]);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [currentUserId, setCurrentUserId] = React.useState<number | null>(null);
  const flatListRef = React.useRef<FlatList>(null);

  const mergeMessage = React.useCallback(
    (message: ChatMessage, userId: number | null) => {
      const next: MessageViewModel = {
        ...message,
        isMine: userId === message.senderId,
        time: formatTime(message.createdAt),
      };

      setMessages((current) => {
        const existingIndex = current.findIndex(
          (item) =>
            item.id === message.id ||
            (message.clientId && item.clientId === message.clientId),
        );

        if (existingIndex === -1) {
          return [...current, next].sort(
            (left, right) =>
              new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
          );
        }

        const updated = [...current];
        updated[existingIndex] = {
          ...updated[existingIndex],
          ...next,
          pending: false,
        };
        return updated;
      });
    },
    [],
  );

  const loadMessages = React.useCallback(async () => {
    if (!Number.isInteger(conversationId) || conversationId <= 0) {
      return;
    }

    setLoading(true);
    const userId = await authStorage.getCurrentUserId();
    setCurrentUserId(userId);
    try {
      const apiMessages = await chatApi.listMessages(conversationId);
      setMessages(
        apiMessages.map((message) => ({
          ...message,
          isMine: userId === message.senderId,
          time: formatTime(message.createdAt),
        })),
      );
      realtimeClient.emit("conversation:open", { conversationId });
      await chatApi.markSeen(conversationId);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  React.useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

  React.useEffect(() => {
    const unsubscribeNew = realtimeClient.on("message:new", (message) => {
      if (message.conversationId !== conversationId) {
        return;
      }

      mergeMessage(message, currentUserId);
      if (message.senderId !== currentUserId) {
        realtimeClient.emit("message:seen", { conversationId });
        void chatApi.markSeen(conversationId);
      }
    });

    const unsubscribeStatus = realtimeClient.on("message:status", (payload) => {
      if (payload.conversationId !== conversationId) {
        return;
      }

      setMessages((current) =>
        current.map((message) =>
          message.id === payload.messageId
            ? { ...message, status: payload.status, pending: false }
            : message,
        ),
      );
    });

    return () => {
      unsubscribeNew();
      unsubscribeStatus();
    };
  }, [conversationId, currentUserId, mergeMessage]);

  React.useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || !Number.isInteger(conversationId) || !currentUserId) {
      return;
    }

    const pendingText = input.trim();
    const clientId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const optimistic: MessageViewModel = {
      id: -Date.now(),
      conversationId,
      senderId: currentUserId,
      senderName: "You",
      content: pendingText,
      createdAt: new Date().toISOString(),
      time: formatTime(new Date().toISOString()),
      status: "sent",
      isMine: true,
      pending: true,
      clientId,
    };

    setMessages((current) => [...current, optimistic]);
    setInput("");

    try {
      if (realtimeClient.isConnected()) {
        const response = await realtimeClient.emitWithAck<{
          ok: true;
          message: ChatMessage;
        }>("message:send", {
          conversationId,
          content: pendingText,
          clientId,
        });
        mergeMessage(response.message, currentUserId);
      } else {
        const saved = await chatApi.sendMessage(conversationId, pendingText, clientId);
        mergeMessage(saved, currentUserId);
      }
    } catch {
      setMessages((current) =>
        current.map((message) =>
          message.clientId === clientId
            ? {
                ...message,
                pending: false,
                status: "sent",
              }
            : message,
        ),
      );
    }
  };

  const handleStartCall = async (mode: "audio" | "video") => {
    if (!Number.isInteger(conversationId) || conversationId <= 0) {
      return;
    }

    await startCall({
      conversationId,
      mode,
      peerName: name ?? "Conversation",
    });
  };

  const currentCall =
    activeCall && activeCall.conversationId === conversationId ? activeCall : null;
  const currentIncomingCall =
    incomingCall && incomingCall.conversationId === conversationId ? incomingCall : null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
      <StatusBar
        barStyle={palette.statusBar === "dark" ? "light-content" : "dark-content"}
        backgroundColor={palette.background}
      />

      <View
        style={[
          styles.header,
          {
            borderBottomColor: palette.border,
            backgroundColor: palette.card,
          },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={palette.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {(name ?? "Chat")
                .split(" ")
                .map((part) => part[0])
                .slice(0, 2)
                .join("")}
            </Text>
          </View>
          <View style={styles.headerCopy}>
            <Text style={[styles.headerName, { color: palette.text }]}>
              {name ?? "Chat"}
            </Text>
            <Text style={[styles.headerStatus, { color: palette.textSecondary }]}>
              {currentCall
                ? currentCall.state === "connected"
                  ? `${currentCall.mode === "audio" ? "Audio" : "Video"} call live`
                  : "Calling..."
                : "Realtime conversation"}
            </Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: palette.primarySurface }]}
            onPress={() => void handleStartCall("audio")}
          >
            <Ionicons name="call-outline" size={20} color={Colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: palette.primarySurface }]}
            onPress={() => void handleStartCall("video")}
          >
            <Ionicons name="videocam-outline" size={20} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {currentIncomingCall && (
        <View style={[styles.callBanner, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <View style={styles.callBannerCopy}>
            <Text style={[styles.callBannerTitle, { color: palette.text }]}>
              Incoming {currentIncomingCall.mode} call
            </Text>
            <Text style={[styles.callBannerSubtitle, { color: palette.textSecondary }]}>
              {currentIncomingCall.initiatedBy.name} is calling you
            </Text>
          </View>
          <View style={styles.callBannerActions}>
            <TouchableOpacity style={styles.declineBtn} onPress={declineIncomingCall}>
              <Ionicons name="close" size={18} color={Colors.white} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.acceptBtn} onPress={acceptIncomingCall}>
              <Ionicons name="call" size={18} color={Colors.white} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {currentCall && !currentIncomingCall && (
        <View style={[styles.liveCallCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <View>
            <Text style={[styles.callBannerTitle, { color: palette.text }]}>
              {currentCall.direction === "outgoing" ? "Outgoing" : "Active"} {currentCall.mode} call
            </Text>
            <Text style={[styles.callBannerSubtitle, { color: palette.textSecondary }]}>
              {currentCall.state === "connected"
                ? `Connected with ${currentCall.peerName}`
                : `Waiting for ${currentCall.peerName}`}
            </Text>
          </View>
          <TouchableOpacity style={styles.endCallBtn} onPress={endCall}>
            <Ionicons name="call" size={18} color={Colors.white} />
          </TouchableOpacity>
        </View>
      )}

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {loading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator color={Colors.primary} />
            <Text style={[styles.loadingText, { color: palette.textSecondary }]}>
              Loading messages...
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => `${item.id}-${item.clientId ?? "server"}`}
            renderItem={({ item }) => <MessageBubble message={item} palette={palette} />}
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
          />
        )}

        <View
          style={[
            styles.inputBar,
            {
              borderTopColor: palette.border,
              backgroundColor: palette.card,
            },
          ]}
        >
          <TouchableOpacity
            style={[styles.attachBtn, { backgroundColor: palette.primarySurface }]}
            onPress={() => void handleStartCall("audio")}
          >
            <Ionicons name="call-outline" size={20} color={Colors.primary} />
          </TouchableOpacity>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: palette.surface,
                color: palette.text,
                borderColor: palette.border,
              },
            ]}
            placeholder="Type a message..."
            placeholderTextColor={palette.textMuted}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={2000}
          />
          {input.trim().length > 0 ? (
            <TouchableOpacity style={styles.sendBtn} onPress={() => void sendMessage()}>
              <Ionicons name="send" size={18} color={Colors.white} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.micBtn, { backgroundColor: palette.primarySurface }]}
              onPress={() => void handleStartCall("video")}
            >
              <Ionicons name="videocam-outline" size={22} color={Colors.primary} />
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginLeft: Spacing.sm,
  },
  headerCopy: {
    flex: 1,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: Colors.white,
    fontWeight: Typography.fontWeights.bold,
    fontSize: 14,
  },
  headerName: {
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.semibold,
  },
  headerStatus: { fontSize: Typography.fontSizes.xs },
  headerActions: { flexDirection: "row", gap: 4 },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  callBanner: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.md,
  },
  liveCallCard: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  callBannerCopy: { flex: 1 },
  callBannerTitle: {
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.semibold,
  },
  callBannerSubtitle: {
    marginTop: 2,
    fontSize: Typography.fontSizes.sm,
  },
  callBannerActions: {
    flexDirection: "row",
    gap: 10,
  },
  declineBtn: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.danger,
    alignItems: "center",
    justifyContent: "center",
  },
  acceptBtn: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.success,
    alignItems: "center",
    justifyContent: "center",
  },
  endCallBtn: {
    width: 42,
    height: 42,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.danger,
    alignItems: "center",
    justifyContent: "center",
    transform: [{ rotate: "135deg" }],
  },
  messagesList: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    gap: Spacing.sm,
  },
  messageRow: {
    alignItems: "flex-start",
    marginBottom: Spacing.sm,
  },
  messageRowMine: { alignItems: "flex-end" },
  bubble: {
    maxWidth: "78%",
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    borderRadius: 18,
  },
  bubbleOther: {
    borderBottomLeftRadius: 4,
  },
  bubbleMine: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  bubblePending: {
    opacity: 0.78,
  },
  senderName: {
    fontSize: 11,
    marginBottom: 4,
    fontWeight: Typography.fontWeights.medium,
  },
  messageText: {
    fontSize: Typography.fontSizes.md,
    lineHeight: 23,
  },
  messageMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 3,
    marginHorizontal: 4,
  },
  messageMetaMine: { justifyContent: "flex-end" },
  messageTime: { fontSize: Typography.fontSizes.xs },
  statusWrap: {
    marginLeft: 4,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    gap: Spacing.sm,
  },
  attachBtn: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 1,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Platform.OS === "ios" ? 11 : 9,
    fontSize: Typography.fontSizes.md,
    maxHeight: 100,
    borderWidth: 1,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 1,
    ...Shadows.sm,
  },
  micBtn: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 1,
  },
  loadingState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  loadingText: {
    fontSize: Typography.fontSizes.sm,
  },
});
