import {
    BorderRadius,
    Colors,
    Shadows,
    Spacing,
    Typography,
} from "@/constants/theme";
import { authApi, authStorage, type AuthUser } from "@/src/services/api";
import { preferencesStorage } from "@/src/services/preferences";
import { useAppTheme } from "@/src/theme/app-theme";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import React from "react";
import {
    ActivityIndicator,
    Alert,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { ImageUploadHelper } from "../../utils/imageUpload";

type SettingItem = {
  icon: string;
  label: string;
  value?: string;
  danger?: boolean;
};

const SETTINGS: { section: string; items: SettingItem[] }[] = [
  {
    section: "Account",
    items: [
      { icon: "person-outline", label: "Edit Profile" },
      { icon: "lock-closed-outline", label: "Privacy" },
      { icon: "notifications-outline", label: "Notifications" },
      { icon: "shield-checkmark-outline", label: "Security" },
    ],
  },
  {
    section: "Preferences",
    items: [
      { icon: "color-palette-outline", label: "Appearance" },
      { icon: "language-outline", label: "Language", value: "English" },
      { icon: "chatbubble-outline", label: "Chat Settings" },
    ],
  },
  {
    section: "Support",
    items: [
      { icon: "help-circle-outline", label: "Help & FAQ" },
      { icon: "information-circle-outline", label: "About StyLnk" },
      { icon: "log-out-outline", label: "Log Out", danger: true },
    ],
  },
];

export default function ProfileScreen() {
  const router = useRouter();
  const { palette } = useAppTheme();
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [languageLabel, setLanguageLabel] = React.useState("English");
  const [avatarUri, setAvatarUri] = React.useState("");
  const [uploadingAvatar, setUploadingAvatar] = React.useState(false);

  useFocusEffect(
    React.useCallback(() => {
      const loadUser = async () => {
        setLoading(true);
        const [currentUser, language, profileExtras] = await Promise.all([
          authStorage.getCurrentUser(),
          preferencesStorage.getLanguage(),
          preferencesStorage.getProfileExtras(),
        ]);

        if (!currentUser) {
          await authStorage.clearSession();
          router.replace("/auth/login");
          return;
        }

        setUser(currentUser);
        setLanguageLabel(language.language);
        setAvatarUri(currentUser.avatarUrl || profileExtras.avatarUri);
        setLoading(false);
      };

      loadUser();
    }, [router]),
  );

  const handleLogout = async () => {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          await authStorage.clearSession();
          router.replace("/auth/login");
        },
      },
    ]);
  };

  const handleSettingPress = (label: string) => {
    if (label === "Log Out") {
      void handleLogout();
      return;
    }

    if (label === "About StyLnk") {
      router.push("/modal");
      return;
    }

    const slugMap: Record<string, string> = {
      "Edit Profile": "edit-profile",
      Privacy: "privacy",
      Notifications: "notifications",
      Security: "security",
      Appearance: "appearance",
      Language: "language",
      "Chat Settings": "chat-settings",
      "Help & FAQ": "help-faq",
    };

    const slug = slugMap[label];
    if (slug) {
      router.push(`/settings/${slug}`);
    }
  };

  const handlePickAvatar = async () => {
    const image = await ImageUploadHelper.pickImage({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6, // Reduced quality for faster upload
      maxSizeMB: 2, // Reduced to 2MB for much faster uploads
    });

    if (!image) {
      return; // User cancelled or error occurred (helper shows alerts)
    }

    const dataUrl = ImageUploadHelper.createDataUrl(image);
    setAvatarUri(image.uri);
    setUploadingAvatar(true);

    try {
      console.log("Starting avatar upload...");
      const updatedUser = await authApi.uploadAvatar(dataUrl);
      console.log("Avatar upload successful:", updatedUser);
      setUser(updatedUser);
      setAvatarUri(updatedUser.avatarUrl || image.uri);
      const profileExtras = await preferencesStorage.getProfileExtras();
      await preferencesStorage.saveProfileExtras({
        ...profileExtras,
        avatarUri: updatedUser.avatarUrl || image.uri,
      });
      Alert.alert("Success", "Profile picture updated successfully!");
    } catch (error) {
      setAvatarUri(user?.avatarUrl || "");
      console.error("Upload error:", error);
      const message = error instanceof Error ? error.message : "Upload failed. Please try again.";
      console.error("Detailed error:", message);
      Alert.alert("Upload failed", `${message}\n\nPlease check your network connection and try again.`);
    } finally {
      setUploadingAvatar(false);
    }
  };

  if (loading || !user) {
      return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
        <StatusBar barStyle={palette.statusBar === "dark" ? "light-content" : "dark-content"} backgroundColor={palette.background} />
        <View style={styles.loadingState}>
          <ActivityIndicator color={Colors.primary} />
          <Text style={[styles.loadingText, { color: palette.textSecondary }]}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const initials = user.fullName
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const handle = `@${user.email.split("@")[0]}`;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
      <StatusBar barStyle={palette.statusBar === "dark" ? "light-content" : "dark-content"} backgroundColor={palette.background} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerSpacer} />
          <TouchableOpacity 
            style={[styles.headerButton, { backgroundColor: palette.card }]} 
            onPress={() => router.push("/modal")}
          >
            <Ionicons
              name="settings-outline"
              size={22}
              color={palette.text}
            />
          </TouchableOpacity>
        </View>

        {/* Profile Card */}
        <View style={[styles.profileCard, { backgroundColor: palette.card }]}>
          <View style={styles.avatarWrapper}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarCircle} contentFit="cover" />
            ) : (
              <View style={[styles.avatarCircle, { backgroundColor: Colors.primary }]}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.editAvatarBtn}
              onPress={() => void handlePickAvatar()}
              disabled={uploadingAvatar}
            >
              {uploadingAvatar ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <Ionicons name="camera" size={14} color={Colors.white} />
              )}
            </TouchableOpacity>
          </View>
          <Text style={[styles.profileName, { color: palette.text }]}>{user.fullName}</Text>
          <Text style={[styles.profileEmail, { color: palette.textSecondary }]}>{user.email}</Text>
          <View style={styles.statusRow}>
            <View style={[styles.onlineDot, { backgroundColor: Colors.primary }]} />
            <Text style={[styles.statusText, { color: palette.textSecondary }]}>Active now</Text>
          </View>
        </View>

        {/* Stats Row */}
        <View style={[styles.statsRow, { backgroundColor: palette.card }]}>
          {[
            { label: "Chats", value: "24" },
            { label: "Groups", value: "7" },
            { label: "Calls", value: "156" },
          ].map((stat) => (
            <TouchableOpacity key={stat.label} style={styles.statItem}>
              <Text style={[styles.statValue, { color: palette.text }]}>{stat.value}</Text>
              <Text style={[styles.statLabel, { color: palette.textSecondary }]}>{stat.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Menu Items */}
        <View style={[styles.menuContainer, { backgroundColor: palette.card }]}>
          {[
            { icon: "person-outline", label: "Edit Profile" },
            { icon: "lock-closed-outline", label: "Privacy" },
            { icon: "notifications-outline", label: "Notifications" },
            { icon: "shield-checkmark-outline", label: "Security" },
            { icon: "color-palette-outline", label: "Appearance" },
            { icon: "language-outline", label: "Language", value: "English" },
            { icon: "chatbubble-outline", label: "Chat Settings" },
            { icon: "help-circle-outline", label: "Help & FAQ" },
            { icon: "information-circle-outline", label: "About StyLnk" },
            { icon: "log-out-outline", label: "Log Out", danger: true },
          ].map((item, idx) => (
            <React.Fragment key={item.label}>
              <TouchableOpacity
                style={styles.menuItem}
                activeOpacity={0.7}
                onPress={() => handleSettingPress(item.label)}
              >
                <View style={[styles.menuIcon, { backgroundColor: palette.primarySurface }]}>
                  <Ionicons
                    name={item.icon as any}
                    size={20}
                    color={item.danger ? Colors.danger : Colors.primary}
                  />
                </View>
                <Text
                  style={[
                    styles.menuLabel,
                    { color: palette.text },
                    item.danger && styles.menuLabelDanger,
                  ]}
                >
                  {item.label}
                </Text>
                <View style={styles.menuRight}>
                  {item.value && (
                    <Text style={[styles.menuValue, { color: palette.textSecondary }]}>
                      {item.label === "Language" ? languageLabel : item.value}
                    </Text>
                  )}
                  {!item.danger && (
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={palette.textSecondary}
                    />
                  )}
                </View>
              </TouchableOpacity>
              {idx < 9 && (
                <View style={[styles.menuDivider, { backgroundColor: palette.border }]} />
              )}
            </React.Fragment>
          ))}
        </View>

        <Text style={[styles.versionText, { color: palette.textMuted }]}>StyLnk v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingBottom: 100 },
  loadingState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: { fontSize: Typography.fontSizes.sm },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  headerSpacer: {
    flex: 1,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  profileCard: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.xl,
    marginHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
  },
  avatarWrapper: { position: "relative", marginBottom: Spacing.lg },
  avatarCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    ...Shadows.md,
  },
  avatarText: {
    color: Colors.white,
    fontSize: 30,
    fontWeight: Typography.fontWeights.bold,
  },
  editAvatarBtn: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primaryDark,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Colors.white,
  },
  profileName: {
    fontSize: Typography.fontSizes.xl,
    fontWeight: Typography.fontWeights.bold,
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: Typography.fontSizes.sm,
    marginBottom: Spacing.sm,
  },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: "500",
  },
  statsRow: {
    flexDirection: "row",
    marginHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    borderRightWidth: 1,
    borderRightColor: Colors.border,
  },
  statValue: {
    fontSize: Typography.fontSizes.xl,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.primary,
  },
  statLabel: {
    fontSize: Typography.fontSizes.xs,
    marginTop: 2,
  },
  menuContainer: {
    marginHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.xl,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: 16,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  menuLabel: {
    flex: 1,
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.medium,
  },
  menuLabelDanger: { color: Colors.danger },
  menuRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  menuValue: { fontSize: Typography.fontSizes.sm },
  menuDivider: { height: 1, marginLeft: 60 },
  versionText: {
    textAlign: "center",
    fontSize: Typography.fontSizes.xs,
    paddingBottom: Spacing.xl,
  },
});
