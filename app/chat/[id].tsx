import { MOCK_CHATS } from "@/constants/mockData";
import {
  BorderRadius,
  Colors,
  Shadows,
  Spacing,
  Typography,
} from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
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
import { authStorage, chatApi } from "@/src/services/api";

type Message = {
  id: string;
  text: string;
  isMine: boolean;
  time: string;
  status?: "sent" | "delivered" | "read";
};

const INITIAL_MESSAGES: Message[] = [
  {
    id: "1",
    text: "Hey! Are you free later?",
    isMine: false,
    time: "10:40 AM",
  },
  {
    id: "2",
    text: "Yeah, what's up?",
    isMine: true,
    time: "10:41 AM",
    status: "read",
  },
  {
    id: "3",
    text: "Let's grab coffee at 3pm?",
    isMine: false,
    time: "10:41 AM",
  },
  {
    id: "4",
    text: "Sounds good! Where?",
    isMine: true,
    time: "10:42 AM",
    status: "read",
  },
  {
    id: "5",
    text: "Hey! Are you free later?",
    isMine: false,
    time: "10:42 AM",
  },
];

function MessageBubble({ message }: { message: Message }) {
  return (
    <View style={[styles.messageRow, message.isMine && styles.messageRowMine]}>
      <View
        style={[
          styles.bubble,
          message.isMine ? styles.bubbleMine : styles.bubbleOther,
        ]}
      >
        <Text
          style={[styles.messageText, message.isMine && styles.messageTextMine]}
        >
          {message.text}
        </Text>
      </View>
      <View
        style={[styles.messageMeta, message.isMine && styles.messageMetaMine]}
      >
        <Text style={styles.messageTime}>{message.time}</Text>
        {message.isMine && message.status === "read" && (
          <Ionicons
            name="checkmark-done"
            size={12}
            color={Colors.primary}
            style={{ marginLeft: 3 }}
          />
        )}
      </View>
    </View>
  );
}

export default function ChatScreen() {
  const router = useRouter();
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const chat = MOCK_CHATS.find((c) => c.id === id);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!id) return;
      const userId = await authStorage.getCurrentUserId();
      setCurrentUserId(userId);
      try {
        const apiMessages = await chatApi.listMessages(id);
        setMessages(
          apiMessages.map((m) => ({
            id: m.id,
            text: m.text,
            isMine: userId === m.senderId,
            time: new Date(m.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
            status: "sent",
          })),
        );
      } catch {
        setMessages(INITIAL_MESSAGES);
      }
    };
    loadData();
  }, [id]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const pendingText = input.trim();
    const newMsg: Message = {
      id: Date.now().toString(),
      text: pendingText,
      isMine: true,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      status: "sent",
    };
    setMessages((prev) => [...prev, newMsg]);
    setInput("");
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    if (!id || !currentUserId) return;
    try {
      const saved = await chatApi.sendMessage(id, pendingText);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === newMsg.id
            ? {
                ...m,
                id: saved.id,
                time: new Date(saved.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
              }
            : m,
        ),
      );
    } catch {
      // Leave optimistic message in place to keep UX responsive.
    }
  };

  const initials = (chat?.name ?? "U")
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("");

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View>
            <Text style={styles.headerName}>{name ?? chat?.name ?? "Chat"}</Text>
            {chat?.isOnline && <Text style={styles.headerStatus}>Online</Text>}
          </View>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.actionBtn}>
            <Ionicons name="call-outline" size={20} color={Colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn}>
            <Ionicons
              name="videocam-outline"
              size={20}
              color={Colors.primary}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Messages */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <MessageBubble message={item} />}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: false })
          }
        />

        {/* Input Bar */}
        <View style={styles.inputBar}>
          <TouchableOpacity style={styles.attachBtn}>
            <Ionicons name="add" size={22} color={Colors.primary} />
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor={Colors.textMuted}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={1000}
          />
          {input.trim().length > 0 ? (
            <TouchableOpacity style={styles.sendBtn} onPress={sendMessage}>
              <Ionicons name="send" size={18} color={Colors.white} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.micBtn}>
              <Ionicons name="mic-outline" size={22} color={Colors.primary} />
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.white,
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
    color: Colors.text,
  },
  headerStatus: { fontSize: Typography.fontSizes.xs, color: Colors.online },
  headerActions: { flexDirection: "row", gap: 4 },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primarySurface,
    alignItems: "center",
    justifyContent: "center",
  },
  messagesList: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
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
    paddingVertical: Spacing.sm,
    borderRadius: 18,
  },
  bubbleOther: {
    backgroundColor: Colors.surface,
    borderBottomLeftRadius: 4,
  },
  bubbleMine: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  messageText: {
    fontSize: Typography.fontSizes.md,
    color: Colors.text,
    lineHeight: 22,
  },
  messageTextMine: { color: Colors.white },
  messageMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 3,
    marginHorizontal: 4,
  },
  messageMetaMine: { justifyContent: "flex-end" },
  messageTime: { fontSize: Typography.fontSizes.xs, color: Colors.textMuted },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.white,
    gap: Spacing.sm,
  },
  attachBtn: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primarySurface,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 1,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Platform.OS === "ios" ? 10 : 8,
    fontSize: Typography.fontSizes.md,
    color: Colors.text,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: Colors.border,
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
    backgroundColor: Colors.primarySurface,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 1,
  },
});
