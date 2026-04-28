import {
  BorderRadius,
  Colors,
  Shadows,
  Spacing,
  Typography,
} from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

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
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
          <TouchableOpacity style={styles.headerButton}>
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
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>PJ</Text>
            </View>
            <TouchableOpacity style={styles.editAvatarBtn}>
              <Ionicons name="camera" size={14} color={Colors.white} />
            </TouchableOpacity>
          </View>
          <Text style={styles.profileName}>Princess Jane</Text>
          <Text style={styles.profileHandle}>@princessjane</Text>
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
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Settings Sections */}
        {SETTINGS.map((section) => (
          <View key={section.section} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.section}</Text>
            <View style={styles.sectionCard}>
              {section.items.map((item, idx) => (
                <React.Fragment key={item.label}>
                  <TouchableOpacity
                    style={styles.settingItem}
                    activeOpacity={0.7}
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
                        item.danger && styles.settingLabelDanger,
                      ]}
                    >
                      {item.label}
                    </Text>
                    <View style={styles.settingRight}>
                      {item.value && (
                        <Text style={styles.settingValue}>{item.value}</Text>
                      )}
                      {!item.danger && (
                        <Ionicons
                          name="chevron-forward"
                          size={16}
                          color={Colors.textMuted}
                        />
                      )}
                    </View>
                  </TouchableOpacity>
                  {idx < section.items.length - 1 && (
                    <View style={styles.itemDivider} />
                  )}
                </React.Fragment>
              ))}
            </View>
          </View>
        ))}

        <Text style={styles.versionText}>StyLnk v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingBottom: 100 },
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
    color: Colors.text,
    letterSpacing: -0.5,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primarySurface,
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
    color: Colors.textSecondary,
    marginTop: 2,
  },
  section: { marginBottom: Spacing.xl, paddingHorizontal: Spacing.xl },
  sectionTitle: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.semibold,
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  sectionCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
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
    color: Colors.text,
    fontWeight: Typography.fontWeights.medium,
  },
  settingLabelDanger: { color: Colors.danger },
  settingRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  settingValue: { fontSize: Typography.fontSizes.sm, color: Colors.textMuted },
  itemDivider: { height: 1, backgroundColor: Colors.divider, marginLeft: 58 },
  versionText: {
    textAlign: "center",
    fontSize: Typography.fontSizes.xs,
    color: Colors.textMuted,
    paddingBottom: Spacing.xl,
  },
});
