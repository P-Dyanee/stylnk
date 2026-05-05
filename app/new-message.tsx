import {
  BorderRadius,
  Colors,
  Shadows,
  Spacing,
  Typography,
} from "@/constants/theme";
import {
  authStorage,
  composeApi,
  type AuthUser,
  type DirectoryUser,
  userApi,
} from "@/src/services/api";
import { useAppTheme } from "@/src/theme/app-theme";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React from "react";
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

export default function NewMessageScreen() {
  const router = useRouter();
  const { palette } = useAppTheme();
  const [search, setSearch] = React.useState("");
  const [users, setUsers] = React.useState<DirectoryUser[]>([]);
  const [currentUser, setCurrentUser] = React.useState<AuthUser | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [creatingFor, setCreatingFor] = React.useState<string | null>(null);

  const loadUsers = React.useCallback(async (showRefresh = false) => {
    if (showRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const sessionUser = await authStorage.getCurrentUser();
      setCurrentUser(sessionUser);
      const result = await userApi.listUsers();
      setUsers(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Please try again.";

      if (message.toLowerCase().includes("auth token")) {
        await authStorage.clearSession();
        router.replace("/auth/login");
        return;
      }

      Alert.alert("Couldn't load people", message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useFocusEffect(
    React.useCallback(() => {
      loadUsers();
    }, [loadUsers]),
  );

  const trimmedSearch = search.trim().toLowerCase();
  const isSearchingOwnEmail =
    Boolean(trimmedSearch) && trimmedSearch === currentUser?.email.toLowerCase();

  const filteredUsers = users.filter((user) => {
    if (!trimmedSearch || isSearchingOwnEmail) return true;
    return (
      user.fullName.toLowerCase().includes(trimmedSearch) ||
      user.email.toLowerCase().includes(trimmedSearch)
    );
  });

  const emptyTitle =
    users.length === 0
      ? "No other users yet"
      : search
        ? "No matches found"
        : "No people available";

  const emptyText =
    users.length === 0
      ? "Create another account on StyLnk to start a direct message."
      : search
        ? "Try a different name or email."
        : "Pull to refresh if another user just signed up.";

  const sectionTitle =
    search && !isSearchingOwnEmail ? "Search Results" : "All Users";

  const handleStartChat = async (user: DirectoryUser) => {
    setCreatingFor(user.id);
    try {
      const chat = await composeApi.startDirectChat(user.id);
      router.replace({
        pathname: "/chat/[id]",
        params: {
          id: chat.id,
          name: chat.name,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Please try again.";
      Alert.alert("Couldn't start chat", message);
    } finally {
      setCreatingFor(null);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
      <View
        style={[
          styles.searchContainer,
          {
            backgroundColor: palette.card,
            borderColor: palette.border,
          },
        ]}
      >
        <Ionicons name="search-outline" size={18} color={palette.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: palette.text }]}
          placeholder="Search by name or email"
          placeholderTextColor={palette.textMuted}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
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
            Loading people...
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item.id}
          refreshing={refreshing}
          onRefresh={() => loadUsers(true)}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            users.length > 0 ? (
              <View style={styles.headerBlock}>
                {isSearchingOwnEmail && (
                  <View style={styles.helperBanner}>
                    <Ionicons
                      name="information-circle-outline"
                      size={16}
                      color={Colors.primary}
                    />
                    <Text style={styles.helperText}>
                      That&apos;s your account. You can message the other users below.
                    </Text>
                  </View>
                )}
                <Text style={[styles.sectionTitle, { color: palette.textSecondary }]}>
                  {sectionTitle}
                </Text>
              </View>
            ) : null
          }
          ItemSeparatorComponent={() => (
            <View style={[styles.separator, { backgroundColor: palette.divider }]} />
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons
                name="person-add-outline"
                size={44}
                color={palette.textMuted}
              />
              <Text style={[styles.emptyTitle, { color: palette.text }]}>
                {emptyTitle}
              </Text>
              <Text style={[styles.emptyText, { color: palette.textSecondary }]}>
                {emptyText}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const initials = item.fullName
              .split(" ")
              .map((part) => part[0])
              .filter(Boolean)
              .slice(0, 2)
              .join("")
              .toUpperCase();

            const isCreating = creatingFor === item.id;

            return (
              <TouchableOpacity
                style={styles.userRow}
                activeOpacity={0.8}
                disabled={isCreating}
                onPress={() => handleStartChat(item)}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initials}</Text>
                </View>
                <View style={styles.userContent}>
                  <Text style={[styles.userName, { color: palette.text }]}>
                    {item.fullName}
                  </Text>
                  <Text style={[styles.userEmail, { color: palette.textSecondary }]}>
                    {item.email}
                  </Text>
                </View>
                {isCreating ? (
                  <ActivityIndicator color={Colors.primary} />
                ) : (
                  <Ionicons
                    name="chatbubble-ellipses-outline"
                    size={20}
                    color={Colors.primary}
                  />
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.lg,
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
    paddingBottom: 32,
    flexGrow: 1,
  },
  headerBlock: {
    paddingBottom: Spacing.xs,
  },
  helperBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.primarySurface,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    marginBottom: Spacing.sm,
  },
  helperText: {
    flex: 1,
    fontSize: Typography.fontSizes.sm,
    color: Colors.primaryDark,
  },
  sectionTitle: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.semibold,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingBottom: Spacing.sm,
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
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
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
  userContent: {
    flex: 1,
  },
  userName: {
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.semibold,
    marginBottom: 2,
  },
  userEmail: {
    fontSize: Typography.fontSizes.sm,
  },
  separator: {
    height: 1,
    marginLeft: 66,
  },
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
    textAlign: "center",
    maxWidth: 260,
  },
});
