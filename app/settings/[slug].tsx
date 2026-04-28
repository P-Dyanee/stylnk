import {
  BorderRadius,
  Colors,
  Spacing,
  Typography,
} from "@/constants/theme";
import { authStorage, type AuthUser } from "@/src/services/api";
import {
  preferencesStorage,
  type ChatSettings,
  type LanguageSettings,
  type NotificationSettings,
  type PrivacySettings,
  type ProfileExtras,
  type SecuritySettings,
} from "@/src/services/preferences";
import { useAppTheme } from "@/src/theme/app-theme";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type PageKey =
  | "edit-profile"
  | "privacy"
  | "notifications"
  | "security"
  | "appearance"
  | "language"
  | "chat-settings"
  | "help-faq";

const TITLES: Record<PageKey, string> = {
  "edit-profile": "Edit Profile",
  privacy: "Privacy",
  notifications: "Notifications",
  security: "Security",
  appearance: "Appearance",
  language: "Language",
  "chat-settings": "Chat Settings",
  "help-faq": "Help & FAQ",
};

function ToggleRow({
  label,
  value,
  onValueChange,
  palette,
}: {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  palette: ReturnType<typeof useAppTheme>["palette"];
}) {
  return (
    <View style={[styles.row, { borderBottomColor: palette.divider }]}>
      <Text style={[styles.rowLabel, { color: palette.text }]}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        thumbColor={value ? Colors.primary : "#F4F3F4"}
        trackColor={{ false: palette.border, true: Colors.primaryDark }}
      />
    </View>
  );
}

