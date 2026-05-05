import { useAppTheme } from "@/src/theme/app-theme";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Colors } from "../constants/theme";

type Props = {
  id: string;
  name: string;
  peerId?: string | null;
  peerSocketId?: string | null;
  lastMessage: string;
  time: string;
  unread: number;
  online: boolean;
  avatar: string;
  searchQuery?: string;
  isTyping?: boolean;
};

function HighlightedText({
  value,
  query,
  baseStyle,
}: {
  value: string;
  query?: string;
  baseStyle: object | object[];
}) {
  const normalizedQuery = query?.trim().toLowerCase();

  if (!normalizedQuery) {
    return (
      <Text style={baseStyle} numberOfLines={1}>
        {value}
      </Text>
    );
  }

  const matchIndex = value.toLowerCase().indexOf(normalizedQuery);
  if (matchIndex === -1) {
    return (
      <Text style={baseStyle} numberOfLines={1}>
        {value}
      </Text>
    );
  }

  const before = value.slice(0, matchIndex);
  const match = value.slice(matchIndex, matchIndex + normalizedQuery.length);
  const after = value.slice(matchIndex + normalizedQuery.length);

  return (
    <Text style={baseStyle} numberOfLines={1}>
      {before}
      <Text style={styles.highlight}>{match}</Text>
      {after}
    </Text>
  );
}

export default function ConversationItem({
  id,
  name,
  peerId,
  peerSocketId,
  lastMessage,
  time,
  unread,
  online,
  avatar,
  searchQuery,
  isTyping = false,
}: Props) {
  const router = useRouter();
  const { palette } = useAppTheme();

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: palette.background,
          borderBottomColor: palette.border,
        },
      ]}
      onPress={() =>
        router.push({
          pathname: "/chat/[id]",
          params: {
            id,
            name,
            peerId: peerId ?? "",
            peerSocketId: peerSocketId ?? "",
          },
        })
      }
      activeOpacity={0.7}
    >
      <View style={styles.avatarWrapper}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{avatar}</Text>
        </View>
        {online && (
          <View
            style={[
              styles.onlineDot,
              { borderColor: palette.background },
            ]}
          />
        )}
      </View>

      <View style={styles.info}>
        <View style={styles.topRow}>
          <HighlightedText
            value={name}
            query={searchQuery}
            baseStyle={[styles.name, { color: palette.text }]}
          />
          <Text style={[styles.time, { color: palette.textSecondary }]}>{time}</Text>
        </View>
        <View style={styles.bottomRow}>
          {isTyping ? (
            <Text style={[styles.typingText, { color: Colors.primary }]}>Typing...</Text>
          ) : (
            <HighlightedText
              value={lastMessage}
              query={searchQuery}
              baseStyle={[styles.lastMessage, { color: palette.textSecondary }]}
            />
          )}
          <View style={styles.bottomRowRight}>
            {unread > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {unread > 99 ? "99+" : unread}
                </Text>
              </View>
            )}
            {unread === 0 && (
              <Ionicons name="checkmark-done" size={16} color={Colors.primary} />
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  avatarWrapper: {
    position: "relative",
    marginRight: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  onlineDot: {
    position: "absolute",
    bottom: 1,
    right: 1,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.online,
    borderWidth: 2,
  },
  info: {
    flex: 1,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
    marginRight: 8,
  },
  time: {
    fontSize: 12,
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  bottomRowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  typingText: {
    fontSize: 14,
    fontStyle: "italic",
    flex: 1,
  },
  lastMessage: {
    fontSize: 14,
    flex: 1,
    marginRight: 8,
    lineHeight: 19,
  },
  badge: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 5,
  },
  badgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "bold",
  },
  highlight: {
    color: Colors.primary,
    fontWeight: "700",
  },
});
