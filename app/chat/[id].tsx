import { MOCK_CHATS } from "@/constants/mockData";
import {
    BorderRadius,
    Colors,
    Shadows,
    Spacing,
    Typography,
} from "@/constants/theme";
import { authStorage, chatApi } from "@/src/services/api";
import { useAppTheme } from "@/src/theme/app-theme";
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

type Message = {
  id: string;
  text: string;
  isMine: boolean;
  time: string;
  status?: "sent" | "delivered" | "read";
  date?: string;
};

const INITIAL_MESSAGES: Message[] = [
  { id: "1", text: "Hey! Are you free later?", isMine: false, time: "10:40 AM", date: "Today" },
  { id: "2", text: "Yeah, what's up?", isMine: true, time: "10:41 AM", status: "read", date: "Today" },
  { id: "3", text: "Let's grab coffee at 3pm?", isMine: false, time: "10:41 AM", date: "Today" },
  { id: "4", text: "Sounds good! Where?", isMine: true, time: "10:42 AM", status: "read", date: "Today" },
  { id: "5", text: "Hey! Are you free later?", isMine: false, time: "10:42 AM", date: "Today" },
];

function DateSeparator({ date }: { date: string }) {
  return (
    <View style={styles.dateSeparator}>
      <Text style={styles.dateText}>{date}</Text>
    </View>
  );
}

function MessageBubble({
  message,
  palette,
}: {
  message: Message;
  palette: ReturnType<typeof useAppTheme>["palette"];
}) {
  return (
    <View style={[styles.messageRow, message.isMine && styles.messageRowMine]}>
      <View
        style={[
          styles.bubble,
          message.isMine
            ? styles.bubbleMine
            : [styles.bubbleOther, { backgroundColor: palette.surface }],
        ]}
      >
        <Text
          style={[
            styles.messageText,
            { color: message.isMine ? Colors.white : palette.text },
          ]}
        >
          {message.text}
        </Text>
      </View>
      <View style={[styles.messageMeta, message.isMine && styles.messageMetaMine]}>
        <Text style={[styles.messageTime, { color: message.isMine ? Colors.white : palette.textMuted }]}>
          {message.time}
        </Text>
        {message.isMine && (
          <Ionicons
            name="checkmark-done"
            size={12}
            color={message.isMine ? Colors.white : Colors.primary}
            style={{ marginLeft: 3 }}
          />
        )}
      </View>
    </View>
  );
}

export default function ChatScreen() {
  const router = useRouter();
  const { palette } = useAppTheme();
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
    void loadData();
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
      // Keep optimistic message.
    }
  };

  const initials = (chat?.name ?? "U")
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("");

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
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View>
            <Text style={[styles.headerName, { color: palette.text }]}>
              {name ?? chat?.name ?? "Chat"}
            </Text>
            {chat?.isOnline && <Text style={styles.headerStatus}>Online</Text>}
          </View>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: palette.primarySurface }]}
          >
            <Ionicons name="call-outline" size={20} color={Colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: palette.primarySurface }]}
          >
            <Ionicons name="videocam-outline" size={20} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => {
            const showDateSeparator = index === 0 || messages[index - 1]?.date !== item.date;
            return (
              <>
                {showDateSeparator && item.date && <DateSeparator date={item.date} />}
                <MessageBubble message={item} palette={palette} />
              </>
            );
          }}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: false })
          }
        />

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
          >
            <Ionicons name="attach" size={22} color={Colors.primary} />
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
            placeholder="Type your message..."
            placeholderTextColor={palette.textMuted}
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
            <TouchableOpacity
              style={[styles.micBtn, { backgroundColor: palette.primarySurface }]}
            >
              <Ionicons name="mic-outline" size={22} color={Colors.primary} />
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
  headerStatus: { fontSize: Typography.fontSizes.xs, color: Colors.online },
  headerActions: { flexDirection: "row", gap: 4 },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
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
  dateSeparator: {
    alignItems: "center",
    marginVertical: 16,
  },
  dateText: {
    fontSize: 12,
    color: Colors.primary,
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    fontWeight: "600",
  },
});
