import { useAppTheme } from "@/src/theme/app-theme";
import { userApi, type DirectoryUser } from "@/src/services/api";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TextInput,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { Colors, BorderRadius, Spacing, Typography } from "@/constants/theme";

export default function NewCallScreen() {
  const router = useRouter();
  const { palette } = useAppTheme();
  const [users, setUsers] = useState<DirectoryUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<DirectoryUser[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [callType, setCallType] = useState<"audio" | "video">("audio");

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    const filtered = users.filter(
      (user) =>
        user.fullName.toLowerCase().includes(search.toLowerCase()) ||
        user.email.toLowerCase().includes(search.toLowerCase())
    );
    setFilteredUsers(filtered);
  }, [search, users]);

  const loadUsers = async () => {
    try {
      const usersList = await userApi.listUsers();
      setUsers(usersList);
      setFilteredUsers(usersList);
    } catch (error) {
      console.error("Failed to load users:", error);
    } finally {
      setLoading(false);
    }
  };

  const startCall = (user: DirectoryUser, type: "audio" | "video") => {
    router.push({
      pathname: "/call/[id]",
      params: {
        id: user.id,
        name: user.fullName,
        type,
      },
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  const renderUser = ({ item }: { item: DirectoryUser }) => (
    <TouchableOpacity
      style={[styles.userRow, { borderBottomColor: palette.border }]}
      onPress={() => startCall(item, callType)}
    >
      <View style={[styles.avatar, { backgroundColor: Colors.primary }]}>
        <Text style={styles.avatarText}>{getInitials(item.fullName)}</Text>
      </View>
      <View style={styles.userInfo}>
        <Text style={[styles.userName, { color: palette.text }]}>
          {item.fullName}
        </Text>
        <Text style={[styles.userEmail, { color: palette.textSecondary }]}>
          {item.email}
        </Text>
      </View>
      <View style={styles.callButtons}>
        <TouchableOpacity
          style={[styles.callButton, styles.audioButton]}
          onPress={() => startCall(item, "audio")}
        >
          <Ionicons name="call" size={20} color={Colors.white} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.callButton, styles.videoButton]}
          onPress={() => startCall(item, "video")}
        >
          <Ionicons name="videocam" size={20} color={Colors.white} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
      <StatusBar
        barStyle={palette.statusBar === "dark" ? "light-content" : "dark-content"}
        backgroundColor={palette.background}
      />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: palette.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={palette.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: palette.text }]}>New Call</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Call Type Selector */}
      <View style={[styles.callTypeSelector, { backgroundColor: palette.card }]}>
        <TouchableOpacity
          style={[
            styles.callTypeOption,
            callType === "audio" && styles.callTypeOptionActive,
            { backgroundColor: callType === "audio" ? Colors.primary : "transparent" }
          ]}
          onPress={() => setCallType("audio")}
        >
          <Ionicons
            name="call"
            size={20}
            color={callType === "audio" ? Colors.white : palette.text}
          />
          <Text
            style={[
              styles.callTypeText,
              { color: callType === "audio" ? Colors.white : palette.text }
            ]}
          >
            Audio
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.callTypeOption,
            callType === "video" && styles.callTypeOptionActive,
            { backgroundColor: callType === "video" ? Colors.primary : "transparent" }
          ]}
          onPress={() => setCallType("video")}
        >
          <Ionicons
            name="videocam"
            size={20}
            color={callType === "video" ? Colors.white : palette.text}
          />
          <Text
            style={[
              styles.callTypeText,
              { color: callType === "video" ? Colors.white : palette.text }
            ]}
          >
            Video
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View
        style={[
          styles.searchContainer,
          { backgroundColor: palette.card, borderColor: palette.border }
        ]}
      >
        <Ionicons
          name="search-outline"
          size={18}
          color={palette.textSecondary}
        />
        <TextInput
          style={[styles.searchInput, { color: palette.text }]}
          placeholder="Search users..."
          placeholderTextColor={palette.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={18} color={palette.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Users List */}
      {loading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color={Colors.primary} />
          <Text style={[styles.loadingText, { color: palette.textSecondary }]}>
            Loading users...
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item.id}
          renderItem={renderUser}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons
                name="people-outline"
                size={48}
                color={palette.textSecondary}
              />
              <Text style={[styles.emptyText, { color: palette.textSecondary }]}>
                {search ? "No users found" : "No users available"}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.semibold,
  },
  placeholder: {
    width: 40,
  },
  callTypeSelector: {
    flexDirection: "row",
    margin: Spacing.lg,
    borderRadius: BorderRadius.md,
    padding: 4,
  },
  callTypeOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  callTypeOptionActive: {},
  callTypeText: {
    marginLeft: Spacing.xs,
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.medium,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    margin: Spacing.lg,
    marginTop: 0,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: Spacing.sm,
    fontSize: Typography.fontSizes.md,
  },
  loadingState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: Typography.fontSizes.md,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.xxxl * 2,
    gap: Spacing.md,
  },
  emptyText: {
    fontSize: Typography.fontSizes.md,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 0.5,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  avatarText: {
    color: Colors.white,
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.bold,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.medium,
  },
  userEmail: {
    fontSize: Typography.fontSizes.sm,
    marginTop: 2,
  },
  callButtons: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  callButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  audioButton: {
    backgroundColor: Colors.success,
  },
  videoButton: {
    backgroundColor: Colors.primary,
  },
});
