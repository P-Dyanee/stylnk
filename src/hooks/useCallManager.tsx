import React, { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { webrtcService } from "../services/webrtc";
import IncomingCallModal from "../../components/IncomingCallModal";

interface CallerInfo {
  id: string;
  name: string;
  type: "audio" | "video";
}

export function useCallManager() {
  const router = useRouter();
  const [incomingCall, setIncomingCall] = useState<CallerInfo | null>(null);
  const [showIncomingModal, setShowIncomingModal] = useState(false);

  useEffect(() => {
    // Set up WebRTC event listeners
    const handleCallEvent = (event: any) => {
      switch (event.type) {
        case "incoming":
          // Show incoming call modal
          setIncomingCall({
            id: event.data.fromUserId,
            name: event.data.fromUserId, // TODO: Get user name from API
            type: "audio", // TODO: Get call type from event data
          });
          setShowIncomingModal(true);
          break;

        case "connected":
          // Navigate to call screen when call is connected
          if (incomingCall) {
            router.push({
              pathname: "/call/[id]",
              params: {
                id: incomingCall.id,
                name: incomingCall.name,
                type: incomingCall.type,
              },
            });
            setShowIncomingModal(false);
          }
          break;

        case "ended":
          // Hide modal and go back when call ends
          setShowIncomingModal(false);
          setIncomingCall(null);
          break;

        case "error":
          // Handle call errors
          setShowIncomingModal(false);
          setIncomingCall(null);
          break;
      }
    };

    webrtcService.addEventListener((event) => handleCallEvent(event));

    // Connect to socket when hook is mounted
    webrtcService.connect();

    return () => {
      webrtcService.removeEventListener((event) => handleCallEvent(event));
    };
  }, [router, incomingCall]);

  const handleAcceptCall = () => {
    // Call will be answered in the modal component
    // Navigation happens in the connected event
  };

  const handleRejectCall = () => {
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
