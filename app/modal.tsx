import { BorderRadius, Colors, Spacing, Typography } from "@/constants/theme";
import { useAppTheme } from "@/src/theme/app-theme";
import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

export default function ModalScreen() {
  const { palette } = useAppTheme();

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <View style={styles.hero}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoText}>S</Text>
        </View>
        <Text style={[styles.title, { color: palette.text }]}>StyLnk</Text>
        <Text style={[styles.subtitle, { color: palette.textSecondary }]}>
          A lightweight messaging app for chats, calls, groups, and quick
          connection.
        </Text>
      </View>

      <View
        style={[
          styles.section,
          { backgroundColor: palette.card, borderColor: palette.border },
        ]}
      >
        <View style={styles.infoRow}>
          <Ionicons name="chatbubbles-outline" size={20} color={Colors.primary} />
          <Text style={[styles.infoText, { color: palette.text }]}>
            Real auth flow with backend-backed chats
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="people-outline" size={20} color={Colors.primary} />
          <Text style={[styles.infoText, { color: palette.text }]}>
            Dedicated tabs for conversations, groups, and profile
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons
            name="shield-checkmark-outline"
            size={20}
            color={Colors.primary}
          />
          <Text style={[styles.infoText, { color: palette.text }]}>
            Persistent session handling across app launches
          </Text>
        </View>
      </View>

      <Link
        href="/(tabs)/profile"
        dismissTo
        style={[styles.link, { backgroundColor: palette.primarySurface }]}
      >
        <Text style={styles.linkText}>Back to Profile</Text>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.xl,
  },
  hero: {
    alignItems: "center",
    paddingVertical: Spacing.xxxl,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  logoText: {
    color: Colors.white,
    fontSize: 32,
    fontWeight: Typography.fontWeights.bold,
  },
  title: {
    fontSize: Typography.fontSizes.xxxl,
    fontWeight: Typography.fontWeights.bold,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: Typography.fontSizes.md,
    textAlign: "center",
    lineHeight: 24,
    maxWidth: 320,
  },
  section: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  infoText: {
    flex: 1,
    fontSize: Typography.fontSizes.md,
    lineHeight: 22,
  },
  link: {
    marginTop: Spacing.xl,
    borderRadius: BorderRadius.md,
    paddingVertical: 14,
    alignItems: "center",
  },
  linkText: {
    color: Colors.primary,
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.semibold,
  },
});
