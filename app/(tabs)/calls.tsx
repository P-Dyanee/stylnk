import { CallLocalPip, CallRemoteVideo } from "@/components/call-media-views";
import { Colors } from "@/constants/theme";
import { authStorage, chatApi, type AuthUser, type ConversationParticipant, type ConversationSummary } from "@/src/services/api";
import { useCallWebRTC } from "@/src/hooks/useCallWebRTC";
import { useSession } from "@/src/providers/session-provider";
import { useAppTheme } from "@/src/theme/app-theme";
import { realtimeClient } from "@/src/services/realtime";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Image } from "expo-image";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  SectionList,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type CallsTab = "contacts" | "recents";

function firstLetter(name: string) {
  const c = name.trim()[0]?.toUpperCase() ?? "#";
  return /[A-Z]/.test(c) ? c : "#";
}

function shortDisplayName(fullName: string) {
  const first = fullName.trim().split(/\s+/)[0] ?? "";
  if (first.length <= 12) {
    return first || "?";
  }
  return `${first.slice(0, 11)}…`;
}

function initialsFromName(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function peerFromConversation(
  conversation: ConversationSummary,
  currentUserId: number | null,
): ConversationParticipant | undefined {
  const parts = conversation.participants;
  if (!parts?.length) {
    return undefined;
  }
  if (currentUserId == null) {
    return parts[0];
  }
  const others = parts.filter((p) => p.id !== currentUserId);
  const byTitle = others.find(
    (p) => (p.fullName ?? p.name) === conversation.title || p.name === conversation.title,
  );
  return byTitle ?? others[0];
}

function groupContactsForSections(items: ConversationSummary[]) {
  const sorted = [...items].sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" }));
  const map = new Map<string, ConversationSummary[]>();
  for (const item of sorted) {
    const key = firstLetter(item.title);
    const list = map.get(key) ?? [];
    list.push(item);
    map.set(key, list);
  }
  const keys = [...map.keys()].sort((a, b) => {
    if (a === "#") return 1;
    if (b === "#") return -1;
    return a.localeCompare(b);
  });
  return keys.map((title) => ({ title, data: map.get(title)! }));
}

function PatternBackdrop({ iconTint }: { iconTint: string }) {
  const icons: (keyof typeof Ionicons.glyphMap)[] = [
    "heart-outline",
    "chatbubble-outline",
    "happy-outline",
    "add",
    "sparkles-outline",
  ];
  return (
    <View style={patternStyles.root} pointerEvents="none">
      {Array.from({ length: 40 }).map((_, i) => {
        const icon = icons[i % icons.length];
        const row = Math.floor(i / 8);
        const col = i % 8;
        return (
          <View
            key={i}
            style={[
              patternStyles.cell,
              { top: row * 72 + (col % 2) * 12, left: col * 48 + (row % 2) * 18 },
            ]}
          >
            <Ionicons name={icon} size={18} color={iconTint} />
          </View>
        );
      })}
    </View>
  );
}

const patternStyles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, overflow: "hidden" },
  cell: { position: "absolute" },
});

