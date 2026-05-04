import { useAppTheme } from "@/src/theme/app-theme";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Colors } from "../constants/theme";
import type { MessageStatus } from "@/src/services/api";

type Props = {
  id: string;
  name: string;
  lastMessage: string;
  time: string;
  unread: number;
  online: boolean;
  avatar: string;
  status?: MessageStatus | null;
  isGroup?: boolean;
  searchQuery?: string;
};

function StatusIndicator({ status }: { status?: MessageStatus | null }) {
  if (!status) {
    return null;
  }

  const color =
    status === "seen"
      ? Colors.primary
      : status === "delivered"
        ? Colors.textSecondary
        : Colors.textMuted;

  return (
    <Text style={[styles.status, { color }]}>
      {status === "sent" ? "Sent" : status === "delivered" ? "Delivered" : "Seen"}
    </Text>
  );
}

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
  lastMessage,
  time,
  unread,
  online,
  avatar,
  status,
  searchQuery,
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
          params: { id, name },
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
          <HighlightedText
            value={lastMessage}
            query={searchQuery}
            baseStyle={[styles.lastMessage, { color: palette.textSecondary }]}
          />
          {unread === 0 && <StatusIndicator status={status} />}
          {unread > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {unread > 99 ? "99+" : unread}
              </Text>
            </View>
          )}
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
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  avatarWrapper: {
    position: "relative",
    marginRight: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
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
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
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
  status: {
    fontSize: 11,
    fontWeight: "600",
    marginRight: 4,
  },
  highlight: {
    color: Colors.primary,
    fontWeight: "700",
  },
});
