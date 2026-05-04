import React from "react";
import { type StyleProp, type ViewStyle } from "react-native";
import { RTCView } from "react-native-webrtc";

export function CallRemoteVideo({ streamURL, style }: { streamURL: string; style: StyleProp<ViewStyle> }) {
  return <RTCView streamURL={streamURL} style={style} objectFit="cover" zOrder={0} />;
}

export function CallLocalPip({ streamURL, style }: { streamURL: string; style: StyleProp<ViewStyle> }) {
  return <RTCView streamURL={streamURL} style={style} objectFit="cover" mirror zOrder={1} />;
}
