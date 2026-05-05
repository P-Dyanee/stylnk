import socket from "../socket";
import { authStorage } from "./api";

// WebRTC imports with web compatibility
let RTCPeerConnection: any;
let RTCIceCandidate: any;
let RTCSessionDescription: any;
let mediaDevices: any;
let MediaStream: any;
export let RTCView: any;

try {
  const webrtc = require("react-native-webrtc");
  RTCPeerConnection = webrtc.RTCPeerConnection;
  RTCIceCandidate = webrtc.RTCIceCandidate;
  RTCSessionDescription = webrtc.RTCSessionDescription;
  mediaDevices = webrtc.mediaDevices;
  MediaStream = webrtc.MediaStream;
  RTCView = webrtc.RTCView;
} catch (error) {
  console.warn("WebRTC not available on this platform");
  // Mock implementations for web/non-native platforms
  RTCPeerConnection = class {
    createOffer() { return Promise.resolve({}); }
    createAnswer() { return Promise.resolve({}); }
    setLocalDescription() { return Promise.resolve(); }
    setRemoteDescription() { return Promise.resolve(); }
    addTrack() {}
    onicecandidate = null;
    ontrack = null;
    close() {}
  };
  RTCIceCandidate = class {};
  RTCSessionDescription = class {};
  mediaDevices = { 
    getUserMedia: () => Promise.resolve({
      getTracks: () => [],
      toURL: () => ""
    } as any)
  };
  MediaStream = class {
    toURL() { return ""; }
    getTracks() { return []; }
  };
  RTCView = (props: any) => {
    const React = require('react');
    const { View, Text } = require('react-native');
    return React.createElement(
      View,
      { ...props, style: [props.style, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#333' }] },
      React.createElement(Text, { style: { color: 'white' } }, 'WebRTC not supported')
    );
  };
}

type CallType = "audio" | "video";
type CallStatus = "idle" | "calling" | "connected" | "incoming";

export interface CallEvent {
  type: "incoming" | "outgoing" | "connected" | "ended" | "error";
  data?: any;
}

class WebRTCService {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private currentCallId: string | null = null;
  private remoteUserId: string | null = null;
  private callType: CallType = "audio";
  private status: CallStatus = "idle";
  private eventListeners: ((event: CallEvent) => void)[] = [];

  private configuration = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
    ],
  };

  constructor() {
    this.setupSocketListeners();
  }

  // Event handling
  addEventListener(listener: (event: CallEvent) => void) {
    this.eventListeners.push(listener);
  }

  removeEventListener(listener: (event: CallEvent) => void) {
    this.eventListeners = this.eventListeners.filter(l => l !== listener);
  }

  private emit(event: CallEvent) {
    this.eventListeners.forEach(listener => listener(event));
  }

  // Socket.io event handlers
  private setupSocketListeners() {
    socket.on("incoming-call", this.handleIncomingCall.bind(this));
    socket.on("call-answered", this.handleCallAnswered.bind(this));
    socket.on("ice-candidate", this.handleIceCandidate.bind(this));
    socket.on("call-ended", this.handleCallEnded.bind(this));
  }

  // Initialize peer connection
  private async initializePeerConnection(): Promise<RTCPeerConnection> {
    const pc = new RTCPeerConnection(this.configuration);

    // Handle ICE candidates using the correct API for newer react-native-webrtc
    (pc as any).onicecandidate = (event: any) => {
      if (event.candidate && this.remoteUserId) {
        socket.emit("ice-candidate", {
          toSocketId: this.remoteUserId,
          candidate: event.candidate,
        });
      }
    };

    // Handle remote stream using the correct API
    (pc as any).ontrack = (event: any) => {
      if (event.streams && event.streams[0]) {
        this.remoteStream = event.streams[0];
        this.emit({ type: "connected", data: { remoteStream: event.streams[0] } });
      }
    };

    return pc;
  }

  // Get local media stream
  private async acquireLocalStream(type: CallType): Promise<MediaStream> {
    const constraints = {
      audio: true,
      video: type === "video",
    };

    try {
      return await mediaDevices.getUserMedia(constraints);
    } catch (error) {
      console.error("Error getting media stream:", error);
      throw new Error("Failed to access camera/microphone");
    }
  }

  // Start an outgoing call
  async startCall(userId: string, type: CallType = "audio"): Promise<void> {
    try {
      this.callType = type;
      this.remoteUserId = userId;
      this.status = "calling";

      // Get local stream
      this.localStream = await this.acquireLocalStream(type);

      // Initialize peer connection
      this.peerConnection = await this.initializePeerConnection();
      this.localStream.getTracks().forEach(track => {
        this.peerConnection!.addTrack(track, this.localStream!);
      });

      // Create offer
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);

      // Send call request
      socket.emit("call-user", {
        toUserId: userId,
        offer,
      });

      this.emit({ type: "outgoing", data: { userId, type } });

    } catch (error) {
      console.error("Error starting call:", error);
      this.cleanup();
      this.emit({ type: "error", data: error });
    }
  }

  // Handle incoming call
  private async handleIncomingCall(data: { fromUserId: string; offer: RTCSessionDescription }) {
    try {
      this.remoteUserId = data.fromUserId;
      this.status = "incoming";

      // Get local stream
      this.localStream = await this.acquireLocalStream(this.callType);

      // Initialize peer connection
      this.peerConnection = await this.initializePeerConnection();
      this.localStream.getTracks().forEach(track => {
        this.peerConnection!.addTrack(track, this.localStream!);
      });

      // Set remote description
      await this.peerConnection.setRemoteDescription(data.offer);

      this.emit({ type: "incoming", data: { fromUserId: data.fromUserId } });

    } catch (error) {
      console.error("Error handling incoming call:", error);
      this.cleanup();
      this.emit({ type: "error", data: error });
    }
  }

  // Answer an incoming call
  async answerCall(): Promise<void> {
    if (!this.peerConnection || this.status !== "incoming") {
      throw new Error("No incoming call to answer");
    }

    try {
      // Create answer
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);

      // Send answer
      socket.emit("answer-call", {
        toSocketId: this.remoteUserId,
        answer,
      });

      this.status = "connected";
      this.emit({ type: "connected" });

    } catch (error) {
      console.error("Error answering call:", error);
      this.cleanup();
      this.emit({ type: "error", data: error });
    }
  }

  // Handle call answered
  private async handleCallAnswered(data: { answer: RTCSessionDescription }) {
    if (!this.peerConnection) return;

    try {
      await this.peerConnection.setRemoteDescription(data.answer);
      this.status = "connected";
      this.emit({ type: "connected" });

    } catch (error) {
      console.error("Error handling call answered:", error);
      this.cleanup();
      this.emit({ type: "error", data: error });
    }
  }

  // Handle ICE candidate
  private async handleIceCandidate(data: { candidate: RTCIceCandidate }) {
    if (!this.peerConnection) return;

    try {
      await this.peerConnection.addIceCandidate(data.candidate);
    } catch (error) {
      console.error("Error adding ICE candidate:", error);
    }
  }

  // Handle call ended
  private handleCallEnded() {
    this.cleanup();
    this.emit({ type: "ended" });
  }

  // End current call
  endCall(): void {
    if (this.remoteUserId) {
      socket.emit("end-call", { toSocketId: this.remoteUserId });
    }
    this.cleanup();
    this.emit({ type: "ended" });
  }

  // Reject incoming call
  rejectCall(): void {
    if (this.remoteUserId) {
      socket.emit("end-call", { toSocketId: this.remoteUserId });
    }
    this.cleanup();
    this.emit({ type: "ended" });
  }

  // Toggle audio
  toggleAudio(): boolean {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        return audioTrack.enabled;
      }
    }
    return false;
  }

  // Toggle video
  toggleVideo(): boolean {
    if (this.localStream && this.callType === "video") {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        return videoTrack.enabled;
      }
    }
    return false;
  }

  // Get current status
  getStatus(): CallStatus {
    return this.status;
  }

  // Get streams - make this public
  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }

  // Cleanup resources
  private cleanup(): void {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    this.remoteStream = null;
    this.currentCallId = null;
    this.remoteUserId = null;
    this.status = "idle";
  }

  // Connect socket when user is authenticated
  async connect(): Promise<void> {
    const userId = await authStorage.getCurrentUserId();
    if (userId) {
      socket.connect();
      socket.emit("register", userId);
    }
  }

  // Disconnect socket
  disconnect(): void {
    this.cleanup();
    socket.disconnect();
  }
}

export const webrtcService = new WebRTCService();
export default webrtcService;
