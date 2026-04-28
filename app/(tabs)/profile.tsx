import {
  BorderRadius,
  Colors,
  Shadows,
  Spacing,
  Typography,
} from "@/constants/theme";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { preferencesStorage } from "@/src/services/preferences";
import { useAppTheme } from "@/src/theme/app-theme";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { authApi, authStorage, type AuthUser } from "@/src/services/api";
import { useFocusEffect, useRouter } from "expo-router";

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
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Permission needed",
        "Please allow photo library access to upload a profile picture.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });

    if (result.canceled || !result.assets[0]?.uri || !result.assets[0]?.base64) {
      return;
    }

    const uri = result.assets[0].uri;
    const mimeType = result.assets[0].mimeType || "image/jpeg";
    const dataUrl = `data:${mimeType};base64,${result.assets[0].base64}`;

    setAvatarUri(uri);
    setUploadingAvatar(true);

    try {
      const updatedUser = await authApi.uploadAvatar(dataUrl);
      setUser(updatedUser);
      setAvatarUri(updatedUser.avatarUrl || uri);
      const profileExtras = await preferencesStorage.getProfileExtras();
      await preferencesStorage.saveProfileExtras({
        ...profileExtras,
        avatarUri: updatedUser.avatarUrl || uri,
      });
    } catch (error) {
      setAvatarUri(user?.avatarUrl || "");
      const message = error instanceof Error ? error.message : "Please try again.";
      Alert.alert("Upload failed", message);
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
          <Text style={[styles.headerTitle, { color: palette.text }]}>Profile</Text>
          <TouchableOpacity style={[styles.headerButton, { backgroundColor: palette.primarySurface }]}>
            <Ionicons
              name="settings-outline"
              size={22}
              color={Colors.primary}
            />
          </TouchableOpacity>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarWrapper}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarCircle} contentFit="cover" />
            ) : (
              <View style={styles.avatarCircle}>
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
          <Text style={styles.profileName}>{user.fullName}</Text>
          <Text style={[styles.profileHandle, { color: palette.textSecondary }]}>{handle}</Text>
          <Text style={[styles.profileEmail, { color: palette.textMuted }]}>{user.email}</Text>
          <View style={styles.statusRow}>
            <View style={styles.onlineDot} />
            <Text style={styles.statusText}>Active now</Text>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          {[
            { label: "Chats", value: "24" },
            { label: "Groups", value: "7" },
            { label: "Calls", value: "156" },
          ].map((stat) => (
            <View key={stat.label} style={styles.statItem}>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={[styles.statLabel, { color: palette.textSecondary }]}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Settings Sections */}
        {SETTINGS.map((section) => (
          <View key={section.section} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: palette.textSecondary }]}>{section.section}</Text>
            <View style={[styles.sectionCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
              {section.items.map((item, idx) => (
                <React.Fragment key={item.label}>
                  <TouchableOpacity
                    style={styles.settingItem}
                    activeOpacity={0.7}
                    onPress={() => handleSettingPress(item.label)}
                  >
                    <View
                      style={[
                        styles.settingIcon,
                        item.danger && styles.settingIconDanger,
                      ]}
                    >
                      <Ionicons
                        name={item.icon as any}
                        size={18}
                        color={item.danger ? Colors.danger : Colors.primary}
                      />
                    </View>
                    <Text
                      style={[
                        styles.settingLabel,
                        { color: palette.text },
                        item.danger && styles.settingLabelDanger,
                      ]}
                    >
                      {item.label}
                    </Text>
                    <View style={styles.settingRight}>
                      {item.value && (
                        <Text style={[styles.settingValue, { color: palette.textMuted }]}>
                          {item.label === "Language" ? languageLabel : item.value}
                        </Text>
                      )}
                      {!item.danger && (
                        <Ionicons
                          name="chevron-forward"
                          size={16}
                          color={palette.textMuted}
                        />
                      )}
                    </View>
                  </TouchableOpacity>
                  {idx < section.items.length - 1 && (
                    <View style={[styles.itemDivider, { backgroundColor: palette.divider }]} />
                  )}
                </React.Fragment>
              ))}
            </View>
          </View>
        ))}

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
  headerTitle: {
    fontSize: Typography.fontSizes.xxxl,
    fontWeight: Typography.fontWeights.bold,
    letterSpacing: -0.5,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  profileCard: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.xl,
  },
  avatarWrapper: { position: "relative", marginBottom: Spacing.lg },
  avatarCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.primary,
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
    color: Colors.text,
    marginBottom: 4,
  },
  profileHandle: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textMuted,
    marginBottom: Spacing.sm,
  },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.online,
  },
  statusText: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.online,
    fontWeight: "500",
  },
  statsRow: {
    flexDirection: "row",
    marginHorizontal: Spacing.xl,
    backgroundColor: Colors.primarySurface,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
    marginBottom: Spacing.xl,
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
  section: { marginBottom: Spacing.xl, paddingHorizontal: Spacing.xl },
  sectionTitle: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.semibold,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  sectionCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: "hidden",
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
  },
  settingIcon: {
    width: 34,
    height: 34,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.primarySurface,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  settingIconDanger: { backgroundColor: "#FFF0F0" },
  settingLabel: {
    flex: 1,
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.medium,
  },
  settingLabelDanger: { color: Colors.danger },
  settingRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  settingValue: { fontSize: Typography.fontSizes.sm },
  itemDivider: { height: 1, marginLeft: 58 },
  versionText: {
    textAlign: "center",
    fontSize: Typography.fontSizes.xs,
    paddingBottom: Spacing.xl,
  },
});