function ChoiceRow({
  label,
  value,
  options,
  onSelect,
  palette,
}: {
  label: string;
  value: string;
  options: string[];
  onSelect: (value: string) => void;
  palette: ReturnType<typeof useAppTheme>["palette"];
}) {
  return (
    <View style={[styles.choiceSection, { borderBottomColor: palette.divider }]}>
      <Text style={[styles.rowLabel, { color: palette.text }]}>{label}</Text>
      <View style={styles.choiceWrap}>
        {options.map((option) => {
          const selected = option === value;
          return (
            <TouchableOpacity
              key={option}
              style={[
                styles.choiceChip,
                {
                  backgroundColor: selected ? Colors.primarySurface : palette.elevated,
                  borderColor: selected ? Colors.primary : palette.border,
                },
              ]}
              onPress={() => onSelect(option)}
            >
              <Text
                style={[
                  styles.choiceText,
                  { color: selected ? Colors.primary : palette.textSecondary },
                ]}
              >
                {option}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: PageKey }>();
  const { palette, mode, setMode } = useAppTheme();
  const [loading, setLoading] = React.useState(true);
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [profileExtras, setProfileExtras] = React.useState<ProfileExtras>({
    bio: "",
    phone: "",
  });
  const [privacy, setPrivacy] = React.useState<PrivacySettings>({
    lastSeen: "Everyone",
    readReceipts: true,
    profilePhoto: "Everyone",
  });
  const [notifications, setNotifications] = React.useState<NotificationSettings>({
    messages: true,
    groups: true,
    sound: true,
    vibration: true,
  });
  const [security, setSecurity] = React.useState<SecuritySettings>({
    biometrics: false,
    twoFactor: false,
    screenLock: false,
  });
  const [language, setLanguage] = React.useState<LanguageSettings>({
    language: "English",
  });
  const [chat, setChat] = React.useState<ChatSettings>({
    enterToSend: true,
    mediaAutoDownload: true,
    fontSize: "Medium",
  });
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    const load = async () => {
      const [
        currentUser,
        extras,
        privacyPrefs,
        notificationPrefs,
        securityPrefs,
        languagePrefs,
        chatPrefs,
      ] = await Promise.all([
        authStorage.getCurrentUser(),
        preferencesStorage.getProfileExtras(),
        preferencesStorage.getPrivacy(),
        preferencesStorage.getNotifications(),
        preferencesStorage.getSecurity(),
        preferencesStorage.getLanguage(),
        preferencesStorage.getChat(),
      ]);

      setUser(currentUser);
      setProfileExtras(extras);
      setPrivacy(privacyPrefs);
      setNotifications(notificationPrefs);
      setSecurity(securityPrefs);
      setLanguage(languagePrefs);
      setChat(chatPrefs);
      setLoading(false);
    };

    void load();
  }, []);

  const title = slug && slug in TITLES ? TITLES[slug] : "Settings";

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    await authStorage.updateCurrentUser({ fullName: user.fullName, email: user.email });
    await preferencesStorage.saveProfileExtras(profileExtras);
    setSaving(false);
    Alert.alert("Saved", "Your profile changes were saved on this device.");
  };

  const renderContent = () => {
    if (!slug || !(slug in TITLES)) {
      return <Text style={[styles.bodyText, { color: palette.textSecondary }]}>Unknown settings page.</Text>;
    }

    switch (slug) {
      case "edit-profile":
        return (
          <View style={styles.sectionCardStack}>
            <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
              <Text style={[styles.inputLabel, { color: palette.text }]}>Full Name</Text>
              <TextInput
                value={user?.fullName ?? ""}
                onChangeText={(fullName) =>
                  setUser((current) => (current ? { ...current, fullName } : current))
                }
                style={[styles.input, { color: palette.text, borderColor: palette.border, backgroundColor: palette.elevated }]}
                placeholder="Your full name"
                placeholderTextColor={palette.textMuted}
              />
              <Text style={[styles.inputLabel, { color: palette.text }]}>Email</Text>
              <TextInput
                value={user?.email ?? ""}
                onChangeText={(email) =>
                  setUser((current) => (current ? { ...current, email } : current))
                }
                style={[styles.input, { color: palette.text, borderColor: palette.border, backgroundColor: palette.elevated }]}
                placeholder="Your email"
                placeholderTextColor={palette.textMuted}
                autoCapitalize="none"
              />
              <Text style={[styles.inputLabel, { color: palette.text }]}>Bio</Text>
              <TextInput
                value={profileExtras.bio}
                onChangeText={(bio) => setProfileExtras((current) => ({ ...current, bio }))}
                style={[styles.input, styles.multilineInput, { color: palette.text, borderColor: palette.border, backgroundColor: palette.elevated }]}
                placeholder="Say a little about yourself"
                placeholderTextColor={palette.textMuted}
                multiline
              />
              <Text style={[styles.inputLabel, { color: palette.text }]}>Phone</Text>
              <TextInput
                value={profileExtras.phone}
                onChangeText={(phone) => setProfileExtras((current) => ({ ...current, phone }))}
                style={[styles.input, { color: palette.text, borderColor: palette.border, backgroundColor: palette.elevated }]}
                placeholder="Optional phone number"
                placeholderTextColor={palette.textMuted}
              />
            </View>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => void saveProfile()}
              disabled={saving}
            >
              <Text style={styles.primaryButtonText}>{saving ? "Saving..." : "Save Changes"}</Text>
            </TouchableOpacity>
          </View>
        );
      case "privacy":
        return (
          <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <ChoiceRow
              label="Last Seen"
              value={privacy.lastSeen}
              options={["Everyone", "Contacts", "Nobody"]}
              onSelect={(lastSeen) => {
                const next = { ...privacy, lastSeen: lastSeen as PrivacySettings["lastSeen"] };
                setPrivacy(next);
                void preferencesStorage.savePrivacy(next);
              }}
              palette={palette}
            />
            <ChoiceRow
              label="Profile Photo"
              value={privacy.profilePhoto}
              options={["Everyone", "Contacts", "Nobody"]}
              onSelect={(profilePhoto) => {
                const next = { ...privacy, profilePhoto: profilePhoto as PrivacySettings["profilePhoto"] };
                setPrivacy(next);
                void preferencesStorage.savePrivacy(next);
              }}
              palette={palette}
            />
            <ToggleRow
              label="Read Receipts"
              value={privacy.readReceipts}
              onValueChange={(readReceipts) => {
                const next = { ...privacy, readReceipts };
                setPrivacy(next);
                void preferencesStorage.savePrivacy(next);
              }}
              palette={palette}
            />
          </View>
        );
      case "notifications":
        return (
          <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
            {[
              ["Messages", "messages"],
              ["Groups", "groups"],
              ["Sound", "sound"],
              ["Vibration", "vibration"],
            ].map(([label, key]) => (
              <ToggleRow
                key={key}
                label={label}
                value={notifications[key as keyof NotificationSettings]}
                onValueChange={(value) => {
                  const next = { ...notifications, [key]: value };
                  setNotifications(next);
                  void preferencesStorage.saveNotifications(next);
                }}
                palette={palette}
              />
            ))}
          </View>
        );
      case "security":
        return (
          <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
            {[
              ["Biometric Unlock", "biometrics"],
              ["Two-Factor Authentication", "twoFactor"],
              ["App Screen Lock", "screenLock"],
            ].map(([label, key]) => (
              <ToggleRow
                key={key}
                label={label}
                value={security[key as keyof SecuritySettings]}
                onValueChange={(value) => {
                  const next = { ...security, [key]: value };
                  setSecurity(next);
                  void preferencesStorage.saveSecurity(next);
                }}
                palette={palette}
              />
            ))}
          </View>
        );
      case "appearance":
        return (
          <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <ChoiceRow
              label="Theme"
              value={mode === "dark" ? "Dark" : "Light"}
              options={["Light", "Dark"]}
              onSelect={(value) => void setMode(value.toLowerCase() as "light" | "dark")}
              palette={palette}
            />
            <Text style={[styles.helperParagraph, { color: palette.textSecondary }]}>
              The small toggle in the upper-left switches the same app-wide theme instantly.
            </Text>
          </View>
        );
      case "language":
        return (
          <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <ChoiceRow
              label="App Language"
              value={language.language}
              options={["English", "Filipino"]}
              onSelect={(value) => {
                const next = { language: value as LanguageSettings["language"] };
                setLanguage(next);
                void preferencesStorage.saveLanguage(next);
              }}
              palette={palette}
            />
          </View>
        );
      case "chat-settings":
        return (
          <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <ChoiceRow
              label="Message Font Size"
              value={chat.fontSize}
              options={["Small", "Medium", "Large"]}
              onSelect={(value) => {
                const next = { ...chat, fontSize: value as ChatSettings["fontSize"] };
                setChat(next);
                void preferencesStorage.saveChat(next);
              }}
              palette={palette}
            />
            <ToggleRow
              label="Enter to Send"
              value={chat.enterToSend}
              onValueChange={(enterToSend) => {
                const next = { ...chat, enterToSend };
                setChat(next);
                void preferencesStorage.saveChat(next);
              }}
              palette={palette}
            />
            <ToggleRow
              label="Auto-download Media"
              value={chat.mediaAutoDownload}
              onValueChange={(mediaAutoDownload) => {
                const next = { ...chat, mediaAutoDownload };
                setChat(next);
                void preferencesStorage.saveChat(next);
              }}
              palette={palette}
            />
          </View>
        );
      case "help-faq":
        return (
          <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
            {[
              {
                q: "How do I start a new chat?",
                a: "Open Chats, tap the compose button, and choose a user from the list.",
              },
              {
                q: "Why don't I see myself in search?",
                a: "StyLnk hides your own account from direct-message search so you can't message yourself.",
              },
              {
                q: "Where are my settings saved?",
                a: "These profile and preference settings are saved locally on this device.",
              },
            ].map((item, index) => (
              <View
                key={item.q}
                style={[
                  styles.faqItem,
                  index < 2 && { borderBottomColor: palette.divider, borderBottomWidth: 1 },
                ]}
              >
                <Text style={[styles.faqQuestion, { color: palette.text }]}>{item.q}</Text>
                <Text style={[styles.faqAnswer, { color: palette.textSecondary }]}>{item.a}</Text>
              </View>
            ))}
          </View>
        );
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
        <StatusBar
          barStyle={palette.statusBar === "dark" ? "dark-content" : "light-content"}
          backgroundColor={palette.background}
        />
        <View style={styles.loadingState}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
      <StatusBar
        barStyle={palette.statusBar === "dark" ? "dark-content" : "light-content"}
        backgroundColor={palette.background}
      />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: palette.primarySurface }]}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={18} color={Colors.primary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: palette.text }]}>{title}</Text>
        </View>
        {renderContent()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: Spacing.xl, paddingBottom: 40 },
  loadingState: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing.xl,
    paddingTop: 40,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: Typography.fontSizes.xxl,
    fontWeight: Typography.fontWeights.bold,
  },
  card: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  sectionCardStack: {
    gap: Spacing.lg,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  rowLabel: {
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.medium,
    flex: 1,
    marginRight: Spacing.lg,
  },
  choiceSection: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  choiceWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  choiceChip: {
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  choiceText: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.semibold,
  },
  bodyText: {
    fontSize: Typography.fontSizes.md,
  },
  inputLabel: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.semibold,
    marginBottom: 8,
    marginTop: 16,
    paddingHorizontal: Spacing.lg,
  },
  input: {
    marginHorizontal: Spacing.lg,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: Typography.fontSizes.md,
  },
  multilineInput: {
    minHeight: 90,
    textAlignVertical: "top",
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: 15,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.bold,
  },
  helperParagraph: {
    fontSize: Typography.fontSizes.sm,
    lineHeight: 20,
    padding: Spacing.lg,
  },
  faqItem: {
    padding: Spacing.lg,
  },
  faqQuestion: {
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.semibold,
    marginBottom: 6,
  },
  faqAnswer: {
    fontSize: Typography.fontSizes.sm,
    lineHeight: 20,
  },
});
