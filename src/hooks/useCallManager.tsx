import React, { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { webrtcService, type CallEvent } from "../services/webrtc";
import IncomingCallModal from "../../components/IncomingCallModal";

interface CallerInfo {
  id: string;
  socketId: string;
  name: string;
  type: "audio" | "video";
}

export function useCallManager() {
  const router = useRouter();
  const [incomingCall, setIncomingCall] = useState<CallerInfo | null>(null);
  const [showIncomingModal, setShowIncomingModal] = useState(false);

  useEffect(() => {
    const handleCallEvent = (event: CallEvent) => {
      switch (event.type) {
        case "incoming":
          setIncomingCall({
            id: event.data.fromUserId ?? event.data.fromSocketId,
            socketId: event.data.fromSocketId,
            name: event.data.fromName ?? "Unknown caller",
            type: event.data.callType,
          });
          setShowIncomingModal(true);
          break;

        case "connected":
          setIncomingCall((currentIncomingCall) => {
            if (currentIncomingCall) {
              router.push({
                pathname: "/call/[id]",
                params: {
                  id: currentIncomingCall.id,
                  socketId: currentIncomingCall.socketId,
                  name: currentIncomingCall.name,
                  type: currentIncomingCall.type,
                  direction: "incoming",
                },
              });
            }
            return null;
          });
          setShowIncomingModal(false);
          break;

        case "ended":
        case "error":
          setShowIncomingModal(false);
          setIncomingCall(null);
          break;
      }
    };

    webrtcService.addEventListener(handleCallEvent);
    webrtcService.connect();

    return () => {
      webrtcService.removeEventListener(handleCallEvent);
    };
  }, [router]);

  const handleAcceptCall = async () => {
    try {
      await webrtcService.answerCall();
    } catch {
      setShowIncomingModal(false);
      setIncomingCall(null);
    }
  };

  const handleRejectCall = () => {
    webrtcService.rejectCall();
    setShowIncomingModal(false);
    setIncomingCall(null);
  };

  const IncomingCallModalComponent = () => {
    return (
      <IncomingCallModal
        visible={showIncomingModal}
        callerInfo={incomingCall}
        onAccept={handleAcceptCall}
        onReject={handleRejectCall}
      />
    );
  };

  return {
    IncomingCallModalComponent,
    incomingCall,
    showIncomingModal,
  };
}
