import socket from "../socket";
import { authStorage } from "./api";

let RTCPeerConnectionImpl: any;
let RTCIceCandidateImpl: any;
let RTCSessionDescriptionImpl: any;
let mediaDevicesImpl: any;
export let RTCView: any;

try {
  const webrtc = require("react-native-webrtc");
  RTCPeerConnectionImpl = webrtc.RTCPeerConnection;
  RTCIceCandidateImpl = webrtc.RTCIceCandidate;
  RTCSessionDescriptionImpl = webrtc.RTCSessionDescription;
  mediaDevicesImpl = webrtc.mediaDevices;
  RTCView = webrtc.RTCView;
} catch {
  RTCPeerConnectionImpl = class {
    localDescription: any = null;
    remoteDescription: any = null;
    onicecandidate = null;
    ontrack = null;
    createOffer() {
      return Promise.resolve({});
    }
    createAnswer() {
      return Promise.resolve({});
    }
    setLocalDescription(description: unknown) {
      this.localDescription = description;
      return Promise.resolve();
    }
    setRemoteDescription(description: unknown) {
      this.remoteDescription = description;
      return Promise.resolve();
    }
    addTrack() {}
    addIceCandidate() {
      return Promise.resolve();
    }
    close() {}
  };
  RTCIceCandidateImpl = class {
    candidate: unknown;
    constructor(candidate: unknown) {
      this.candidate = candidate;
    }
  };
  RTCSessionDescriptionImpl = class {
    description: unknown;
    constructor(description: unknown) {
      this.description = description;
    }
  };
  mediaDevicesImpl = {
    getUserMedia: () =>
      Promise.resolve({
        getTracks: () => [],
        getAudioTracks: () => [],
        getVideoTracks: () => [],
        toURL: () => "",
      }),
  };
  const MockRTCView = (props: any) => {
    const React = require("react");
    const { Text, View } = require("react-native");
    return React.createElement(
      View,
      {
        ...props,
        style: [
          props.style,
          {
            alignItems: "center",
            backgroundColor: "#333",
            justifyContent: "center",
          },
        ],
      },
      React.createElement(Text, { style: { color: "white" } }, "WebRTC not supported"),
    );
  };
  MockRTCView.displayName = "MockRTCView";
  RTCView = MockRTCView;
}

type CallType = "audio" | "video";
export type CallStatus = "idle" | "calling" | "ringing" | "connected" | "ended" | "failed";

type IncomingCallPayload = {
  callId: string;
  fromSocketId: string;
  fromUserId: string | null;
  fromName?: string;
  callType: CallType;
  offer: unknown;
};

type StartCallInput = {
  toSocketId: string;
  recipientId: string;
  name?: string;
  type?: CallType;
};

export type CallEvent =
  | { type: "incoming"; data: IncomingCallPayload }
  | { type: "ringing"; data: { callId: string; toSocketId: string } }
  | { type: "connected"; data?: { localStream?: any; remoteStream?: any } }
  | { type: "remote-stream"; data: { remoteStream: any } }
  | { type: "ended"; data?: { reason?: string } }
  | { type: "error"; data: unknown }
  | { type: "status"; data: { status: CallStatus } };

const optionalTurnServer = () => {
  const urls = process.env.EXPO_PUBLIC_TURN_URL;
  if (!urls) return null;

  return {
    urls,
    username: process.env.EXPO_PUBLIC_TURN_USERNAME,
    credential: process.env.EXPO_PUBLIC_TURN_CREDENTIAL,
  };
};

class WebRTCService {
  private peerConnection: any = null;
  private localStream: any = null;
  private remoteStream: any = null;
  private pendingOffer: unknown = null;
  private queuedIceCandidates: unknown[] = [];
  private callId: string | null = null;
  private remoteSocketId: string | null = null;
  private remoteUserId: string | null = null;
  private remoteName: string | null = null;
  private callType: CallType = "audio";
  private status: CallStatus = "idle";
  private eventListeners: Set<(event: CallEvent) => void> = new Set();
  private cleanedUp = true;

