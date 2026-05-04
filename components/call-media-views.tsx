import { type StyleProp, type ViewStyle } from "react-native";

/** Default (web): no native video views; Android/iOS use `call-media-views.native.tsx`. */
export function CallRemoteVideo(_props: { streamURL: string; style: StyleProp<ViewStyle> }) {
  return null;
}

export function CallLocalPip(_props: { streamURL: string; style: StyleProp<ViewStyle> }) {
  return null;
}
