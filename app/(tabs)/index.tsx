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
import ConversationItem from "../../components/ConversationItem";
import { Colors } from "../../constants/theme";
import {
  authStorage,
  chatApi,
  composeApi,
  type ChatListItem,
  type DirectoryUser,
  userApi,
} from "../../src/services/api";
import { useAppTheme } from "@/src/theme/app-theme";
import { realtimeClient } from "@/src/services/realtime";
import { useSession } from "@/src/providers/session-provider";

type ConversationListItem = {
  id: number;
  name: string;
  lastMessage: string;
  time: string;
  unread: number;
  online: boolean;
  avatar: string;
  status?: ChatListItem["lastMessageStatus"];
  isGroup: boolean;
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
  status: chat.lastMessageStatus,
  isGroup: chat.isGroup,
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
  const { palette } = useAppTheme();
  const { socketConnected } = useSession();
  const [search, setSearch] = React.useState("");
  const [conversations, setConversations] = React.useState<ConversationListItem[]>([]);
  const [people, setPeople] = React.useState<DirectoryUser[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [creatingChatFor, setCreatingChatFor] = React.useState<number | null>(null);

  const loadChats = React.useCallback(
    async (showRefresh = false) => {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const [chats, users] = await Promise.all([
          chatApi.listChats(),
          userApi.listUsers(),
        ]);
        setConversations(chats.map(toConversationItem));
        setPeople(users);
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
    },
    [router],
  );

  useFocusEffect(
    React.useCallback(() => {
      void loadChats();
    }, [loadChats]),
  );

  React.useEffect(() => {
    const unsubscribeRefresh = realtimeClient.on("conversation:refresh", () => {
      void loadChats(true);
    });
    const unsubscribePresence = realtimeClient.on("presence:update", () => {
      void loadChats(true);
    });

    return () => {
      unsubscribeRefresh();
      unsubscribePresence();
    };
  }, [loadChats]);

  const filtered = conversations.filter((conversation) =>
    conversation.name.toLowerCase().includes(search.toLowerCase()),
  );

  const lowerSearch = search.toLowerCase();
  const existingConversationNames = new Set(
    conversations.map((conversation) => conversation.name.toLowerCase()),
  );

  const matchingPeople = people.filter((person) => {
    if (!lowerSearch) {
      return false;
    }

    const matchesSearch =
      person.fullName.toLowerCase().includes(lowerSearch) ||
      person.email.toLowerCase().includes(lowerSearch);

    return matchesSearch && !existingConversationNames.has(person.fullName.toLowerCase());
  });

  const handleStartDirectChat = async (person: DirectoryUser) => {
    setCreatingChatFor(person.id);
    try {
      const chat = await composeApi.startDirectChat(person.id);
      router.push({
        pathname: "/chat/[id]",
        params: {
          id: String(chat.id),
          name: chat.name,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Please try again.";
      Alert.alert("Couldn't start chat", message);
    } finally {
      setCreatingChatFor(null);
    }
  };

  const visiblePeople = lowerSearch.length > 0 ? matchingPeople : people;
  const showPeopleResults = visiblePeople.length > 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
      <View style={[styles.header, { borderBottomColor: palette.border }]}>
        <View>
          <Text style={[styles.headerTitle, { color: palette.text }]}>Chats</Text>
          <Text style={[styles.headerSubtitle, { color: palette.textSecondary }]}>
            {socketConnected ? "Live" : "Connecting..."}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.headerIcon, { backgroundColor: palette.primarySurface }]}
            onPress={() => router.push("/new-group")}
          >
            <Ionicons name="people-outline" size={20} color={Colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerIcon, { backgroundColor: palette.primarySurface }]}
            onPress={() => router.push("/new-message")}
          >
            <Ionicons name="create-outline" size={24} color={Colors.primary} />
          </TouchableOpacity>
        </View>
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
        <Ionicons
          name="search-outline"
          size={18}
          color={palette.textSecondary}
        />
        <TextInput
          style={[styles.searchInput, { color: palette.text }]}
          placeholder="Search conversations or people"
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

      {loading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color={Colors.primary} />
          <Text style={[styles.loadingText, { color: palette.textSecondary }]}>
            Loading conversations...
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          ListHeaderComponent={
            showPeopleResults ? (
              <View style={styles.peopleSection}>
                <Text style={[styles.sectionTitle, { color: palette.textSecondary }]}>
                  {lowerSearch.length > 0 ? "People" : "All Users"}
                </Text>
                {visiblePeople.map((person) => {
                  const initials = person.fullName
                    .split(" ")
                    .map((part) => part[0])
                    .filter(Boolean)
                    .slice(0, 2)
                    .join("")
                    .toUpperCase();
                  const isCreating = creatingChatFor === person.id;

                  return (
                    <TouchableOpacity
                      key={person.id}
                      style={[
                        styles.personRow,
                        {
                          backgroundColor: palette.background,
                          borderBottomColor: palette.border,
                        },
                      ]}
                      activeOpacity={0.8}
                      disabled={isCreating}
                      onPress={() => void handleStartDirectChat(person)}
                    >
                      <View style={styles.personAvatar}>
                        <Text style={styles.personAvatarText}>{initials}</Text>
                      </View>
                      <View style={styles.personInfo}>
                        {renderHighlightedText(
                          person.fullName,
                          search,
                          [styles.personName, { color: palette.text }],
                          styles.searchHighlight,
                        )}
                        {renderHighlightedText(
                          person.email,
                          search,
                          [styles.personEmail, { color: palette.textSecondary }],
                          styles.searchHighlight,
                        )}
                      </View>
                      {isCreating ? (
                        <ActivityIndicator color={Colors.primary} />
                      ) : (
                        <Ionicons
                          name={person.isOnline ? "radio" : "chatbubble-ellipses-outline"}
                          size={20}
                          color={Colors.primary}
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
                <Text style={[styles.sectionTitle, { color: palette.textSecondary }]}>
                  Conversations
                </Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <ConversationItem
              {...item}
              id={String(item.id)}
              searchQuery={search}
              status={item.status}
              isGroup={item.isGroup}
            />
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
                  ? "No matching people or conversations found"
                  : "No chats yet"}
              </Text>
            </View>
          }
          refreshing={refreshing}
          onRefresh={() => void loadChats(true)}
          showsVerticalScrollIndicator={false}
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push("/new-message")}
      >
        <Ionicons name="chatbubble-ellipses-outline" size={26} color="#fff" />
      </TouchableOpacity>
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  headerActions: {
    flexDirection: "row",
    gap: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  headerIcon: {
    padding: 8,
    borderRadius: 20,
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
  peopleSection: {
    paddingTop: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingBottom: 8,
    paddingTop: 8,
  },
  personRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  personAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  personAvatarText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  personInfo: {
    flex: 1,
  },
  personName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  personEmail: {
    fontSize: 13,
  },
  searchHighlight: {
    color: Colors.primary,
    fontWeight: "700",
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
});
