import {
  BorderRadius,
  Colors,
  Shadows,
  Spacing,
  Typography,
} from "@/constants/theme";
import { authStorage, groupApi, type GroupListItem } from "@/src/services/api";
import { useAppTheme } from "@/src/theme/app-theme";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function GroupsScreen() {
  const router = useRouter();
  const { palette } = useAppTheme();
  const [search, setSearch] = useState("");
  const [groups, setGroups] = useState<GroupListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadGroups = React.useCallback(async (showRefresh = false) => {
    if (showRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const result = await groupApi.listGroups();
      setGroups(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Please try again.";

      if (message.toLowerCase().includes("auth token")) {
        await authStorage.clearSession();
        router.replace("/auth/login");
        return;
      }

      Alert.alert("Couldn't load groups", message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useFocusEffect(
    React.useCallback(() => {
      loadGroups();
    }, [loadGroups]),
  );

  const filteredGroups = groups.filter(
    (group) =>
      group.name.toLowerCase().includes(search.toLowerCase()) ||
      group.description.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: palette.text }]}>Groups</Text>
        <TouchableOpacity
          style={[styles.headerButton, { backgroundColor: palette.primarySurface }]}
          activeOpacity={0.8}
        >
          <Ionicons name="people-outline" size={20} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <View
        style={[
          styles.searchContainer,
          { backgroundColor: palette.card, borderColor: palette.border },
        ]}
      >
        <Ionicons
          name="search-outline"
          size={18}
          color={palette.textSecondary}
        />
        <TextInput
          style={[styles.searchInput, { color: palette.text }]}
          placeholder="Search groups"
          placeholderTextColor={palette.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Ionicons
              name="close-circle"
              size={18}
              color={palette.textSecondary}
            />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color={Colors.primary} />
          <Text style={[styles.loadingText, { color: palette.textSecondary }]}>
            Loading groups...
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredGroups}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={() => loadGroups(true)}
          ItemSeparatorComponent={() => (
            <View style={[styles.separator, { backgroundColor: palette.divider }]} />
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons
                name="people-outline"
                size={44}
                color={palette.textMuted}
              />
              <Text style={[styles.emptyTitle, { color: palette.text }]}>
                {search ? "No groups found" : "No groups yet"}
              </Text>
              <Text style={[styles.emptyText, { color: palette.textSecondary }]}>
                {search
                  ? "Try a different name or topic."
                  : "Join or create a group to see it here."}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const initials = item.name
              .split(" ")
              .map((part) => part[0])
              .filter(Boolean)
              .slice(0, 2)
              .join("")
              .toUpperCase();

            return (
              <TouchableOpacity
                style={styles.groupCard}
                activeOpacity={0.85}
                onPress={() =>
                  router.push({
                    pathname: "/chat/[id]",
                    params: {
                      id: item.id,
                      name: item.name,
                    },
                  })
                }
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initials}</Text>
                </View>

                <View style={styles.groupContent}>
                  <View style={styles.groupTopRow}>
                    <Text style={[styles.groupName, { color: palette.text }]} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={[styles.groupTime, { color: palette.textMuted }]}>
                      {item.time}
                    </Text>
                  </View>

                  <Text
                    style={[styles.groupDescription, { color: palette.textSecondary }]}
                    numberOfLines={1}
                  >
                    {item.description}
                  </Text>

                  <View style={styles.groupBottomRow}>
                    <View style={styles.metaRow}>
                      <Ionicons
                        name="people"
                        size={14}
                        color={palette.textSecondary}
                      />
                      <Text style={[styles.memberCount, { color: palette.textSecondary }]}>
                        {item.memberCount} members
                      </Text>
                    </View>

                    {item.unreadCount > 0 && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>
                          {item.unreadCount > 99 ? "99+" : item.unreadCount}
                        </Text>
                      </View>
                    )}
                  </View>

                  <Text style={[styles.lastMessage, { color: palette.text }]} numberOfLines={1}>
                    {item.lastMessage}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  title: {
    fontSize: Typography.fontSizes.xxxl,
    fontWeight: Typography.fontWeights.bold,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 11,
  },
  searchInput: {
    flex: 1,
    marginLeft: Spacing.sm,
    fontSize: Typography.fontSizes.md,
  },
  listContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: 96,
    flexGrow: 1,
  },
  loadingState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: Typography.fontSizes.sm,
  },
  groupCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.lg,
    ...Shadows.sm,
  },
  avatarText: {
    color: Colors.white,
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.bold,
  },
  groupContent: { flex: 1 },
  groupTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
    gap: Spacing.sm,
  },
  groupName: {
    flex: 1,
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.semibold,
  },
  groupTime: {
    fontSize: Typography.fontSizes.xs,
  },
  groupDescription: {
    fontSize: Typography.fontSizes.sm,
    marginBottom: 8,
    lineHeight: 19,
  },
  groupBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  memberCount: {
    fontSize: Typography.fontSizes.sm,
  },
  lastMessage: {
    fontSize: Typography.fontSizes.sm,
    lineHeight: 19,
  },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: Colors.white,
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.bold,
  },
  separator: { height: 1, marginLeft: 68 },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 88,
    gap: 8,
  },
  emptyTitle: {
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.semibold,
  },
  emptyText: {
    fontSize: Typography.fontSizes.sm,
  },
});