function createCallsStyles(palette: ReturnType<typeof useAppTheme>["palette"], mode: "light" | "dark") {
  const patternIcon = mode === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)";
  const dockGlass =
    mode === "dark" ? "rgba(28,28,30,0.95)" : "rgba(255,255,255,0.92)";
  const dockBorder =
    mode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";

  return {
    patternIcon,
    styles: StyleSheet.create({
      safe: { flex: 1, backgroundColor: palette.background },
      loadingState: { flex: 1, justifyContent: "center", alignItems: "center" },

      header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 12,
      },
      headerTitle: { color: palette.text, fontSize: 34, fontWeight: "700" },
      headerAdd: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: palette.primarySurface,
        alignItems: "center",
        justifyContent: "center",
      },

      searchWrap: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: palette.card,
        marginHorizontal: 16,
        borderRadius: 14,
        paddingHorizontal: 12,
        height: 44,
        borderWidth: 1,
        borderColor: palette.border,
      },
      searchIcon: { marginRight: 8 },
      searchInput: { flex: 1, color: palette.text, fontSize: 16 },

      tabs: {
        flexDirection: "row",
        marginTop: 18,
        paddingHorizontal: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: palette.border,
      },
      tabHit: { flex: 1, alignItems: "center", paddingBottom: 10 },
      tabLabel: { color: palette.textSecondary, fontSize: 13, fontWeight: "700", letterSpacing: 0.6 },
      tabLabelActive: { color: Colors.primary },
      tabUnderline: {
        marginTop: 10,
        height: 3,
        width: "100%",
        backgroundColor: Colors.primary,
        borderRadius: 2,
      },
      tabUnderlineGhost: { marginTop: 10, height: 3, width: "100%" },

      quickStrip: {
        marginTop: 10,
        marginBottom: 4,
        maxHeight: 112,
      },
      quickStripContent: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        gap: 14,
        alignItems: "flex-start",
      },
      quickStripItem: {
        width: 76,
        alignItems: "center",
      },
      quickAvatarShadow: {
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: mode === "dark" ? 0.55 : 0.35,
        shadowRadius: 8,
        elevation: 6,
      },
      quickAvatarRing: {
        width: 68,
        height: 68,
        borderRadius: 34,
        borderWidth: 2,
        borderColor: Colors.primary,
        padding: 2,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: palette.background,
      },
      quickAvatarMeRing: {
        width: 68,
        height: 68,
        borderRadius: 34,
        borderWidth: 2,
        borderStyle: "dashed",
        borderColor: palette.textMuted,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: palette.card,
      },
      quickAvatarImage: {
        width: 60,
        height: 60,
        borderRadius: 30,
        overflow: "hidden",
        backgroundColor: palette.elevated,
        alignItems: "center",
        justifyContent: "center",
      },
      quickAvatarInitials: {
        color: palette.text,
        fontWeight: "700",
        fontSize: 20,
      },
      quickStripLabel: {
        marginTop: 6,
        color: palette.text,
        fontSize: 12,
        fontWeight: "600",
        textAlign: "center",
        maxWidth: 76,
      },

      listSectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingTop: 22,
        paddingBottom: 10,
      },
      listSectionTitle: { color: palette.text, fontSize: 17, fontWeight: "700" },
      listFilters: { flexDirection: "row", gap: 16 },
      filterActive: { color: Colors.primary, fontSize: 15, fontWeight: "600" },
      filterMuted: { color: palette.textSecondary, fontSize: 15, fontWeight: "600" },

      sectionHeader: {
        backgroundColor: palette.background,
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 6,
      },
      sectionHeaderText: { color: palette.textSecondary, fontSize: 13, fontWeight: "700" },

      row: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: palette.background,
      },
      rowLetter: {
        width: 22,
        color: palette.textSecondary,
        fontSize: 15,
        fontWeight: "600",
        textAlign: "center",
      },
      rowBody: { flex: 1, marginLeft: 12, minWidth: 0 },
      rowName: { color: palette.text, fontSize: 17, fontWeight: "600" },
      rowSub: { color: Colors.primary, fontSize: 13, marginTop: 3 },
      rowSubMuted: { color: palette.textSecondary, fontSize: 13, marginTop: 3 },
      rowActions: { flexDirection: "row", gap: 10, marginLeft: 8 },

      btnVideo: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: Colors.primary,
        alignItems: "center",
        justifyContent: "center",
      },
      btnVoice: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: palette.elevated,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: palette.border,
      },

      avatarCircle: {
        backgroundColor: palette.elevated,
        alignItems: "center",
        justifyContent: "center",
        marginLeft: 4,
      },
      avatarText: { color: palette.text, fontWeight: "700" },

      listPad: { paddingBottom: 120 },

      empty: { alignItems: "center", paddingTop: 48, paddingHorizontal: 32 },
      emptyTitle: { color: palette.text, fontSize: 18, fontWeight: "700", marginTop: 14 },
      emptySub: { color: palette.textSecondary, fontSize: 14, marginTop: 8, textAlign: "center", lineHeight: 20 },

      fab: {
        position: "absolute",
        right: 20,
        bottom: 100,
        width: 58,
        height: 58,
        borderRadius: 29,
        backgroundColor: Colors.primary,
        alignItems: "center",
        justifyContent: "center",
        elevation: 8,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
      },

      incomingBar: {
        flexDirection: "row",
        alignItems: "center",
        marginHorizontal: 16,
        marginBottom: 8,
        padding: 14,
        borderRadius: 16,
        backgroundColor: palette.card,
        borderWidth: 1,
        borderColor: palette.border,
        gap: 10,
      },
      incomingTitle: { color: palette.text, fontSize: 16, fontWeight: "700" },
      incomingSub: { color: palette.textSecondary, fontSize: 13, marginTop: 2 },
      declineBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: Colors.danger,
        alignItems: "center",
        justifyContent: "center",
      },
      acceptBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: Colors.success,
        alignItems: "center",
        justifyContent: "center",
      },

      minimizedBar: {
        flexDirection: "row",
        alignItems: "center",
        marginHorizontal: 16,
        marginBottom: 8,
        padding: 14,
        borderRadius: 16,
        backgroundColor: palette.card,
        borderWidth: 1,
        borderColor: palette.border,
      },
      minimizedTitle: { color: palette.text, fontSize: 16, fontWeight: "700" },
      minimizedSub: { color: palette.textSecondary, fontSize: 13, marginTop: 2 },
      expandTap: { padding: 8, marginRight: 4 },
      hangupSmall: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: Colors.danger,
        alignItems: "center",
        justifyContent: "center",
      },

      modalRoot: {
        flex: 1,
        backgroundColor: palette.background,
      },
      modalSafe: { flex: 1 },

      callTopBar: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingTop: 8,
      },
      callBody: { flex: 1, position: "relative" },
      callStage: {
        flex: 1,
        position: "relative",
        backgroundColor: palette.elevated,
      },
      callRemoteVideo: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: palette.elevated,
      },
      callAvatarCenter: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: "center",
        alignItems: "center",
      },
      callLocalPip: {
        position: "absolute",
        width: 112,
        height: 158,
        right: 14,
        bottom: 14,
        borderRadius: 14,
        overflow: "hidden",
        backgroundColor: "#111",
        borderWidth: 2,
        borderColor: palette.border,
      },
      callHeroOverlay: {
        position: "absolute",
        top: 4,
        left: 0,
        right: 0,
        zIndex: 2,
        alignItems: "center",
        paddingHorizontal: 20,
      },
      encryptedRow: { flexDirection: "row", alignItems: "center", gap: 6 },
      encryptedText: { color: palette.textSecondary, fontSize: 12 },
      callNameLarge: {
        color: palette.text,
        fontSize: 26,
        fontWeight: "700",
        marginTop: 14,
        textAlign: "center",
        paddingHorizontal: 24,
      },
      callStatus: { color: palette.textSecondary, fontSize: 15, marginTop: 6 },
      webRtcHint: {
        textAlign: "center",
        color: palette.textSecondary,
        fontSize: 13,
        lineHeight: 18,
        paddingHorizontal: 28,
        paddingBottom: 6,
      },

      callAvatarWrap: { flex: 1, justifyContent: "center", alignItems: "center" },
      callAvatarRing: {
        width: 200,
        height: 200,
        borderRadius: 100,
        borderWidth: 2,
        borderColor: palette.border,
        alignItems: "center",
        justifyContent: "center",
      },
      callAvatarInner: {
        width: 176,
        height: 176,
        borderRadius: 88,
        backgroundColor: palette.elevated,
        alignItems: "center",
        justifyContent: "center",
      },

      callDock: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-evenly",
        marginHorizontal: 16,
        marginBottom: 28,
        paddingVertical: 18,
        paddingHorizontal: 8,
        borderRadius: 28,
        backgroundColor: dockGlass,
        borderWidth: 1,
        borderColor: dockBorder,
      },
      dockBtn: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: palette.elevated,
        alignItems: "center",
        justifyContent: "center",
      },
      dockEnd: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: Colors.danger,
        alignItems: "center",
        justifyContent: "center",
      },
    }),
  };
}

