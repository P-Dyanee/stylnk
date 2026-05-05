import { BorderRadius, Colors, Spacing, Typography } from "@/constants/theme";
import { callApi } from "@/src/services/api";
import {
  webrtcService,
  RTCView,
  type CallEvent,
  type CallStatus,
} from "@/src/services/webrtc";
import { useAppTheme } from "@/src/theme/app-theme";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function CallScreen() {
  const router = useRouter();
  const { palette } = useAppTheme();
  const { id, name, socketId, type = "audio", direction = "outgoing" } = useLocalSearchParams<{ 
    id: string; 
    name?: string; 
    socketId?: string;
    type?: "audio" | "video";
    direction?: "incoming" | "outgoing";
  }>();
  
  const [status, setStatus] = useState<CallStatus>(
    direction === "incoming" ? "connected" : "calling",
  );
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(type === "video");
  const [duration, setDuration] = useState(0);
  const [localStream, setLocalStream] = useState<any>(null);
  const [remoteStream, setRemoteStream] = useState<any>(null);
  const startTimeRef = useRef<number | null>(null);
  const intervalRef = useRef<any>(null);
  const loggedCallRef = useRef(false);

  useEffect(() => {
    const initializeCall = async () => {
      try {
        webrtcService.addEventListener(handleCallEvent);

        if (direction === "outgoing") {
          if (!socketId) {
            throw new Error("User is offline or missing a socket connection.");
          }
          await webrtcService.startCall({
            recipientId: id,
            toSocketId: socketId,
            name,
            type: type as "audio" | "video",
          });
        }

        const stream = webrtcService.getLocalStream();
        if (stream && (stream as any).toURL) {
          setLocalStream((stream as any).toURL());
        }

        const remote = webrtcService.getRemoteStream();
        if (remote && (remote as any).toURL) {
          setRemoteStream((remote as any).toURL());
        }
      } catch (error) {
        console.error("Failed to initialize call:", error);
        setStatus("failed");
        Alert.alert("Call Error", "Failed to start call. Please try again.");
      }
    };

    initializeCall();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      webrtcService.removeEventListener(handleCallEvent);
      webrtcService.endCall();
    };
  }, [direction, id, name, socketId, type]);

  useEffect(() => {
    if (status !== "connected") {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    if (!startTimeRef.current) {
      startTimeRef.current = Date.now();
    }

    intervalRef.current = setInterval(() => {
      if (!startTimeRef.current) return;
      setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [status]);

  const handleCallEvent = (event: CallEvent) => {
    switch (event.type) {
      case "status":
        setStatus(event.data.status);
        break;
      case "ringing":
        setStatus("ringing");
        break;
      case "connected":
        setStatus("connected");
        if (event.data?.localStream && (event.data.localStream as any).toURL) {
          setLocalStream((event.data.localStream as any).toURL());
        }
        if (event.data?.remoteStream && (event.data.remoteStream as any).toURL) {
          setRemoteStream((event.data.remoteStream as any).toURL());
        }
        break;
      case "remote-stream":
        if ((event.data.remoteStream as any).toURL) {
          setRemoteStream((event.data.remoteStream as any).toURL());
        }
        break;
      case "ended":
        logCallHistory();
        setStatus("ended");
        setTimeout(() => router.back(), 1000);
        break;
      case "error":
        setStatus("failed");
        Alert.alert("Call Error", "An error occurred during the call.");
        break;
    }
  };

  const toggleAudio = () => {
    const enabled = webrtcService.toggleAudio();
    setIsAudioEnabled(enabled);
  };

  const toggleVideo = () => {
    const enabled = webrtcService.toggleVideo();
    setIsVideoEnabled(enabled);
  };

  const logCallHistory = () => {
    if (loggedCallRef.current) return;
    loggedCallRef.current = true;

    callApi.logCall({
      recipientId: id,
      callType: type as "audio" | "video",
      status: direction === "incoming" ? "incoming" : "outgoing",
      duration: formatDuration(duration),
    }).catch(console.error);
  };

  const endCall = () => {
    logCallHistory();
    webrtcService.endCall();
    router.back();
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderVideoView = () => {
    if (type !== "video") return null;

    return (
      <View style={styles.videoContainer}>
        {/* Remote video (full screen) */}
        {remoteStream ? (
          <RTCView
            streamURL={remoteStream}
            style={styles.remoteVideo}
            objectFit="cover"
            mirror={false}
          />
        ) : (
          <View style={[styles.remoteVideo, styles.videoPlaceholder]}>
            <Text style={[styles.videoPlaceholderText, { color: palette.text }]}>
              {name || "Connecting..."}
            </Text>
          </View>
        )}

        {/* Local video (picture-in-picture) */}
        {localStream && (
          <View style={styles.localVideoContainer}>
            <RTCView
              streamURL={localStream}
              style={styles.localVideo}
              objectFit="cover"
              mirror={true}
            />
          </View>
        )}
      </View>
    );
  };

  const renderAudioView = () => {
    return (
      <View style={styles.audioContainer}>
        <View style={styles.avatarContainer}>
          <View style={[styles.avatar, { backgroundColor: Colors.primary }]}>
            <Text style={styles.avatarText}>
              {name?.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase() || "U"}
            </Text>
          </View>
        </View>
        
        <View style={styles.callInfo}>
          <Text style={[styles.callerName, { color: palette.text }]}>
            {name || "Unknown"}
          </Text>
          <Text style={[styles.callStatus, { color: palette.textSecondary }]}>
            {status === "calling" && "Calling..."}
            {status === "ringing" && "Ringing..."}
            {status === "connected" && formatDuration(duration)}
            {status === "ended" && "Call ended"}
            {status === "failed" && "Call failed"}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      {/* Main content */}
      {type === "video" ? renderVideoView() : renderAudioView()}

      {/* Controls */}
      <View style={[styles.controls, { backgroundColor: palette.background }]}>
        <View style={styles.controlRow}>
          {/* Audio toggle */}
          <TouchableOpacity
            style={[
              styles.controlButton,
              { backgroundColor: isAudioEnabled ? Colors.primary : palette.surface }
            ]}
            onPress={toggleAudio}
          >
            <Ionicons
              name={isAudioEnabled ? "mic" : "mic-off"}
              size={24}
              color={isAudioEnabled ? Colors.white : palette.text}
            />
          </TouchableOpacity>

          {/* Video toggle (only for video calls) */}
          {type === "video" && (
            <TouchableOpacity
              style={[
                styles.controlButton,
                { backgroundColor: isVideoEnabled ? Colors.primary : palette.surface }
              ]}
              onPress={toggleVideo}
            >
              <Ionicons
                name={isVideoEnabled ? "videocam" : "videocam-off"}
                size={24}
                color={isVideoEnabled ? Colors.white : palette.text}
              />
            </TouchableOpacity>
          )}

          {/* End call */}
          <TouchableOpacity
            style={[styles.endCallButton, { backgroundColor: Colors.danger }]}
            onPress={endCall}
          >
            <Ionicons name="call" size={24} color={Colors.white} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Loading overlay */}
      {(status === "calling" || status === "ringing") && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={[styles.loadingText, { color: palette.text }]}>
            {status === "calling" ? "Calling..." : "Ringing..."}
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  videoContainer: {
    flex: 1,
    position: "relative",
  },
  remoteVideo: {
    flex: 1,
  },
  videoPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1a1a1a",
  },
  videoPlaceholderText: {
    fontSize: 24,
    fontWeight: "600",
  },
  localVideoContainer: {
    position: "absolute",
    top: Spacing.lg,
    right: Spacing.lg,
    width: 120,
    height: 160,
    borderRadius: BorderRadius.md,
    overflow: "hidden",
    elevation: 4,
  },
  localVideo: {
    flex: 1,
  },
  audioContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarContainer: {
    marginBottom: Spacing.xxxl,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: Colors.white,
    fontSize: 36,
    fontWeight: "bold",
  },
  callInfo: {
    alignItems: "center",
  },
  callerName: {
    fontSize: Typography.fontSizes.xxl,
    fontWeight: Typography.fontWeights.bold,
    marginBottom: Spacing.sm,
  },
  callStatus: {
    fontSize: Typography.fontSizes.md,
  },
  controls: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: "#333",
  },
  controlRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.full,
    justifyContent: "center",
    alignItems: "center",
  },
  endCallButton: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.full,
    justifyContent: "center",
    alignItems: "center",
    transform: [{ rotate: "135deg" }],
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: Typography.fontSizes.md,
  },
});
