import { useAppTheme } from "@/src/theme/app-theme";
import { webrtcService } from "@/src/services/webrtc";
import { callApi } from "@/src/services/api";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Colors, BorderRadius, Spacing, Typography } from "@/constants/theme";

interface IncomingCallModalProps {
  visible: boolean;
  callerInfo: {
    id: string;
    name: string;
    type: "audio" | "video";
  } | null;
  onAccept: () => void;
  onReject: () => void;
}

export default function IncomingCallModal({
  visible,
  callerInfo,
  onAccept,
  onReject,
}: IncomingCallModalProps) {
  const { palette } = useAppTheme();
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    if (visible) {
      setIsConnecting(false);
    }
  }, [visible]);

  const handleAccept = async () => {
    if (!callerInfo) return;
    
    setIsConnecting(true);
    try {
      await webrtcService.answerCall();
      onAccept();
    } catch (error) {
      console.error("Failed to answer call:", error);
      setIsConnecting(false);
    }
  };

  const handleReject = () => {
    if (callerInfo) {
      // Log missed call
      callApi.logCall({
        recipientId: callerInfo.id,
        callType: callerInfo.type,
        status: "missed",
      }).catch(console.error);
      
      webrtcService.rejectCall();
    }
    onReject();
  };

  if (!callerInfo) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: palette.card }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.avatar, { backgroundColor: Colors.primary }]}>
              <Ionicons 
                name={callerInfo.type === "video" ? "videocam" : "call"} 
                size={32} 
                color={Colors.white} 
              />
            </View>
            <Text style={[styles.callerName, { color: palette.text }]}>
              {callerInfo.name}
            </Text>
            <Text style={[styles.callType, { color: palette.textSecondary }]}>
              {callerInfo.type === "video" ? "Video Call" : "Audio Call"}
            </Text>
          </View>

          {/* Animation */}
          <View style={styles.animationContainer}>
            <View style={[styles.ring, styles.ring1]} />
            <View style={[styles.ring, styles.ring2]} />
            <View style={[styles.ring, styles.ring3]} />
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={handleReject}
              disabled={isConnecting}
            >
              <Ionicons name="call" size={24} color={Colors.white} />
              <Text style={styles.actionText}>Decline</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.acceptButton]}
              onPress={handleAccept}
              disabled={isConnecting}
            >
              {isConnecting ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <Ionicons name="call" size={24} color={Colors.white} />
              )}
              <Text style={styles.actionText}>
                {isConnecting ? "Connecting..." : "Accept"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    width: "90%",
    maxWidth: 320,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: "center",
    elevation: 8,
  },
  header: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  callerName: {
    fontSize: Typography.fontSizes.xl,
    fontWeight: Typography.fontWeights.bold,
    marginBottom: Spacing.xs,
  },
  callType: {
    fontSize: Typography.fontSizes.sm,
  },
  animationContainer: {
    height: 120,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.xl,
    position: "relative",
  },
  ring: {
    position: "absolute",
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  ring1: {
    transform: [{ scale: 1 }],
  },
  ring2: {
    transform: [{ scale: 1.5 }],
  },
  ring3: {
    transform: [{ scale: 2 }],
  },
  actions: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "space-around",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    minWidth: 100,
    justifyContent: "center",
  },
  acceptButton: {
    backgroundColor: Colors.success,
  },
  rejectButton: {
    backgroundColor: Colors.danger,
  },
  actionText: {
    color: Colors.white,
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.medium,
    marginLeft: Spacing.sm,
  },
});
