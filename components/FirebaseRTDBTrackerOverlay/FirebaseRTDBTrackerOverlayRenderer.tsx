"use client";

// Side-effect import — patches WebSocket BEFORE Firebase modules load
import "./lib/tracker";
import { FirebaseRTDBTrackerOverlay } from ".";

export default function FirebaseRTDBTrackerOverlayRenderer() {
  return <FirebaseRTDBTrackerOverlay />;
}
