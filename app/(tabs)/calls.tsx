import { Call, MOCK_CALLS } from "@/constants/mockData";
import {
  BorderRadius,
  Colors,
  Shadows,
  Spacing,
  Typography,
} from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  FlatList,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

function Avatar({ name, size = 52 }: { name: string; size?: number }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("");
  return (
    <View
      style={[
        styles.avatarCircle,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Text style={[styles.avatarText, { fontSize: size * 0.32 }]}>
        {initials}
      </Text>
    </View>
  );
}

function CallIcon({
  type,
  callType,
}: {
  type: Call["type"];
  callType: Call["callType"];
}) {
  const color =
    type === "missed"
      ? Colors.danger
      : type === "incoming"
        ? Colors.success
        : Colors.primary;
  const arrow =
    type === "incoming"
      ? "arrow-down"
      : type === "outgoing"
        ? "arrow-up"
        : "arrow-down";
  const icon = callType === "video" ? "videocam-outline" : "call-outline";

  return (
    <View style={styles.callIconRow}>
      <Ionicons name={arrow as any} size={12} color={color} />
      <Ionicons
        name={icon as any}
        size={16}
        color={color}
        style={{ marginLeft: 2 }}
      />
    </View>
  );
}

function CallItem({ item }: { item: Call }) {
  return (
    <View style={styles.callItem}>
      <Avatar name={item.name} />
      <View style={styles.callContent}>
        <Text
          style={[styles.callName, item.type === "missed" && styles.missedName]}
        >
          {item.name}
        </Text>
        <View style={styles.callMeta}>
          <CallIcon type={item.type} callType={item.callType} />
          <Text style={styles.callTime}>{item.time}</Text>
          {item.duration && (
            <Text style={styles.callDuration}> · {item.duration}</Text>
          )}
        </View>
      </View>
      <TouchableOpacity style={styles.callBackBtn} activeOpacity={0.7}>
        <Ionicons
          name={item.callType === "video" ? "videocam-outline" : "call-outline"}
          size={20}
          color={Colors.primary}
        />
      </TouchableOpacity>
    </View>
  );
}

export default function CallsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Calls</Text>
        <TouchableOpacity style={styles.headerButton}>
          <Ionicons name="search-outline" size={22} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={MOCK_CALLS}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <CallItem item={item} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />

      <TouchableOpacity style={styles.fab} activeOpacity={0.85}>
        <Ionicons name="call" size={24} color={Colors.white} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  headerTitle: {
    fontSize: Typography.fontSizes.xxxl,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.text,
    letterSpacing: -0.5,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primarySurface,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: { paddingBottom: 100 },
  callItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  avatarCircle: {
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.lg,
  },
  avatarText: {
    color: Colors.white,
    fontWeight: Typography.fontWeights.bold,
  },
  callContent: { flex: 1 },
  callName: {
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.medium,
    color: Colors.text,
    marginBottom: 3,
  },
  missedName: { color: Colors.danger },
  callMeta: { flexDirection: "row", alignItems: "center" },
  callIconRow: { flexDirection: "row", alignItems: "center", marginRight: 6 },
  callTime: { fontSize: Typography.fontSizes.sm, color: Colors.textSecondary },
  callDuration: { fontSize: Typography.fontSizes.sm, color: Colors.textMuted },
  callBackBtn: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primarySurface,
    alignItems: "center",
    justifyContent: "center",
  },
  separator: { height: 1, backgroundColor: Colors.divider, marginLeft: 88 },
  fab: {
    position: "absolute",
    bottom: 90,
    right: Spacing.xl,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    ...Shadows.lg,
  },
});
