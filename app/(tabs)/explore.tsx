import {
  BorderRadius,
  Colors,
  Shadows,
  Spacing,
  Typography,
} from "@/constants/theme";
import { useAppTheme } from "@/src/theme/app-theme";
import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const sections = [
  {
    title: "What works now",
    items: [
      "Register and login with the backend",
      "See your own profile details from saved session data",
      "Browse chats, groups, calls, and individual message threads",
    ],
  },
  {
    title: "What to build next",
    items: [
      "Real group data and group chat threads",
      "Create chat / create group actions",
      "Presence, unread counts, and live updates",
    ],
  },
];

export default function ExploreScreen() {
  const { palette } = useAppTheme();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: palette.background }]}
      contentContainerStyle={styles.content}
    >
      <View style={styles.hero}>
        <View
          style={[styles.heroIcon, { backgroundColor: palette.primarySurface }]}
        >
          <Ionicons name="sparkles-outline" size={30} color={Colors.primary} />
        </View>
        <Text style={[styles.title, { color: palette.text }]}>
          Discover StyLnk
        </Text>
        <Text style={[styles.subtitle, { color: palette.textSecondary }]}>
          A quick snapshot of where the app is now and the most useful next
          product steps.
        </Text>
      </View>

      {sections.map((section) => (
        <View
          key={section.title}
          style={[
            styles.card,
            { backgroundColor: palette.card, borderColor: palette.border },
          ]}
        >
          <Text style={[styles.cardTitle, { color: palette.text }]}>
            {section.title}
          </Text>
          <View style={styles.list}>
            {section.items.map((item) => (
              <View key={item} style={styles.listItem}>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={18}
                  color={Colors.primary}
                />
                <Text style={[styles.listText, { color: palette.text }]}>
                  {item}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ))}

      <Link href="/modal" asChild>
        <TouchableOpacity style={styles.cta} activeOpacity={0.85}>
          <Ionicons
            name="information-circle-outline"
            size={18}
            color={Colors.white}
          />
          <Text style={styles.ctaText}>Open App Overview</Text>
        </TouchableOpacity>
      </Link>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.xl,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.lg,
  },
  hero: {
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: Typography.fontSizes.xxxl,
    fontWeight: Typography.fontWeights.bold,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: Typography.fontSizes.md,
    lineHeight: 24,
  },
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    ...Shadows.sm,
  },
  cardTitle: {
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.semibold,
    marginBottom: Spacing.md,
  },
  list: {
    gap: Spacing.md,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  listText: {
    flex: 1,
    fontSize: Typography.fontSizes.md,
    lineHeight: 22,
  },
  cta: {
    marginTop: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  ctaText: {
    color: Colors.white,
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.semibold,
  },
});
