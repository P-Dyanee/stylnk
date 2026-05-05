import { Colors } from "@/constants/theme";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

type StyLnkLogoProps = {
  compact?: boolean;
  showTagline?: boolean;
  size?: "sm" | "md" | "lg";
};

const sizeMap = {
  sm: {
    icon: 34,
    word: 22,
    tagline: 8,
    gap: 10,
  },
  md: {
    icon: 58,
    word: 40,
    tagline: 12,
    gap: 14,
  },
  lg: {
    icon: 86,
    word: 54,
    tagline: 14,
    gap: 18,
  },
};

export default function StyLnkLogo({
  compact = false,
  showTagline = true,
  size = "md",
}: StyLnkLogoProps) {
  const metrics = sizeMap[size];

  return (
    <View style={[styles.container, compact && styles.compactContainer]}>
      <View
        style={[
          styles.brandIcon,
          {
            width: metrics.icon,
            height: metrics.icon * 0.86,
            marginRight: metrics.gap,
          },
        ]}
      >
        <View
          style={[
            styles.outerBubble,
            {
              width: metrics.icon * 0.78,
              height: metrics.icon * 0.58,
              borderRadius: metrics.icon * 0.14,
            },
          ]}
        />
        <View
          style={[
            styles.outerTail,
            {
              borderTopWidth: metrics.icon * 0.22,
              borderRightWidth: metrics.icon * 0.28,
              left: metrics.icon * 0.02,
              top: metrics.icon * 0.48,
            },
          ]}
        />
        <View
          style={[
            styles.innerBubble,
            {
              width: metrics.icon * 0.66,
              height: metrics.icon * 0.5,
              borderRadius: metrics.icon * 0.12,
              left: metrics.icon * 0.12,
              top: metrics.icon * 0.15,
            },
          ]}
        />
        <View
          style={[
            styles.innerTail,
            {
              borderTopWidth: metrics.icon * 0.18,
              borderLeftWidth: metrics.icon * 0.25,
              left: metrics.icon * 0.58,
              top: metrics.icon * 0.58,
            },
          ]}
        />
        <View
          style={[
            styles.messageLine,
            {
              width: metrics.icon * 0.34,
              height: Math.max(3, metrics.icon * 0.055),
              borderRadius: metrics.icon * 0.03,
              left: metrics.icon * 0.22,
              top: metrics.icon * 0.28,
            },
          ]}
        />
        <View
          style={[
            styles.messageLine,
            {
              width: metrics.icon * 0.24,
              height: Math.max(3, metrics.icon * 0.055),
              borderRadius: metrics.icon * 0.03,
              left: metrics.icon * 0.22,
              top: metrics.icon * 0.4,
            },
          ]}
        />
      </View>

      <View style={styles.wordmarkColumn}>
        <Text
          style={[
            styles.wordmark,
            {
              fontSize: metrics.word,
              lineHeight: metrics.word * 1.05,
            },
          ]}
        >
          <Text style={styles.wordmarkLight}>Sty</Text>
          <Text style={styles.wordmarkAccent}>Lnk</Text>
        </Text>
        {showTagline && (
          <Text
            style={[
              styles.tagline,
              {
                fontSize: metrics.tagline,
                lineHeight: metrics.tagline * 1.4,
              },
            ]}
          >
            CONNECT IN STYLE
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  compactContainer: {
    justifyContent: "flex-start",
  },
  brandIcon: {
    position: "relative",
  },
  outerBubble: {
    backgroundColor: Colors.brandBlue,
    left: 0,
    position: "absolute",
    top: 0,
  },
  outerTail: {
    borderRightColor: "transparent",
    borderTopColor: Colors.brandBlue,
    height: 0,
    position: "absolute",
    width: 0,
  },
  innerBubble: {
    backgroundColor: Colors.brandTeal,
    position: "absolute",
  },
  innerTail: {
    borderLeftColor: "transparent",
    borderTopColor: Colors.brandTeal,
    height: 0,
    position: "absolute",
    width: 0,
  },
  messageLine: {
    backgroundColor: Colors.brandNavy,
    opacity: 0.42,
    position: "absolute",
  },
  wordmark: {
    fontWeight: "800",
  },
  wordmarkAccent: {
    color: Colors.brandCyan,
  },
  wordmarkColumn: {
    justifyContent: "center",
  },
  wordmarkLight: {
    color: Colors.white,
  },
  tagline: {
    color: Colors.brandPale,
    fontWeight: "500",
    letterSpacing: 2.2,
  },
});
