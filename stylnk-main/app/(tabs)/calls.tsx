import socket from "@/src/socket";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity
} from "react-native";
import {
    mediaDevices,
    RTCIceCandidate,
    RTCPeerConnection,
    RTCSessionDescription,
    RTCView,
} from "react-native-webrtc";

export default function CallScreen() {
  const router = useRouter();
  const { to, from, isCaller, isReceiver } = useLocalSearchParams();

  const [localStream, setLocalStream] = useState<any>(null);
  const [remoteStream, setRemoteStream] = useState<any>(null);
  const [callAccepted, setCallAccepted] = useState(false);

  const pc = useRef<RTCPeerConnection | null>(null);

  const configuration = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  };

  // ─────────────────────────────────────────────
  // 1. Get media (camera + mic)
  // ─────────────────────────────────────────────
  useEffect(() => {
    startLocalStream();
  }, []);

  const startLocalStream = async () => {
    const stream = await mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });

    setLocalStream(stream);
  };

  // ─────────────────────────────────────────────
  // 2. Create peer connection
  // ─────────────────────────────────────────────
  const createPeerConnection = () => {
    const connection = new RTCPeerConnection(configuration);

    connection.onaddstream = (event) => {
      setRemoteStream(event.stream);
    };

    connection.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("ice-candidate", {
          to: isCaller ? to : from,
          candidate: event.candidate,
        });
      }
    };

    if (localStream) {
      connection.addStream(localStream);
    }

    pc.current = connection;
  };

  // ─────────────────────────────────────────────
  // 3. Caller flow
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (isCaller && localStream) {
      createPeerConnection();

      const startCall = async () => {
        const offer = await pc.current!.createOffer();
        await pc.current!.setLocalDescription(offer);

        socket.emit("call-user", {
          to,
          offer,
        });
      };

      startCall();
    }
  }, [isCaller, localStream]);

  // ─────────────────────────────────────────────
  // 4. Receiver flow
  // ─────────────────────────────────────────────
  useEffect(() => {
    socket.on("incoming-call", async ({ from, offer }) => {
      createPeerConnection();

      await pc.current!.setRemoteDescription(new RTCSessionDescription(offer));

      const answer = await pc.current!.createAnswer();
      await pc.current!.setLocalDescription(answer);

      socket.emit("answer-call", {
        to: from,
        answer,
      });

      setCallAccepted(true);
    });

    socket.on("call-answered", async ({ answer }) => {
      await pc.current!.setRemoteDescription(new RTCSessionDescription(answer));
      setCallAccepted(true);
    });

    socket.on("ice-candidate", async ({ candidate }) => {
      try {
        await pc.current!.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.log("ICE error", e);
      }
    });

    socket.on("call-ended", () => {
      endCall();
    });

    return () => {
      socket.off("incoming-call");
      socket.off("call-answered");
      socket.off("ice-candidate");
      socket.off("call-ended");
    };
  }, []);

  // ─────────────────────────────────────────────
  // 5. End call
  // ─────────────────────────────────────────────
  const endCall = () => {
    if (pc.current) {
      pc.current.close();
      pc.current = null;
    }

    if (localStream) {
      localStream.getTracks().forEach((track: any) => track.stop());
    }

    socket.emit("end-call", {
      to: isCaller ? to : from,
    });

    router.back();
  };

  // ─────────────────────────────────────────────
  // UI
  // ─────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>
        {callAccepted ? "Connected" : "Calling..."}
      </Text>

      {/* Remote video */}
      {remoteStream && (
        <RTCView streamURL={remoteStream.toURL()} style={styles.remoteVideo} />
      )}

      {/* Local video */}
      {localStream && (
        <RTCView streamURL={localStream.toURL()} style={styles.localVideo} />
      )}

      <TouchableOpacity style={styles.endBtn} onPress={endCall}>
        <Text style={styles.endText}>End Call</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
    justifyContent: "center",
  },
  title: {
    color: "white",
    textAlign: "center",
    marginBottom: 10,
  },
  remoteVideo: {
    flex: 1,
  },
  localVideo: {
    width: 120,
    height: 180,
    position: "absolute",
    top: 40,
    right: 10,
  },
  endBtn: {
    backgroundColor: "red",
    padding: 16,
    borderRadius: 30,
    alignSelf: "center",
    marginBottom: 40,
  },
  endText: {
    color: "white",
    fontWeight: "bold",
  },
});
