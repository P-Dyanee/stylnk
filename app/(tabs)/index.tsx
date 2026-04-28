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
    type ChatListItem
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

function renderHighlightedText(
  value: string,
  query: string,
  textStyle: object,
  highlightStyle: object,
) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return <Text style={textStyle}>{value}</Text>;
  }

  const matchIndex = value.toLowerCase().indexOf(normalizedQuery);
  if (matchIndex === -1) {
    return <Text style={textStyle}>{value}</Text>;
  }

  const before = value.slice(0, matchIndex);
  const match = value.slice(matchIndex, matchIndex + normalizedQuery.length);
  const after = value.slice(matchIndex + normalizedQuery.length);

  return (
    <Text style={textStyle}>
      {before}
      <Text style={highlightStyle}>{match}</Text>
      {after}
    </Text>
  );
}

export default function ChatsScreen() {
  const router = useRouter();
  const { palette, mode } = useAppTheme();
  const [search, setSearch] = useState("");
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creatingChatFor, setCreatingChatFor] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "chats" | "groups" | "unread">("all");

  const loadChats = React.useCallback(async (showRefresh = false) => {
    if (showRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const chats = await chatApi.listChats();
      setConversations(chats.map(toConversationItem));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Please try again.";

      if (message.toLowerCase().includes("auth token")) {
        await authStorage.clearSession();
        router.replace("/auth/login");
        return;
      }

      Alert.alert("Couldn't load chats", message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useFocusEffect(
    React.useCallback(() => {
      loadChats();
    }, [loadChats]),
  );

  // Filter conversations based on active tab
  const getFilteredConversations = () => {
    switch (activeTab) {
      case "chats":
        return conversations.filter(c => !c.name.includes("Group")); // Simple group detection
      case "groups":
        return conversations.filter(c => c.name.includes("Group")); // Simple group detection
      case "unread":
        return conversations.filter(c => c.unread > 0);
      case "all":
      default:
        return conversations;
    }
  };

  const filteredConversations = getFilteredConversations().filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
      <StatusBar barStyle={mode === "dark" ? "light-content" : "dark-content"} backgroundColor={palette.background} />
      
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: palette.border }]}>
        <View style={styles.headerLeft}>
          <Text style={[styles.chatsText, { color: palette.text }]}>Chats</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerIcon}>
            <Ionicons name="search-outline" size={22} color={palette.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIcon} onPress={() => router.push("/new-message")}>
            <Ionicons name="add-circle-outline" size={24} color={palette.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Category Tabs */}
      <View style={[styles.tabsContainer, { borderBottomColor: palette.border }]}>
        {(["all", "chats", "groups", "unread"] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={styles.tab}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              style={[
                styles.tabText,
                { color: activeTab === tab ? Colors.primary : palette.textSecondary },
                activeTab === tab && styles.activeTabText,
              ]}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Search Bar */}
      <View
        style={[
          styles.searchContainer,
          {
            backgroundColor: palette.card,
            borderColor: palette.border,
          },
        ]}
      >
        <Ionicons
          name="search-outline"
          size={18}
          color={palette.textSecondary}
        />
        <TextInput
          style={[styles.searchInput, { color: palette.text }]}
          placeholder="Search conversations..."
          placeholderTextColor={palette.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Ionicons
              name="close-circle"
              size={18}
              color={palette.textMuted}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Conversations List */}
      {loading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color={Colors.primary} />
          <Text style={[styles.loadingText, { color: palette.textSecondary }]}>
            Loading conversations...
          </Text>
        </View>
      ) : (
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
              <Text style={[styles.emptyText, { color: palette.textSecondary }]}>
                {search
                  ? "No matching conversations found"
                  : activeTab === "unread"
                  ? "No unread messages"
                  : activeTab === "chats"
                  ? "No chats yet"
                  : activeTab === "groups"
                  ? "No groups yet"
                  : "No conversations yet"}
              </Text>
            </View>
          }
          refreshing={refreshing}
          onRefresh={() => loadChats(true)}
          showsVerticalScrollIndicator={false}
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
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  chatsText: {
    fontSize: 24,
    fontWeight: "bold",
  },
  headerRight: {
    flexDirection: "row",
    gap: 12,
  },
  headerIcon: {
    padding: 4,
  },
  tabsContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
    backgroundColor: "#fff",
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
  tabText: {
    fontSize: 15,
    fontWeight: "500",
  },
  activeTabText: {
    fontWeight: "700",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    margin: 12,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
  },
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
  loadingText: {
    fontSize: 14,
  },
  emptyText: {
    fontSize: 16,
  },
  });
