"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { onValue, push, ref, remove, set, onChildAdded } from "firebase/database";
import { rtdb } from "@/lib/firebaseConfig";
import type { CallStatus, CallSignal } from "../types";

// Free STUN servers - TURN would need a paid service for production
const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
  ],
};

export function useVoiceCall(slotId: "1" | "2" | null, roomPath: string) {
  const [callStatus, setCallStatus] = useState<CallStatus>("idle");
  const [callerId, setCallerId] = useState<"1" | "2" | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [remoteAudioLevel, setRemoteAudioLevel] = useState(0);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const callStartTimeRef = useRef<number | null>(null);
  const durationIntervalRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const otherSlotId = slotId === "1" ? "2" : "1";

  // Clean up WebRTC resources
  const cleanup = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (durationIntervalRef.current) {
      window.clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    callStartTimeRef.current = null;
    setCallDuration(0);
    setRemoteAudioLevel(0);
  }, []);

  // Create peer connection with handlers
  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = (event) => {
      if (event.candidate && slotId) {
        const signalRef = ref(rtdb, `${roomPath}/callSignals`);
        push(signalRef, {
          from: slotId,
          to: otherSlotId,
          type: "candidate",
          candidate: event.candidate.toJSON(),
          timestamp: { ".sv": "timestamp" },
        } as CallSignal);
      }
    };

    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = remoteStream;
        remoteAudioRef.current.play().catch(() => {});

        // Set up audio level monitoring
        try {
          audioContextRef.current = new AudioContext();
          const source = audioContextRef.current.createMediaStreamSource(remoteStream);
          analyserRef.current = audioContextRef.current.createAnalyser();
          analyserRef.current.fftSize = 256;
          source.connect(analyserRef.current);

          const updateLevel = () => {
            if (!analyserRef.current) return;
            const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
            analyserRef.current.getByteFrequencyData(dataArray);
            const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
            setRemoteAudioLevel(Math.min(100, average * 1.5));
            animationFrameRef.current = requestAnimationFrame(updateLevel);
          };
          updateLevel();
        } catch {
          // Audio context not supported
        }
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        setCallStatus("connected");
        callStartTimeRef.current = Date.now();
        durationIntervalRef.current = window.setInterval(() => {
          if (callStartTimeRef.current) {
            setCallDuration(Math.floor((Date.now() - callStartTimeRef.current) / 1000));
          }
        }, 1000);
      } else if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
        // Clean up on disconnect/failure - don't call endCall to avoid circular dep
        cleanup();
        setCallStatus("idle");
        setCallerId(null);
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  }, [slotId, otherSlotId, cleanup, roomPath]);

  // Start an outgoing call
  const startCall = useCallback(async () => {
    if (!slotId || callStatus !== "idle") return;

    try {
      setCallStatus("calling");
      setCallerId(slotId);

      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;

      const pc = createPeerConnection();
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      // Create and send offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const signalRef = ref(rtdb, `${roomPath}/callSignals`);
      await push(signalRef, {
        from: slotId,
        to: otherSlotId,
        type: "offer",
        sdp: offer.sdp,
        timestamp: { ".sv": "timestamp" },
      } as CallSignal);

      // Set call state in Firebase
      await set(ref(rtdb, `${roomPath}/callState`), {
        status: "calling",
        callerId: slotId,
        startedAt: { ".sv": "timestamp" },
      });
    } catch (err) {
      console.error("Failed to start call:", err);
      cleanup();
      setCallStatus("idle");
      setCallerId(null);
    }
  }, [slotId, callStatus, otherSlotId, createPeerConnection, cleanup, roomPath]);

  // Answer an incoming call
  const answerCall = useCallback(async () => {
    if (!slotId || callStatus !== "ringing") return;

    try {
      setCallStatus("connecting");

      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;

      const pc = createPeerConnection();
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      // The offer should already be set as remote description from the signal listener
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      const signalRef = ref(rtdb, `${roomPath}/callSignals`);
      await push(signalRef, {
        from: slotId,
        to: otherSlotId,
        type: "answer",
        sdp: answer.sdp,
        timestamp: { ".sv": "timestamp" },
      } as CallSignal);

      await set(ref(rtdb, `${roomPath}/callState/status`), "connected");
    } catch (err) {
      console.error("Failed to answer call:", err);
      cleanup();
      setCallStatus("idle");
      setCallerId(null);
    }
  }, [slotId, callStatus, otherSlotId, createPeerConnection, cleanup, roomPath]);

  // End/decline call
  const endCall = useCallback(async () => {
    if (!slotId) return;

    try {
      const signalRef = ref(rtdb, `${roomPath}/callSignals`);
      await push(signalRef, {
        from: slotId,
        to: otherSlotId,
        type: "hangup",
        timestamp: { ".sv": "timestamp" },
      } as CallSignal);

      await remove(ref(rtdb, `${roomPath}/callState`));
      await remove(ref(rtdb, `${roomPath}/callSignals`));
    } catch {
      // Ignore cleanup errors
    }

    cleanup();
    setCallStatus("idle");
    setCallerId(null);
  }, [slotId, otherSlotId, cleanup, roomPath]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  }, []);

  // Listen for call state changes
  useEffect(() => {
    if (!slotId) return;

    const callStateRef = ref(rtdb, `${roomPath}/callState`);
    const unsubscribe = onValue(callStateRef, (snapshot) => {
      const state = snapshot.val();
      
      if (!state) {
        // Call ended by other party
        if (callStatus !== "idle") {
          cleanup();
          setCallStatus("idle");
          setCallerId(null);
        }
        return;
      }

      // Incoming call
      if (state.status === "calling" && state.callerId !== slotId && callStatus === "idle") {
        setCallStatus("ringing");
        setCallerId(state.callerId);
      }
    });

    return () => unsubscribe();
  }, [slotId, callStatus, cleanup, roomPath]);

  // Listen for signaling messages
  useEffect(() => {
    if (!slotId) return;

    const signalsRef = ref(rtdb, `${roomPath}/callSignals`);
    const unsubscribe = onChildAdded(signalsRef, async (snapshot) => {
      const signal = snapshot.val() as CallSignal;
      
      // Only process signals meant for us
      if (signal.to !== slotId) return;

      const pc = peerConnectionRef.current;

      try {
        switch (signal.type) {
          case "offer":
            if (!pc) {
              // Create peer connection for incoming call
              const newPc = createPeerConnection();
              await newPc.setRemoteDescription({ type: "offer", sdp: signal.sdp });
            } else {
              await pc.setRemoteDescription({ type: "offer", sdp: signal.sdp });
            }
            break;

          case "answer":
            if (pc && pc.signalingState === "have-local-offer") {
              await pc.setRemoteDescription({ type: "answer", sdp: signal.sdp });
            }
            break;

          case "candidate":
            if (pc && signal.candidate) {
              await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
            }
            break;

          case "hangup":
            cleanup();
            setCallStatus("idle");
            setCallerId(null);
            break;
        }
      } catch (err) {
        console.error("Signal handling error:", err);
      }
    });

    return () => unsubscribe();
  }, [slotId, createPeerConnection, cleanup, roomPath]);

  // Create audio element for remote stream
  useEffect(() => {
    const audio = document.createElement("audio");
    audio.autoplay = true;
    audio.setAttribute("playsinline", "true");
    remoteAudioRef.current = audio;

    return () => {
      audio.srcObject = null;
      audio.remove();
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    callStatus,
    callerId,
    isMuted,
    callDuration,
    remoteAudioLevel,
    startCall,
    answerCall,
    endCall,
    toggleMute,
  };
}