function Avatar({
  name,
  size = 48,
  styles,
}: {
  name: string;
  size?: number;
  styles: ReturnType<typeof createCallsStyles>["styles"];
}) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <View style={[styles.avatarCircle, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.32 }]}>{initials}</Text>
    </View>
  );
}

export default function CallsScreen() {
  const router = useRouter();
  const { palette, mode } = useAppTheme();
  const { styles, patternIcon } = React.useMemo(() => createCallsStyles(palette, mode), [palette, mode]);

  const {
    incomingCall,
    activeCall,
    user,
    socketConnected,
    startCall,
    acceptIncomingCall,
    declineIncomingCall,
    endCall,
  } = useSession();

  const webrtc = useCallWebRTC({
    socketConnected,
    enabled: Boolean(
      activeCall?.state === "connected" && activeCall.peerUserId > 0 && user?.id != null && user.id > 0,
    ),
    callId: activeCall?.callId ?? null,
    peerUserId: activeCall?.peerUserId ?? null,
    myUserId: user?.id,
    mode: activeCall?.mode ?? "audio",
    direction: activeCall?.direction ?? "outgoing",
  });

  const [conversations, setConversations] = React.useState<ConversationSummary[]>([]);
  const [me, setMe] = React.useState<AuthUser | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [tab, setTab] = React.useState<CallsTab>("contacts");
  const [callFullscreen, setCallFullscreen] = React.useState(true);
  const [contactListFilter, setContactListFilter] = React.useState<"all" | "stylnk">("all");
  const [speakerOn, setSpeakerOn] = React.useState(false);

  React.useEffect(() => {
    if (activeCall) {
      setCallFullscreen(true);
    } else {
      setSpeakerOn(false);
    }
  }, [activeCall]);

  const loadConversations = React.useCallback(async () => {
    try {
      const [result, current] = await Promise.all([chatApi.listConversations(), authStorage.getCurrentUser()]);
      setMe(current);
      setConversations(result.filter((c) => !c.isGroup));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  React.useEffect(() => {
    const unsubscribe = realtimeClient.on("conversation:refresh", () => {
      void loadConversations();
    });
    return () => unsubscribe();
  }, [loadConversations]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => c.title.toLowerCase().includes(q));
  }, [conversations, search]);

  const filteredForList = React.useMemo(() => {
    if (contactListFilter !== "stylnk") {
      return filtered;
    }
    return filtered.filter(
      (c) => c.lastMessageAt != null && (c.lastMessage?.trim()?.length ?? 0) > 0,
    );
  }, [filtered, contactListFilter]);

  const recentsSorted = React.useMemo(() => {
    return [...filteredForList].sort((a, b) => {
      const ta = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const tb = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      return tb - ta;
    });
  }, [filteredForList]);

  const sections = React.useMemo(() => groupContactsForSections(filteredForList), [filteredForList]);

  const voiceIconColor = mode === "dark" ? Colors.white : Colors.primary;

  const renderCallRow = (item: ConversationSummary, letter: string) => (
    <View style={styles.row}>
      <Text style={styles.rowLetter}>{letter}</Text>
      <Avatar name={item.title} size={48} styles={styles} />
      <View style={styles.rowBody}>
        <Text style={styles.rowName} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.rowSub}>StyLnk call</Text>
      </View>
      <View style={styles.rowActions}>
        <TouchableOpacity
          style={styles.btnVideo}
          activeOpacity={0.75}
          onPress={() =>
            void startCall({
              conversationId: item.id,
              mode: "video",
              peerName: item.title,
            })
          }
        >
          <Ionicons name="videocam" size={20} color={Colors.white} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.btnVoice}
          activeOpacity={0.75}
          onPress={() =>
            void startCall({
              conversationId: item.id,
              mode: "audio",
              peerName: item.title,
            })
          }
        >
          <Ionicons name="call" size={18} color={voiceIconColor} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const listHeader = (
    <>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Calls</Text>
        <TouchableOpacity
          style={styles.headerAdd}
          onPress={() => router.push("/new-message")}
          activeOpacity={0.8}
        >
          <Ionicons name="person-add-outline" size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={18} color={palette.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search"
          placeholderTextColor={palette.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <View style={styles.tabs}>
        <Pressable style={styles.tabHit} onPress={() => setTab("contacts")}>
          <Text style={[styles.tabLabel, tab === "contacts" && styles.tabLabelActive]}>CONTACTS</Text>
          {tab === "contacts" ? <View style={styles.tabUnderline} /> : <View style={styles.tabUnderlineGhost} />}
        </Pressable>
        <Pressable style={styles.tabHit} onPress={() => setTab("recents")}>
          <Text style={[styles.tabLabel, tab === "recents" && styles.tabLabelActive]}>RECENTS</Text>
          {tab === "recents" ? <View style={styles.tabUnderline} /> : <View style={styles.tabUnderlineGhost} />}
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.quickStrip}
        contentContainerStyle={styles.quickStripContent}
      >
        <TouchableOpacity
          style={styles.quickStripItem}
          onPress={() => router.push("/(tabs)/profile")}
          activeOpacity={0.85}
        >
          <View style={styles.quickAvatarMeRing}>
            <Ionicons name="add" size={28} color={palette.text} />
          </View>
          <Text style={styles.quickStripLabel} numberOfLines={1}>
            Me
          </Text>
        </TouchableOpacity>
        {recentsSorted.map((c) => {
          const peer = peerFromConversation(c, me?.id ?? null);
          const displayPeerName = peer?.fullName ?? peer?.name ?? c.title;
          const uri = peer?.avatarUrl?.trim() ? peer.avatarUrl : null;
          const initials = initialsFromName(displayPeerName);
          return (
            <TouchableOpacity
              key={c.id}
              style={styles.quickStripItem}
              onPress={() =>
                router.push({
                  pathname: "/chat/[id]",
                  params: { id: String(c.id), name: c.title },
                })
              }
              activeOpacity={0.85}
            >
              <View style={[styles.quickAvatarShadow, { shadowColor: Colors.primary }]}>
                <View style={styles.quickAvatarRing}>
                  {uri ? (
                    <Image source={{ uri }} style={styles.quickAvatarImage} contentFit="cover" />
                  ) : (
                    <View style={[styles.quickAvatarImage, { alignItems: "center", justifyContent: "center" }]}>
                      <Text style={styles.quickAvatarInitials}>{initials}</Text>
                    </View>
                  )}
                </View>
              </View>
              <Text style={styles.quickStripLabel} numberOfLines={1}>
                {shortDisplayName(c.title)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.listSectionHeader}>
        <Text style={styles.listSectionTitle}>Contact list</Text>
        <View style={styles.listFilters}>
          <Pressable onPress={() => setContactListFilter("all")} hitSlop={8}>
            <Text style={contactListFilter === "all" ? styles.filterActive : styles.filterMuted}>All</Text>
          </Pressable>
          <Pressable onPress={() => setContactListFilter("stylnk")} hitSlop={8}>
            <Text style={contactListFilter === "stylnk" ? styles.filterActive : styles.filterMuted}>
              StyLnk
            </Text>
          </Pressable>
        </View>
      </View>
    </>
  );

  const showActiveOverlay = Boolean(activeCall && !incomingCall && callFullscreen);
  const topIconColor = palette.text;
  const dockActive = palette.text;
  const dockInactive = palette.textMuted;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar
        barStyle={palette.statusBar === "dark" ? "light-content" : "dark-content"}
        backgroundColor={palette.background}
      />

      {incomingCall && (
        <View style={styles.incomingBar}>
          <View style={{ flex: 1 }}>
            <Text style={styles.incomingTitle}>Incoming {incomingCall.mode} call</Text>
            <Text style={styles.incomingSub}>{incomingCall.initiatedBy.name}</Text>
          </View>
          <TouchableOpacity style={styles.declineBtn} onPress={declineIncomingCall}>
            <Ionicons name="close" size={22} color={Colors.white} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.acceptBtn} onPress={acceptIncomingCall}>
            <Ionicons name="call" size={20} color={Colors.white} />
          </TouchableOpacity>
        </View>
      )}

      {activeCall && !incomingCall && !callFullscreen && (
        <View style={styles.minimizedBar}>
          <View style={{ flex: 1 }}>
            <Text style={styles.minimizedTitle}>
              {activeCall.direction === "outgoing" ? "Calling" : "In call"}
            </Text>
            <Text style={styles.minimizedSub}>
              {activeCall.peerName} · {activeCall.mode}
            </Text>
          </View>
          <TouchableOpacity onPress={() => setCallFullscreen(true)} style={styles.expandTap}>
            <Ionicons name="expand-outline" size={22} color={Colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.hangupSmall} onPress={endCall}>
            <Ionicons name="call" size={18} color={Colors.white} style={{ transform: [{ rotate: "135deg" }] }} />
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : tab === "contacts" ? (
        <SectionList
          sections={sections}
          keyExtractor={(item) => String(item.id)}
          stickySectionHeadersEnabled
          renderSectionHeader={({ section: { title } }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeaderText}>{title}</Text>
            </View>
          )}
          renderItem={({ item, section }) => renderCallRow(item, section.title)}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="call-outline" size={48} color={palette.textMuted} />
              <Text style={styles.emptyTitle}>No contacts yet</Text>
              <Text style={styles.emptySub}>Start a direct chat, then call from here.</Text>
            </View>
          }
          contentContainerStyle={styles.listPad}
          showsVerticalScrollIndicator={false}
          SectionSeparatorComponent={() => null}
        />
      ) : (
        <FlatList
          data={recentsSorted}
          keyExtractor={(item) => String(item.id)}
          ListHeaderComponent={listHeader}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Text style={styles.rowLetter}> </Text>
              <Avatar name={item.title} size={48} styles={styles} />
              <View style={styles.rowBody}>
                <Text style={styles.rowName} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.rowSubMuted}>
                  {item.lastMessageAt
                    ? new Date(item.lastMessageAt).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "No recent activity"}
                </Text>
              </View>
              <View style={styles.rowActions}>
                <TouchableOpacity
                  style={styles.btnVideo}
                  activeOpacity={0.75}
                  onPress={() =>
                    void startCall({
                      conversationId: item.id,
                      mode: "video",
                      peerName: item.title,
                    })
                  }
                >
                  <Ionicons name="videocam" size={20} color={Colors.white} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.btnVoice}
                  activeOpacity={0.75}
                  onPress={() =>
                    void startCall({
                      conversationId: item.id,
                      mode: "audio",
                      peerName: item.title,
                    })
                  }
                >
                  <Ionicons name="call" size={18} color={voiceIconColor} />
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="time-outline" size={48} color={palette.textMuted} />
              <Text style={styles.emptyTitle}>No recent calls</Text>
              <Text style={styles.emptySub}>Your recent StyLnk calls will show here.</Text>
            </View>
          }
          contentContainerStyle={styles.listPad}
          showsVerticalScrollIndicator={false}
        />
      )}

      <TouchableOpacity style={styles.fab} activeOpacity={0.9} onPress={() => router.push("/new-message")}>
        <Ionicons name="keypad-outline" size={26} color={Colors.white} />
      </TouchableOpacity>

      <Modal visible={showActiveOverlay} animationType="fade" transparent>
        <View style={styles.modalRoot}>
          <PatternBackdrop iconTint={patternIcon} />
          <SafeAreaView style={styles.modalSafe}>
            <View style={styles.callTopBar}>
              <TouchableOpacity onPress={() => setCallFullscreen(false)} hitSlop={12}>
                <Ionicons name="contract-outline" size={26} color={topIconColor} />
              </TouchableOpacity>
              <TouchableOpacity
                hitSlop={12}
                onPress={() =>
                  Alert.alert(
                    "Call options",
                    "Minimize the call with the arrow. Mute and camera toggles apply to your microphone and camera on native builds.",
                  )
                }
              >
                <Ionicons name="ellipsis-vertical" size={22} color={topIconColor} />
              </TouchableOpacity>
            </View>

            <View style={styles.callBody}>
              <View style={styles.callStage}>
                {activeCall?.mode === "video" && webrtc.supported && webrtc.remoteStreamUrl ? (
                  <CallRemoteVideo streamURL={webrtc.remoteStreamUrl} style={styles.callRemoteVideo} />
                ) : null}
                {!(
                  activeCall?.mode === "video" &&
                  webrtc.supported &&
                  webrtc.remoteStreamUrl
                ) ? (
                  <View style={styles.callAvatarCenter}>
                    <View style={styles.callAvatarRing}>
                      <View style={styles.callAvatarInner}>
                        <Ionicons name="person" size={72} color={palette.textMuted} />
                      </View>
                    </View>
                  </View>
                ) : null}
                {activeCall?.mode === "video" && webrtc.supported && webrtc.localStreamUrl ? (
                  <CallLocalPip streamURL={webrtc.localStreamUrl} style={styles.callLocalPip} />
                ) : null}
              </View>

              <View style={styles.callHeroOverlay} pointerEvents="box-none">
                <View style={styles.encryptedRow}>
                  <Ionicons name="lock-closed" size={12} color={palette.textSecondary} />
                  <Text style={styles.encryptedText}>End-to-end encrypted</Text>
                </View>
                <Text style={styles.callNameLarge}>{activeCall?.peerName ?? ""}</Text>
                <Text style={styles.callStatus}>
                  {activeCall?.direction === "outgoing" && activeCall?.state === "ringing"
                    ? "Calling"
                    : activeCall?.state === "connected"
                      ? "Connected"
                      : "Calling"}
                </Text>
              </View>
            </View>

            {Platform.OS === "web" && !webrtc.supported ? (
              <Text style={styles.webRtcHint}>
                Camera and microphone use WebRTC on the native Android or iOS app. Run a dev build (for example
                expo run:android), then start a video call from two signed-in devices on the same network.
              </Text>
            ) : null}

            <View style={styles.callDock}>
              <TouchableOpacity
                style={styles.dockBtn}
                activeOpacity={0.8}
                onPress={() => setSpeakerOn((v) => !v)}
                accessibilityLabel="Toggle speaker"
              >
                <Ionicons
                  name={speakerOn ? "volume-high" : "volume-mute-outline"}
                  size={26}
                  color={speakerOn ? dockActive : dockInactive}
                />
              </TouchableOpacity>
              {activeCall?.mode === "video" ? (
                <TouchableOpacity
                  style={styles.dockBtn}
                  activeOpacity={0.8}
                  onPress={() => webrtc.setCameraOn(!webrtc.cameraOn)}
                  accessibilityLabel="Toggle video"
                >
                  <Ionicons
                    name={webrtc.cameraOn ? "videocam" : "videocam-off-outline"}
                    size={26}
                    color={webrtc.cameraOn ? dockActive : dockInactive}
                  />
                </TouchableOpacity>
              ) : (
                <View style={styles.dockBtn} accessibilityLabel="Video unavailable on audio calls">
                  <Ionicons name="videocam-off-outline" size={26} color={dockInactive} />
                </View>
              )}
              <TouchableOpacity
                style={styles.dockBtn}
                activeOpacity={0.8}
                onPress={() => webrtc.setMicOn(!webrtc.micOn)}
                accessibilityLabel="Toggle microphone"
              >
                <Ionicons
                  name={webrtc.micOn ? "mic-outline" : "mic-off-outline"}
                  size={26}
                  color={webrtc.micOn ? dockActive : dockInactive}
                />
              </TouchableOpacity>
              <TouchableOpacity style={styles.dockEnd} onPress={endCall} activeOpacity={0.85}>
                <Ionicons name="call" size={28} color={Colors.white} style={{ transform: [{ rotate: "135deg" }] }} />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
