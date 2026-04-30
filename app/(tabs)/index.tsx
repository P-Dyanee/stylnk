import { useAppTheme } from "@/src/theme/app-theme";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import ConversationItem from "../../components/ConversationItem";
import { Colors } from "../../constants/theme";
import {
  authStorage,
  chatApi,
  composeApi,
  userApi,
  type ChatListItem,
  type DirectoryUser,
} from "../../src/services/api";

type ConversationListItem = {
  id: string;
  name: string;
  lastMessage: string;
  time: string;
  unread: number;
  online: boolean;
  avatar: string;
};

const toConversationItem = (chat: ChatListItem): ConversationListItem => ({
  id: chat.id,
  name: chat.name,
  lastMessage: chat.lastMessage,
  time: chat.time,
  unread: chat.unreadCount,
  online: chat.isOnline,
  avatar: chat.name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase(),
});

export default function ChatsScreen() {
  const router = useRouter();
  const { palette, mode } = useAppTheme();
  const [search, setSearch] = useState("");
  const [conversations, setConversations] = useState<ConversationListItem[]>(
    [],
  );
  const [people, setPeople] = useState<DirectoryUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [startingChat, setStartingChat] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "all" | "chats" | "unread" | "people"
  >("all");

  const loadData = React.useCallback(
    async (showRefresh = false) => {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        const [chats, users] = await Promise.all([
          chatApi.listChats(),
          userApi.listUsers(),
        ]);
        setConversations(chats.map(toConversationItem));
        setPeople(users);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Please try again.";
        if (message.toLowerCase().includes("auth token")) {
          await authStorage.clearSession();
          router.replace("/auth/login");
          return;
        }
        Alert.alert("Couldn't load data", message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [router],
  );

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const handleStartChat = async (userId: string) => {
    setStartingChat(userId);
    try {
      const chat = await composeApi.startDirectChat(userId);
      router.push(`/chat/${chat.id}`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Please try again.";
      Alert.alert("Couldn't start chat", message);
    } finally {
      setStartingChat(null);
    }
  };

  const getFilteredConversations = () => {
    switch (activeTab) {
      case "chats":
        return conversations;
      case "unread":
        return conversations.filter((c) => c.unread > 0);
      case "all":
      default:
        return conversations;
    }
  };

  const filteredConversations = getFilteredConversations().filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()),
  );

  const filteredPeople = people.filter(
    (p) =>
      p.fullName.toLowerCase().includes(search.toLowerCase()) ||
      p.email.toLowerCase().includes(search.toLowerCase()),
  );

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((p) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
    >
      <StatusBar
        barStyle={mode === "dark" ? "light-content" : "dark-content"}
        backgroundColor={palette.background}
      />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: palette.border }]}>
        <Text style={[styles.chatsText, { color: palette.text }]}>Chats</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.headerIcon}
            onPress={() => router.push("/new-message")}
          >
            <Ionicons
              name="add-circle-outline"
              size={24}
              color={palette.text}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Category Tabs */}
      <View
        style={[
          styles.tabsContainer,
          { borderBottomColor: palette.border, backgroundColor: palette.card },
        ]}
      >
        {(["all", "chats", "unread", "people"] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              style={[
                styles.tabText,
                {
                  color:
                    activeTab === tab ? Colors.primary : palette.textSecondary,
                },
                activeTab === tab && styles.activeTabText,
              ]}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
            {activeTab === tab && (
              <View
                style={[
                  styles.activeTabIndicator,
                  { backgroundColor: Colors.primary },
                ]}
              />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Search Bar */}
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
          placeholder={
            activeTab === "people"
              ? "Search people..."
              : "Search conversations..."
          }
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

      {/* Content */}
      {loading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color={Colors.primary} />
          <Text style={[styles.loadingText, { color: palette.textSecondary }]}>
            Loading...
          </Text>
        </View>
      ) : activeTab === "people" ? (
        // People Tab
        <FlatList
          data={filteredPeople}
          keyExtractor={(item) => item.id}
          refreshing={refreshing}
          onRefresh={() => loadData(true)}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View
              style={[styles.personRow, { borderBottomColor: palette.border }]}
            >
              <View
                style={[
                  styles.personAvatar,
                  { backgroundColor: Colors.primary },
                ]}
              >
                <Text style={styles.personAvatarText}>
                  {getInitials(item.fullName)}
                </Text>
              </View>
              <View style={styles.personInfo}>
                <Text style={[styles.personName, { color: palette.text }]}>
                  {item.fullName}
                </Text>
                <Text
                  style={[styles.personEmail, { color: palette.textSecondary }]}
                >
                  {item.email}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.messageBtn, { backgroundColor: Colors.primary }]}
                onPress={() => handleStartChat(item.id)}
                disabled={startingChat === item.id}
              >
                {startingChat === item.id ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="chatbubble-outline" size={16} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons
                name="people-outline"
                size={48}
                color={palette.textSecondary}
              />
              <Text
                style={[styles.emptyText, { color: palette.textSecondary }]}
              >
                {search ? "No matching users found" : "No other users yet"}
              </Text>
            </View>
          }
        />
      ) : (
        // Conversations Tabs
        <FlatList
          data={filteredConversations}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ConversationItem {...item} searchQuery={search} />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons
                name="chatbubbles-outline"
                size={48}
                color={palette.textSecondary}
              />
              <Text
                style={[styles.emptyText, { color: palette.textSecondary }]}
              >
                {search
                  ? "No matching conversations found"
                  : activeTab === "unread"
                    ? "No unread messages"
                    : "No conversations yet"}
              </Text>
              {!search && activeTab === "all" && (
                <TouchableOpacity
                  style={[
                    styles.startChatBtn,
                    { backgroundColor: Colors.primary },
                  ]}
                  onPress={() => setActiveTab("people")}
                >
                  <Text style={styles.startChatBtnText}>
                    Find People to Chat
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          }
          refreshing={refreshing}
          onRefresh={() => loadData(true)}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  chatsText: { fontSize: 24, fontWeight: "bold" },
  headerRight: { flexDirection: "row", gap: 12 },
  headerIcon: { padding: 4 },
  tabsContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    position: "relative",
  },
  activeTab: {},
  activeTabIndicator: {
    position: "absolute",
    bottom: 0,
    left: 12,
    right: 12,
    height: 2,
    borderRadius: 1,
  },
  tabText: { fontSize: 14, fontWeight: "500" },
  activeTabText: { fontWeight: "700" },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    margin: 12,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 15 },
  empty: {
    alignItems: "center",
    marginTop: 92,
    gap: 12,
    paddingHorizontal: 24,
  },
  loadingState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: { fontSize: 14 },
  emptyText: { fontSize: 16 },
  startChatBtn: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  startChatBtnText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  // People tab styles
  personRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  personAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  personAvatarText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  personInfo: { flex: 1 },
  personName: { fontSize: 15, fontWeight: "600" },
  personEmail: { fontSize: 13, marginTop: 2 },
  messageBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
});
