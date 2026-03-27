"use client";

// Side-effect import — patches WebSocket BEFORE Firebase modules load
import "./lib/tracker";
import { FirebaseRTDBTrackerOverlay } from ".";

interface Props {
  disabled?: boolean;
}

export default function FirebaseRTDBTrackerOverlayRenderer({
  disabled = false,
}: Props) {
  if (disabled) return null;

  return <FirebaseRTDBTrackerOverlay />;
}
