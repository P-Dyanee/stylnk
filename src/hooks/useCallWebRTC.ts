import React from "react";

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

/** Default (web): native WebRTC is not loaded; Android/iOS use `useCallWebRTC.native.ts`. */
export function useCallWebRTC(_params: UseCallWebRTCParams): UseCallWebRTCResult {
  const noop = React.useCallback(() => {}, []);

  return {
    supported: false,
    localStreamUrl: null,
    remoteStreamUrl: null,
    cameraOn: false,
    micOn: true,
    setCameraOn: noop,
    setMicOn: noop,
  };
}
