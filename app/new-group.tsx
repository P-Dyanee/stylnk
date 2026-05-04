import {
  BorderRadius,
  Colors,
  Spacing,
  Typography,
} from "@/constants/theme";
import { composeApi, type DirectoryUser, userApi } from "@/src/services/api";
import { useAppTheme } from "@/src/theme/app-theme";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
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

export default function NewGroupScreen() {
  const router = useRouter();
  const { palette } = useAppTheme();
  const [title, setTitle] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [users, setUsers] = React.useState<DirectoryUser[]>([]);
  const [selectedIds, setSelectedIds] = React.useState<number[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [creating, setCreating] = React.useState(false);

  React.useEffect(() => {
    const loadUsers = async () => {
      try {
        setUsers(await userApi.listUsers());
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not load users.";
        Alert.alert("Couldn't load users", message);
      } finally {
        setLoading(false);
      }
    };

    void loadUsers();
  }, []);

  const filteredUsers = users.filter((user) => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return true;
    }
    return (
      user.fullName.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query)
    );
  });

  const toggleUser = (userId: number) => {
    setSelectedIds((current) =>
      current.includes(userId)
        ? current.filter((value) => value !== userId)
        : [...current, userId],
    );
  };

  const handleCreateGroup = async () => {
    if (title.trim().length < 2) {
      Alert.alert("Group name required", "Please add a group name first.");
      return;
    }
    if (selectedIds.length < 2) {
      Alert.alert("Choose people", "Pick at least two people for the group.");
      return;
    }

    setCreating(true);
    try {
      const conversation = await composeApi.createGroup(title.trim(), selectedIds);
      router.replace({
        pathname: "/chat/[id]",
        params: {
          id: String(conversation.id),
          name: conversation.name,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Please try again.";
      Alert.alert("Couldn't create group", message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
      <View style={styles.content}>
        <View style={styles.inputBlock}>
          <Text style={[styles.label, { color: palette.text }]}>Group Name</Text>
          <TextInput
            style={[
              styles.groupNameInput,
              {
                backgroundColor: palette.card,
                borderColor: palette.border,
                color: palette.text,
              },
            ]}
            placeholder="Weekend Plans, Product Team, Design Circle..."
            placeholderTextColor={palette.textMuted}
            value={title}
            onChangeText={setTitle}
          />
        </View>

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
            placeholder="Search people"
            placeholderTextColor={palette.textMuted}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        <View style={styles.selectionRow}>
          <Text style={[styles.selectionTitle, { color: palette.textSecondary }]}>
            Selected: {selectedIds.length}
          </Text>
          <TouchableOpacity
            style={styles.createBtn}
            onPress={() => void handleCreateGroup()}
            disabled={creating}
          >
            {creating ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.createBtnText}>Create</Text>
            )}
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator color={Colors.primary} />
          </View>
        ) : (
          <FlatList
            data={filteredUsers}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => {
              const selected = selectedIds.includes(item.id);
              return (
                <TouchableOpacity
                  style={[
                    styles.userRow,
                    {
                      backgroundColor: palette.card,
                      borderColor: selected ? Colors.primary : palette.border,
                    },
                  ]}
                  onPress={() => toggleUser(item.id)}
                  activeOpacity={0.85}
                >
                  <View style={styles.userCopy}>
                    <Text style={[styles.userName, { color: palette.text }]}>
                      {item.fullName}
                    </Text>
                    <Text style={[styles.userEmail, { color: palette.textSecondary }]}>
                      {item.email}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.checkWrap,
                      { backgroundColor: selected ? Colors.primary : palette.elevated },
                    ]}
                  >
                    <Ionicons
                      name={selected ? "checkmark" : item.isOnline ? "radio" : "ellipse-outline"}
                      size={16}
                      color={selected ? Colors.white : Colors.primary}
                    />
                  </View>
                </TouchableOpacity>
              );
            }}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            contentContainerStyle={{ paddingBottom: 32 }}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flex: 1,
    padding: Spacing.xl,
  },
  inputBlock: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.semibold,
    marginBottom: 8,
  },
  groupNameInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    fontSize: Typography.fontSizes.md,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 11,
    marginBottom: Spacing.lg,
  },
  searchInput: {
    flex: 1,
    marginLeft: Spacing.sm,
    fontSize: Typography.fontSizes.md,
  },
  selectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  selectionTitle: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.medium,
  },
  createBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    minWidth: 100,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: Spacing.lg,
  },
  createBtnText: {
    color: Colors.white,
    fontWeight: Typography.fontWeights.semibold,
    fontSize: Typography.fontSizes.md,
  },
  loadingState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  userRow: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  userCopy: {
    flex: 1,
    marginRight: Spacing.md,
  },
  userName: {
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.semibold,
  },
  userEmail: {
    marginTop: 4,
    fontSize: Typography.fontSizes.sm,
  },
  checkWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
});
