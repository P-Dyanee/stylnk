import { realtimeClient } from "@/src/services/realtime";
import React from "react";
import {
  MediaStream,
  mediaDevices,
  RTCIceCandidate,
  RTCPeerConnection,
  RTCSessionDescription,
} from "react-native-webrtc";

export type UseCallWebRTCParams = {
  socketConnected: boolean;
  enabled: boolean;
  callId: string | null;
  peerUserId: number | null;
  myUserId: number | undefined;
  mode: "audio" | "video";
  direction: "incoming" | "outgoing";
};

export type UseCallWebRTCResult = {
  supported: boolean;
  localStreamUrl: string | null;
  remoteStreamUrl: string | null;
  cameraOn: boolean;
  micOn: boolean;
  setCameraOn: (on: boolean) => void;
  setMicOn: (on: boolean) => void;
};

type SessionInit = { sdp: string; type: string | null };

const ICE_SERVERS = [{ urls: "stun:stun.l.google.com:19302" }];

export function useCallWebRTC(params: UseCallWebRTCParams): UseCallWebRTCResult {
  const { socketConnected, enabled, callId, peerUserId, myUserId, mode, direction } = params;

  const [localStreamUrl, setLocalStreamUrl] = React.useState<string | null>(null);
  const [remoteStreamUrl, setRemoteStreamUrl] = React.useState<string | null>(null);
  const [cameraOn, setCameraOnState] = React.useState(true);
  const [micOn, setMicOnState] = React.useState(true);

  const pcRef = React.useRef<InstanceType<typeof RTCPeerConnection> | null>(null);
  const streamRef = React.useRef<InstanceType<typeof MediaStream> | null>(null);
  const iceQueueRef = React.useRef<unknown[]>([]);
  const pendingOfferRef = React.useRef<SessionInit | null>(null);
  const pendingAnswerRef = React.useRef<SessionInit | null>(null);

  const setCameraOn = React.useCallback((on: boolean) => {
    streamRef.current?.getVideoTracks().forEach((t) => {
      t.enabled = on;
    });
    setCameraOnState(on);
  }, []);

  const setMicOn = React.useCallback((on: boolean) => {
    streamRef.current?.getAudioTracks().forEach((t) => {
      t.enabled = on;
    });
    setMicOnState(on);
  }, []);

  React.useEffect(() => {
    const ready =
      enabled &&
      socketConnected &&
      Boolean(callId) &&
      peerUserId != null &&
      peerUserId > 0 &&
      myUserId != null &&
      myUserId > 0;

    if (!ready || !callId) {
      return undefined;
    }

    let cancelled = false;
    iceQueueRef.current = [];
    pendingOfferRef.current = null;
    pendingAnswerRef.current = null;

    const flushIce = async (pc: InstanceType<typeof RTCPeerConnection>) => {
      const queued = [...iceQueueRef.current];
      iceQueueRef.current = [];
      for (const payload of queued) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(payload as never));
        } catch {
          /* ignore stale / invalid candidates */
        }
      }
    };

    const processIncomingOffer = async (
      pc: InstanceType<typeof RTCPeerConnection>,
      desc: SessionInit,
    ) => {
      await pc.setRemoteDescription(new RTCSessionDescription(desc));
      await flushIce(pc);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      const payload = pc.localDescription?.toJSON() ?? { type: answer.type, sdp: answer.sdp };
      realtimeClient.emit("webrtc:answer", {
        callId,
        targetUserId: peerUserId,
        payload,
      });
    };

    const unsubIce = realtimeClient.on("webrtc:ice-candidate", async (p) => {
      if (cancelled || p.callId !== callId || p.fromUserId !== peerUserId) {
        return;
      }
      const pc = pcRef.current;
      if (!pc) {
        return;
      }
      const payload = p.payload;
      if (!pc.remoteDescription) {
        iceQueueRef.current.push(payload);
        return;
      }
      try {
        await pc.addIceCandidate(new RTCIceCandidate(payload as never));
      } catch {
        /* */
      }
    });

    const unsubOffer =
      direction === "incoming"
        ? realtimeClient.on("webrtc:offer", async (p) => {
            if (cancelled || p.callId !== callId || p.fromUserId !== peerUserId) {
              return;
            }
            const pc = pcRef.current;
            if (!pc) {
              return;
            }
            const desc = p.payload as SessionInit;
            if (!streamRef.current) {
              pendingOfferRef.current = desc;
              return;
            }
            try {
              await processIncomingOffer(pc, desc);
            } catch (e) {
              console.warn("[call-webrtc] offer failed", e);
            }
          })
        : () => undefined;

    const unsubAnswer =
      direction === "outgoing"
        ? realtimeClient.on("webrtc:answer", async (p) => {
            if (cancelled || p.callId !== callId || p.fromUserId !== peerUserId) {
              return;
            }
            const pc = pcRef.current;
            if (!pc) {
              return;
            }
            const desc = p.payload as SessionInit;
            if (!pc.localDescription) {
              pendingAnswerRef.current = desc;
              return;
            }
            try {
              await pc.setRemoteDescription(new RTCSessionDescription(desc));
              await flushIce(pc);
            } catch (e) {
              console.warn("[call-webrtc] answer failed", e);
            }
          })
        : () => undefined;

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pcRef.current = pc;

    pc.onicecandidate = (e) => {
      const c = e.candidate;
      if (c && !cancelled) {
        realtimeClient.emit("webrtc:ice-candidate", {
          callId,
          targetUserId: peerUserId,
          payload: c.toJSON(),
        });
      }
    };

    pc.ontrack = (e) => {
      const remote = e.streams[0];
      if (remote && !cancelled) {
        setRemoteStreamUrl(remote.toURL());
      }
    };

    void (async () => {
      try {
        const stream = await mediaDevices.getUserMedia({
          audio: true,
          video: mode === "video",
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        setLocalStreamUrl(stream.toURL());
        setCameraOnState(mode === "video");
        setMicOnState(true);

        stream.getTracks().forEach((t) => {
          pc.addTrack(t, stream);
        });

        if (direction === "incoming") {
          const pending = pendingOfferRef.current;
          pendingOfferRef.current = null;
          if (pending) {
            await processIncomingOffer(pc, pending);
          }
        } else {
          const offer = await pc.createOffer({});
          await pc.setLocalDescription(offer);
          const payload = pc.localDescription?.toJSON() ?? { type: offer.type, sdp: offer.sdp };
          realtimeClient.emit("webrtc:offer", {
            callId,
            targetUserId: peerUserId,
            payload,
          });
          const pendAns = pendingAnswerRef.current;
          pendingAnswerRef.current = null;
          if (pendAns) {
            await pc.setRemoteDescription(new RTCSessionDescription(pendAns));
            await flushIce(pc);
          }
        }
      } catch (e) {
        console.warn("[call-webrtc] setup failed", e);
      }
    })();

    return () => {
      cancelled = true;
      unsubIce();
      unsubOffer();
      unsubAnswer();
      pc.onicecandidate = null;
      pc.ontrack = null;
      try {
        pc.close();
      } catch {
        /* */
      }
      pcRef.current = null;
      const s = streamRef.current;
      streamRef.current = null;
      s?.getTracks().forEach((t) => t.stop());
      setLocalStreamUrl(null);
      setRemoteStreamUrl(null);
      iceQueueRef.current = [];
    };
  }, [enabled, socketConnected, callId, peerUserId, myUserId, mode, direction]);

  return {
    supported: true,
    localStreamUrl,
    remoteStreamUrl,
    cameraOn,
    micOn,
    setCameraOn,
    setMicOn,
  };
}
