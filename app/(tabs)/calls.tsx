import socket from "@/src/socket";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
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
  // `to` = userId of the person we're calling (caller side)
  // `from` = socketId of the person who called us (receiver side, set on incoming-call)
  const { to, isCaller } = useLocalSearchParams();

  const [localStream, setLocalStream] = useState<any>(null);
  const [remoteStream, setRemoteStream] = useState<any>(null);
  const [callAccepted, setCallAccepted] = useState(false);

  const pc = useRef<RTCPeerConnection | null>(null);
  // Store the remote socket ID so we can address back ICE candidates / end-call
  const remoteSocketId = useRef<string | null>(null);

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
    try {
      const stream = await mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      setLocalStream(stream);
    } catch (e) {
      console.error("Failed to get media:", e);
    }
  };

  // ─────────────────────────────────────────────
  // 2. Create peer connection
  // ─────────────────────────────────────────────
  const createPeerConnection = (stream: any) => {
    const connection = new RTCPeerConnection(configuration);

    // onaddstream is deprecated but still used in react-native-webrtc
    connection.onaddstream = (event: any) => {
      setRemoteStream(event.stream);
    };

    connection.onicecandidate = (event: any) => {
      if (event.candidate && remoteSocketId.current) {
        // FIX: backend expects `toSocketId`, not `to`
        socket.emit("ice-candidate", {
          toSocketId: remoteSocketId.current,
          candidate: event.candidate,
        });
      }
    };

    if (stream) {
      connection.addStream(stream);
    }

    pc.current = connection;
    return connection;
  };

  // ─────────────────────────────────────────────
  // 3. Caller flow — fires when localStream is ready
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (isCaller && localStream) {
      const connection = createPeerConnection(localStream);

      const startCall = async () => {
        const offer = await connection.createOffer();
        await connection.setLocalDescription(offer);

        // FIX: backend expects `toUserId`, not `to`
        socket.emit("call-user", {
          toUserId: to,
          offer,
        });
      };

      startCall();
    }
  }, [isCaller, localStream]);

  // ─────────────────────────────────────────────
  // 4. Socket event listeners
  // ─────────────────────────────────────────────
  useEffect(() => {
    // Receiver: gets an incoming call
    socket.on("incoming-call", async ({ fromUserId, offer }) => {
      // FIX: backend sends `fromUserId` (which is a socket ID), not `from`
      remoteSocketId.current = fromUserId;

      const connection = createPeerConnection(localStream);

      await connection.setRemoteDescription(new RTCSessionDescription(offer));

      const answer = await connection.createAnswer();
      await connection.setLocalDescription(answer);

      // FIX: backend expects `toSocketId`, not `to`
      socket.emit("answer-call", {
        toSocketId: fromUserId,
        answer,
      });

      setCallAccepted(true);
    });

    // Caller: receives the answer from the receiver
    socket.on("call-answered", async ({ answer }) => {
      await pc.current!.setRemoteDescription(new RTCSessionDescription(answer));
      setCallAccepted(true);
    });

    // Both sides: receive ICE candidates
    socket.on("ice-candidate", async ({ candidate }) => {
      try {
        await pc.current!.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.log("ICE error", e);
      }
    });

    // Both sides: other party ended the call
    socket.on("call-ended", () => {
      endCall(false); // false = don't emit end-call back (avoid loop)
    });

    return () => {
      socket.off("incoming-call");
      socket.off("call-answered");
      socket.off("ice-candidate");
      socket.off("call-ended");
    };
  }, [localStream]);

  // ─────────────────────────────────────────────
  // 5. End call
  // ─────────────────────────────────────────────
  const endCall = (emitToRemote = true) => {
    if (pc.current) {
      pc.current.close();
      pc.current = null;
    }

    if (localStream) {
      localStream.getTracks().forEach((track: any) => track.stop());
    }

    if (emitToRemote && remoteSocketId.current) {
      // FIX: backend expects `toSocketId`, not `to`
      socket.emit("end-call", {
        toSocketId: remoteSocketId.current,
      });
    }

    router.back();
  };

  // ─────────────────────────────────────────────
  // 6. Caller: store remote socket ID when call is answered
  //    The caller doesn't know the receiver's socket ID upfront —
  //    we store it when `call-answered` arrives via the socket id
  //    that the backend tracks. For the caller side, remoteSocketId
  //    must be set after the call is answered. We handle this by
  //    emitting `call-user` with toUserId and the backend internally
  //    knows the mapping. For ICE/end-call from caller side,
  //    we need the receiver's socket ID — add a `fromSocketId`
  //    field to `call-answered` in the backend (see note below).
  // ─────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>
        {callAccepted ? "Connected" : "Calling..."}
      </Text>

      {/* Remote video */}
      {remoteStream && (
        <RTCView streamURL={remoteStream.toURL()} style={styles.remoteVideo} objectFit="cover" />
      )}

      {/* Local video (picture-in-picture) */}
      {localStream && (
        <RTCView streamURL={localStream.toURL()} style={styles.localVideo} objectFit="cover" />
      )}

      <TouchableOpacity style={styles.endBtn} onPress={() => endCall()}>
        <Text style={styles.endText}>End Call</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

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
    fontSize: 18,
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
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "white",
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
    fontSize: 16,
  },
});