  private readonly configuration = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      ...(optionalTurnServer() ? [optionalTurnServer()] : []),
    ].filter(Boolean),
  };

  constructor() {
    this.setupSocketListeners();
  }

  addEventListener(listener: (event: CallEvent) => void) {
    this.eventListeners.add(listener);
  }

  removeEventListener(listener: (event: CallEvent) => void) {
    this.eventListeners.delete(listener);
  }

  private emit(event: CallEvent) {
    this.eventListeners.forEach((listener) => listener(event));
  }

  private setStatus(status: CallStatus) {
    this.status = status;
    this.emit({ type: "status", data: { status } });
  }

  private setupSocketListeners() {
    socket.on("incoming-call", this.handleIncomingCall);
    socket.on("call-ringing", this.handleCallRinging);
    socket.on("call-answered", this.handleCallAnswered);
    socket.on("ice-candidate", this.handleIceCandidate);
    socket.on("call-ended", this.handleCallEnded);
    socket.on("call-unavailable", this.handleCallUnavailable);
  }

  private handleIncomingCall = (data: IncomingCallPayload) => {
    this.cleanup({ notifyRemote: false, emitEnded: false });
    this.callId = data.callId;
    this.remoteSocketId = data.fromSocketId;
    this.remoteUserId = data.fromUserId;
    this.remoteName = data.fromName ?? "Unknown caller";
    this.callType = data.callType;
    this.pendingOffer = data.offer;
    this.cleanedUp = false;
    this.setStatus("ringing");
    this.emit({ type: "incoming", data });
  };

  private handleCallRinging = (data: { callId: string; toSocketId: string }) => {
    this.callId = data.callId;
    this.remoteSocketId = data.toSocketId;
    this.setStatus("ringing");
    this.emit({ type: "ringing", data });
  };

  private handleCallAnswered = async (data: {
    callId: string;
    fromSocketId: string;
    answer: unknown;
  }) => {
    if (!this.peerConnection || (this.callId && data.callId !== this.callId)) return;

    try {
      this.remoteSocketId = data.fromSocketId;
      await this.peerConnection.setRemoteDescription(
        new RTCSessionDescriptionImpl(data.answer),
      );
      await this.flushIceCandidates();
      this.setStatus("connected");
      this.emit({
        type: "connected",
        data: { localStream: this.localStream, remoteStream: this.remoteStream },
      });
    } catch (error) {
      this.fail(error);
    }
  };

  private handleIceCandidate = async (data: {
    callId: string;
    candidate: unknown;
  }) => {
    if (this.callId && data.callId && data.callId !== this.callId) return;

    if (!this.peerConnection || !this.peerConnection.remoteDescription) {
      this.queuedIceCandidates.push(data.candidate);
      return;
    }

    try {
      await this.peerConnection.addIceCandidate(
        new RTCIceCandidateImpl(data.candidate),
      );
    } catch (error) {
      console.warn("Failed to add ICE candidate", error);
    }
  };

  private handleCallEnded = (data?: { callId?: string; reason?: string }) => {
    if (this.callId && data?.callId && data.callId !== this.callId) return;
    this.cleanup({ notifyRemote: false, reason: data?.reason });
  };

  private handleCallUnavailable = (data: unknown) => {
    this.fail(data);
  };

  private async initializePeerConnection() {
    const pc = new RTCPeerConnectionImpl(this.configuration);

    pc.onicecandidate = (event: any) => {
      if (event.candidate && this.callId && this.remoteSocketId) {
        socket.emit("ice-candidate", {
          callId: this.callId,
          toSocketId: this.remoteSocketId,
          candidate: event.candidate.toJSON?.() ?? event.candidate,
        });
      }
    };

    pc.ontrack = (event: any) => {
      const stream = event.streams?.[0];
      if (!stream) return;
      this.remoteStream = stream;
      this.emit({ type: "remote-stream", data: { remoteStream: stream } });
    };

    this.peerConnection = pc;
    return pc;
  }

  private async acquireLocalStream(type: CallType) {
    return mediaDevicesImpl.getUserMedia({
      audio: true,
      video: type === "video",
    });
  }

  private addLocalTracks() {
    if (!this.peerConnection || !this.localStream) return;
    this.localStream.getTracks().forEach((track: any) => {
      this.peerConnection.addTrack(track, this.localStream);
    });
  }

  private async flushIceCandidates() {
    if (!this.peerConnection || !this.peerConnection.remoteDescription) return;
    const queued = [...this.queuedIceCandidates];
    this.queuedIceCandidates = [];
    for (const candidate of queued) {
      try {
        await this.peerConnection.addIceCandidate(
          new RTCIceCandidateImpl(candidate),
        );
      } catch (error) {
        console.warn("Failed to flush ICE candidate", error);
      }
    }
  }

  async startCall(input: StartCallInput): Promise<void> {
    try {
      this.cleanup({ notifyRemote: false, emitEnded: false });
      this.cleanedUp = false;
      this.remoteSocketId = input.toSocketId;
      this.remoteUserId = input.recipientId;
      this.remoteName = input.name ?? null;
      this.callType = input.type ?? "audio";
      this.setStatus("calling");

      this.localStream = await this.acquireLocalStream(this.callType);
      const pc = await this.initializePeerConnection();
      this.addLocalTracks();

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit("call-user", {
        toSocketId: input.toSocketId,
        callType: this.callType,
        offer: pc.localDescription?.toJSON?.() ?? offer,
      });
    } catch (error) {
      this.fail(error);
    }
  }

  async answerCall(): Promise<void> {
    if (!this.pendingOffer || !this.remoteSocketId || !this.callId) {
      throw new Error("No incoming call to answer");
    }

    try {
      this.localStream = await this.acquireLocalStream(this.callType);
      const pc = await this.initializePeerConnection();
      this.addLocalTracks();

      await pc.setRemoteDescription(new RTCSessionDescriptionImpl(this.pendingOffer));
      this.pendingOffer = null;
      await this.flushIceCandidates();

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit("answer-call", {
        callId: this.callId,
        toSocketId: this.remoteSocketId,
        answer: pc.localDescription?.toJSON?.() ?? answer,
      });

      this.setStatus("connected");
      this.emit({
        type: "connected",
        data: { localStream: this.localStream, remoteStream: this.remoteStream },
      });
    } catch (error) {
      this.fail(error);
    }
  }

  rejectCall(): void {
    this.cleanup({ reason: "rejected" });
  }

  endCall(): void {
    this.cleanup({ reason: "ended" });
  }

  toggleAudio(): boolean {
    const audioTrack = this.localStream?.getAudioTracks?.()[0];
    if (!audioTrack) return false;
    audioTrack.enabled = !audioTrack.enabled;
    return audioTrack.enabled;
  }

  toggleVideo(): boolean {
    const videoTrack = this.localStream?.getVideoTracks?.()[0];
    if (!videoTrack) return false;
    videoTrack.enabled = !videoTrack.enabled;
    return videoTrack.enabled;
  }

  getStatus(): CallStatus {
    return this.status;
  }

  getCallType(): CallType {
    return this.callType;
  }

  getRemoteUserId(): string | null {
    return this.remoteUserId;
  }

  getRemoteName(): string | null {
    return this.remoteName;
  }

  getLocalStream() {
    return this.localStream;
  }

  getRemoteStream() {
    return this.remoteStream;
  }

  private fail(error: unknown) {
    this.setStatus("failed");
    this.emit({ type: "error", data: error });
    this.cleanup({ notifyRemote: true, reason: "failed", emitEnded: false });
  }

  private cleanup(options?: {
    notifyRemote?: boolean;
    reason?: string;
    emitEnded?: boolean;
  }): void {
    const notifyRemote = options?.notifyRemote ?? true;
    const emitEnded = options?.emitEnded ?? true;
    const reason = options?.reason ?? "ended";
    const shouldNotify = notifyRemote && !this.cleanedUp && this.remoteSocketId;

    if (shouldNotify) {
      socket.emit("end-call", {
        callId: this.callId,
        toSocketId: this.remoteSocketId,
        reason,
      });
    }

    this.localStream?.getTracks?.().forEach((track: any) => track.stop());
    this.localStream = null;
    this.remoteStream = null;
    this.pendingOffer = null;
    this.queuedIceCandidates = [];

    if (this.peerConnection) {
      this.peerConnection.onicecandidate = null;
      this.peerConnection.ontrack = null;
      this.peerConnection.close();
      this.peerConnection = null;
    }

    this.callId = null;
    this.remoteSocketId = null;
    this.remoteUserId = null;
    this.remoteName = null;
    this.cleanedUp = true;

    if (emitEnded) {
      this.setStatus("ended");
      this.emit({ type: "ended", data: { reason } });
    }
    this.status = "idle";
  }

  async connect(): Promise<void> {
    const userId = await authStorage.getCurrentUserId();
    if (userId) {
      if (!socket.connected) socket.connect();
      socket.emit("register", userId);
    }
  }

  disconnect(): void {
    this.cleanup({ reason: "disconnect" });
    socket.disconnect();
  }
}

export const webrtcService = new WebRTCService();
export default webrtcService;
