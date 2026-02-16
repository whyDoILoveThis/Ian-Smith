"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  onValue,
  push,
  ref,
  remove,
  set,
  onChildAdded,
} from "firebase/database";
import { rtdb } from "@/lib/firebaseConfig";
import type { CallStatus, CallSignal, CallError, CallErrorCode, CallDebugState, CallDebugEvent } from "../types";

// ICE servers – multiple STUN endpoints for reliability.
// For calls across strict mobile-carrier NATs you may need a TURN server.
const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
  ],
  iceCandidatePoolSize: 10,
};

// Connection timeout (30 seconds)
const CONNECTION_TIMEOUT_MS = 30000;

// Maximum debug events to keep in memory
const MAX_DEBUG_EVENTS = 50;

// Create initial debug state
const createInitialDebugState = (): CallDebugState => ({
  signalingState: null,
  iceConnectionState: null,
  iceGatheringState: null,
  connectionState: null,
  localCandidatesCount: 0,
  remoteCandidatesCount: 0,
  pendingCandidatesCount: 0,
  localTracksCount: 0,
  remoteTracksCount: 0,
  hasLocalStream: false,
  hasRemoteStream: false,
  localAudioEnabled: false,
  remoteAudioPlaying: false,
  signalsReceived: 0,
  signalsSent: 0,
  lastSignalType: null,
  lastSignalTime: null,
  eventLog: [],
});

export function useVoiceCall(slotId: "1" | "2" | null, roomPath: string) {
  const [callStatus, setCallStatus] = useState<CallStatus>("idle");
  const [callerId, setCallerId] = useState<"1" | "2" | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [remoteAudioLevel, setRemoteAudioLevel] = useState(0);
  
  // New: Error and debug state
  const [callError, setCallError] = useState<CallError | null>(null);
  const [debugState, setDebugState] = useState<CallDebugState>(createInitialDebugState);
  const [showDebugPanel, setShowDebugPanel] = useState(false);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const callStartTimeRef = useRef<number | null>(null);
  const durationIntervalRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  // New: Connection timeout ref
  const connectionTimeoutRef = useRef<number | null>(null);
  // New: Signal counters for debug state
  const signalCountersRef = useRef({ sent: 0, received: 0 });

  // Queue ICE candidates that arrive before remote description is set
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  // Track which Firebase signal keys we already processed (onChildAdded replays)
  const processedSignalsRef = useRef<Set<string>>(new Set());
  // Use a ref for callStatus so listeners always see the latest value
  const callStatusRef = useRef<CallStatus>("idle");

  const otherSlotId = slotId === "1" ? "2" : "1";

  // Keep callStatusRef in sync
  useEffect(() => {
    callStatusRef.current = callStatus;
  }, [callStatus]);

  // ── Debug logging helper ─────────────────────────────────────────────
  
  const logDebug = useCallback((event: string, details?: string, level: "info" | "warn" | "error" = "info") => {
    const logEntry: CallDebugEvent = {
      timestamp: Date.now(),
      event,
      details,
      level,
    };
    
    // Console log with color coding
    const prefix = `[VoiceCall ${new Date().toISOString()}]`;
    if (level === "error") {
      console.error(`${prefix} ❌ ${event}`, details || "");
    } else if (level === "warn") {
      console.warn(`${prefix} ⚠️ ${event}`, details || "");
    } else {
      console.log(`${prefix} ℹ️ ${event}`, details || "");
    }
    
    // Add to debug state
    setDebugState(prev => ({
      ...prev,
      eventLog: [...prev.eventLog.slice(-MAX_DEBUG_EVENTS + 1), logEntry],
    }));
  }, []);

  // ── Update debug state from peer connection ──────────────────────────
  
  const updateDebugStateFromPC = useCallback(() => {
    const pc = peerConnectionRef.current;
    setDebugState(prev => ({
      ...prev,
      signalingState: pc?.signalingState ?? null,
      iceConnectionState: pc?.iceConnectionState ?? null,
      iceGatheringState: pc?.iceGatheringState ?? null,
      connectionState: pc?.connectionState ?? null,
      pendingCandidatesCount: pendingCandidatesRef.current.length,
      localTracksCount: pc?.getSenders().length ?? 0,
      remoteTracksCount: pc?.getReceivers().filter(r => r.track).length ?? 0,
      hasLocalStream: !!localStreamRef.current,
      hasRemoteStream: !!remoteStreamRef.current,
      localAudioEnabled: localStreamRef.current?.getAudioTracks()[0]?.enabled ?? false,
      remoteAudioPlaying: !!remoteAudioRef.current && !remoteAudioRef.current.paused,
      signalsSent: signalCountersRef.current.sent,
      signalsReceived: signalCountersRef.current.received,
    }));
  }, []);

  // ── Set error state with proper categorization ───────────────────────
  
  const setError = useCallback((code: CallErrorCode, message: string, details?: string) => {
    const error: CallError = {
      code,
      message,
      details,
      timestamp: Date.now(),
    };
    setCallError(error);
    setCallStatus("error");
    logDebug(`ERROR: ${code}`, `${message}${details ? ` - ${details}` : ""}`, "error");
  }, [logDebug]);

  // ── Categorize media errors ──────────────────────────────────────────
  
  const categorizeMediaError = useCallback((err: unknown): { code: CallErrorCode; message: string; details: string } => {
    const error = err as Error & { name?: string; constraint?: string };
    const name = error?.name || "Unknown";
    const msg = error?.message || "Unknown error";
    
    if (name === "NotAllowedError" || name === "PermissionDeniedError") {
      return {
        code: "MEDIA_PERMISSION_DENIED",
        message: "Microphone permission denied",
        details: `${name}: ${msg}. Please allow microphone access in your browser settings.`,
      };
    }
    if (name === "NotFoundError" || name === "DevicesNotFoundError") {
      return {
        code: "MEDIA_NOT_FOUND",
        message: "No microphone found",
        details: `${name}: ${msg}. Please connect a microphone and try again.`,
      };
    }
    if (name === "NotSupportedError") {
      return {
        code: "MEDIA_NOT_SUPPORTED",
        message: "Media not supported",
        details: `${name}: ${msg}. Your browser may not support audio capture.`,
      };
    }
    if (name === "OverconstrainedError") {
      return {
        code: "MEDIA_OVERCONSTRAINED",
        message: "Audio constraints not satisfiable",
        details: `${name}: ${msg}. Constraint: ${error.constraint || "unknown"}`,
      };
    }
    if (name === "NotReadableError" || name === "TrackStartError") {
      return {
        code: "MEDIA_UNKNOWN",
        message: "Microphone is in use or unavailable",
        details: `${name}: ${msg}. Another app may be using the microphone.`,
      };
    }
    return {
      code: "MEDIA_UNKNOWN",
      message: "Failed to access microphone",
      details: `${name}: ${msg}`,
    };
  }, []);

  // ── Clear error state ────────────────────────────────────────────────
  
  const clearError = useCallback(() => {
    setCallError(null);
    if (callStatusRef.current === "error") {
      setCallStatus("idle");
    }
  }, []);

  // ── Toggle debug panel ───────────────────────────────────────────────
  
  const toggleDebugPanel = useCallback(() => {
    setShowDebugPanel(prev => !prev);
  }, []);

  // ── helpers ──────────────────────────────────────────────────────────

  // "Warm up" the audio element so mobile browsers allow playback later.
  // Must be called inside a real user-gesture handler (click / touchend).
  const warmUpAudio = useCallback(() => {
    const audio = remoteAudioRef.current;
    if (!audio) {
      logDebug("Audio warmup skipped", "No audio element available", "warn");
      return;
    }
    logDebug("Audio warmup", "Attempting to unlock audio playback");
    // A play() during a user gesture "unlocks" the element on iOS / Android
    audio.play().then(() => {
      logDebug("Audio warmup success", "Audio element unlocked");
    }).catch((e) => {
      logDebug("Audio warmup failed", e?.message || "Unknown error", "warn");
    });
    // Only pause if no srcObject is set yet (pure warm-up scenario).
    // If srcObject is already attached (e.g. ontrack already fired for the
    // callee), pausing here would silence the remote stream permanently.
    if (!audio.srcObject) {
      audio.pause();
    }
  }, [logDebug]);

  // Flush any ICE candidates that were queued before remote description
  const flushPendingCandidates = useCallback(async () => {
    const pc = peerConnectionRef.current;
    if (!pc || !pc.remoteDescription) {
      logDebug("Flush candidates skipped", `PC: ${!!pc}, remoteDesc: ${!!pc?.remoteDescription}`);
      return;
    }
    const pending = pendingCandidatesRef.current.splice(0);
    if (pending.length === 0) {
      logDebug("Flush candidates", "No pending candidates to flush");
      return;
    }
    logDebug("Flushing candidates", `Adding ${pending.length} queued ICE candidates`);
    let added = 0;
    let failed = 0;
    for (const c of pending) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(c));
        added++;
      } catch (e) {
        failed++;
        logDebug("ICE candidate add failed", (e as Error)?.message || "Unknown error", "warn");
      }
    }
    logDebug("Flush candidates complete", `Added: ${added}, Failed: ${failed}`);
    setDebugState(prev => ({
      ...prev,
      remoteCandidatesCount: prev.remoteCandidatesCount + added,
    }));
    updateDebugStateFromPC();
  }, [logDebug, updateDebugStateFromPC]);

  // Clear connection timeout
  const clearConnectionTimeout = useCallback(() => {
    if (connectionTimeoutRef.current) {
      window.clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
      logDebug("Connection timeout cleared");
    }
  }, [logDebug]);

  // Clean up WebRTC resources
  const cleanup = useCallback(() => {
    logDebug("Cleanup", "Cleaning up WebRTC resources");
    clearConnectionTimeout();
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
      analyserRef.current = null;
      gainNodeRef.current = null;
    }
    if (peerConnectionRef.current) {
      logDebug("Cleanup", `Closing PC in state: ${peerConnectionRef.current.connectionState}`);
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (localStreamRef.current) {
      const trackCount = localStreamRef.current.getTracks().length;
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
      logDebug("Cleanup", `Stopped ${trackCount} local tracks`);
    }
    if (durationIntervalRef.current) {
      window.clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    pendingCandidatesRef.current = [];
    callStartTimeRef.current = null;
    remoteStreamRef.current = null;
    signalCountersRef.current = { sent: 0, received: 0 };
    setCallDuration(0);
    setRemoteAudioLevel(0);
    setDebugState(createInitialDebugState);
    logDebug("Cleanup complete");
  }, [clearConnectionTimeout, logDebug]);

  // Create / resume an AudioContext. MUST be called inside a user-gesture
  // handler (click / touchend) so the context is unlocked on iOS / Android.
  const ensureAudioContext = useCallback(() => {
    if (audioContextRef.current) {
      if (audioContextRef.current.state === "suspended") {
        logDebug("AudioContext", "Resuming suspended context");
        audioContextRef.current.resume().catch((e) => {
          logDebug("AudioContext resume failed", (e as Error)?.message, "warn");
        });
      }
      return audioContextRef.current;
    }
    try {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!AC) {
        logDebug("AudioContext", "Not available in this browser", "warn");
        return null;
      }
      const ctx = new AC();
      audioContextRef.current = ctx;
      logDebug("AudioContext", `Created new context, state: ${ctx.state}`);
      return ctx;
    } catch (e) {
      logDebug("AudioContext creation failed", (e as Error)?.message, "error");
      return null;
    }
  }, [logDebug]);

  // Apply the Web Audio gain-boost pipeline to the remote stream.
  // Safe to call multiple times – it no-ops if already wired up.
  const setupAudioBoost = useCallback(() => {
    const stream = remoteStreamRef.current;
    const audio = remoteAudioRef.current;
    const ctx = audioContextRef.current;
    if (!stream || !audio || !ctx) {
      logDebug("Audio boost skipped", `stream: ${!!stream}, audio: ${!!audio}, ctx: ${!!ctx}`);
      return;
    }
    if (gainNodeRef.current) {
      logDebug("Audio boost skipped", "Already set up");
      return;
    }

    try {
      logDebug("Audio boost", "Setting up gain pipeline");
      if (ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }

      const source = ctx.createMediaStreamSource(stream);

      const gainNode = ctx.createGain();
      gainNode.gain.value = 3.0;
      gainNodeRef.current = gainNode;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      source.connect(gainNode);
      gainNode.connect(analyser);

      // Route boosted audio to audio element only (avoid double output)
      if (typeof ctx.createMediaStreamDestination === "function") {
        const dest = ctx.createMediaStreamDestination();
        gainNode.connect(dest);
        audio.srcObject = dest.stream;
        logDebug("Audio boost", "Using MediaStreamDestination");
      } else {
        // Fallback – direct output through AudioContext speakers
        gainNode.connect(ctx.destination);
        logDebug("Audio boost", "Using direct AudioContext destination (fallback)");
      }

      // Audio-level visualisation loop
      const updateLevel = () => {
        if (!analyserRef.current) return;
        const data = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        setRemoteAudioLevel(Math.min(100, avg * 1.5));
        animationFrameRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();

      audio.volume = 1.0;
      audio.play().then(() => {
        logDebug("Audio boost", "Playback started successfully");
      }).catch((e) => {
        logDebug("Audio boost playback failed", (e as Error)?.message, "warn");
      });
      logDebug("Audio boost complete", "Gain pipeline active");
    } catch (e) {
      logDebug("Audio boost setup failed", (e as Error)?.message || "Unknown error", "warn");
    }
  }, [logDebug]);

  // ── Peer connection factory ──────────────────────────────────────────

  const createPeerConnection = useCallback(() => {
    // If one already exists, return it (don't create duplicates)
    if (peerConnectionRef.current) {
      const state = peerConnectionRef.current.signalingState;
      if (state !== "closed") {
        logDebug("PeerConnection", `Reusing existing PC in state: ${state}`);
        return peerConnectionRef.current;
      }
    }

    logDebug("PeerConnection", "Creating new RTCPeerConnection");
    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = (event) => {
      if (event.candidate && slotId) {
        logDebug("ICE candidate (local)", `type: ${event.candidate.type}, protocol: ${event.candidate.protocol}`);
        const signalRef = ref(rtdb, `${roomPath}/callSignals`);
        push(signalRef, {
          from: slotId,
          to: otherSlotId,
          type: "candidate",
          candidate: event.candidate.toJSON(),
          timestamp: { ".sv": "timestamp" },
        } as CallSignal).then(() => {
          signalCountersRef.current.sent++;
          setDebugState(prev => ({
            ...prev,
            localCandidatesCount: prev.localCandidatesCount + 1,
            signalsSent: signalCountersRef.current.sent,
          }));
        }).catch((e) => {
          logDebug("Failed to send ICE candidate", (e as Error)?.message, "error");
        });
      } else if (!event.candidate) {
        logDebug("ICE gathering", "Complete (null candidate)");
      }
    };

    pc.onicegatheringstatechange = () => {
      logDebug("ICE gathering state", pc.iceGatheringState);
      updateDebugStateFromPC();
    };

    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState;
      logDebug("ICE connection state", state, state === "failed" || state === "disconnected" ? "warn" : "info");
      updateDebugStateFromPC();
      
      // Recover from temporary disconnects via ICE restart
      if (state === "failed") {
        logDebug("ICE failed", "Attempting ICE restart", "warn");
        setError("ICE_FAILED", "ICE connection failed", "Network connectivity issue - attempting recovery");
        pc.restartIce();
      } else if (state === "disconnected") {
        logDebug("ICE disconnected", "Network may have temporarily dropped", "warn");
      } else if (state === "connected" || state === "completed") {
        logDebug("ICE connected", `ICE negotiation successful in state: ${state}`);
        clearError();
      }
    };

    pc.onsignalingstatechange = () => {
      logDebug("Signaling state", pc.signalingState);
      updateDebugStateFromPC();
    };

    pc.onnegotiationneeded = () => {
      logDebug("Negotiation needed", "Renegotiation may be required", "warn");
    };

    pc.ontrack = (event) => {
      // Use event.streams[0] if available, otherwise create a stream from the track
      const remoteStream = event.streams?.[0] ?? new MediaStream([event.track]);
      remoteStreamRef.current = remoteStream;
      
      const trackInfo = `kind: ${event.track.kind}, id: ${event.track.id.slice(0, 8)}..., enabled: ${event.track.enabled}`;
      logDebug("Remote track received", trackInfo);
      
      if (!remoteAudioRef.current) {
        logDebug("ontrack error", "No audio element available", "warn");
        return;
      }

      logDebug("ontrack", `Stream tracks: ${remoteStream.getTracks().length}`);
      setDebugState(prev => ({
        ...prev,
        hasRemoteStream: true,
        remoteTracksCount: remoteStream.getTracks().length,
      }));

      // Assign the raw stream directly – the gain-boost pipeline is applied
      // later (in the "connected" handler) to avoid interfering with the
      // WebRTC signalling / ICE process and to ensure the AudioContext is
      // created inside a user-gesture so it isn't suspended on iOS.
      remoteAudioRef.current.srcObject = remoteStream;
      remoteAudioRef.current.volume = 1.0;

      // Try to play immediately, then retry after a short delay for mobile
      remoteAudioRef.current
        .play()
        .then(() => {
          logDebug("Remote audio", "Playback started successfully");
          setDebugState(prev => ({ ...prev, remoteAudioPlaying: true }));
        })
        .catch((e) => {
          logDebug("Remote audio blocked", (e as Error)?.message || "Unknown error", "warn");
          setTimeout(() => {
            remoteAudioRef.current?.play().then(() => {
              logDebug("Remote audio", "Playback started on retry");
              setDebugState(prev => ({ ...prev, remoteAudioPlaying: true }));
            }).catch(() => {
              logDebug("Remote audio", "Still blocked after retry", "warn");
            });
          }, 300);
        });
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      logDebug("Connection state", state, state === "failed" || state === "disconnected" ? "warn" : "info");
      updateDebugStateFromPC();
      
      if (state === "connected") {
        logDebug("Call connected", "WebRTC connection established successfully");
        clearConnectionTimeout();
        setCallStatus("connected");
        clearError();
        // Apply gain-boost now that the connection is stable
        setupAudioBoost();
        callStartTimeRef.current = Date.now();
        durationIntervalRef.current = window.setInterval(() => {
          if (callStartTimeRef.current) {
            setCallDuration(
              Math.floor((Date.now() - callStartTimeRef.current) / 1000),
            );
          }
        }, 1000);
      } else if (state === "connecting") {
        logDebug("Connection state", "WebRTC connection in progress...");
      } else if (state === "disconnected") {
        logDebug("Connection disconnected", "Network may have dropped, waiting for recovery", "warn");
      } else if (state === "failed") {
        setError("CONNECTION_FAILED", "Connection failed", "WebRTC peer connection could not be established");
        cleanup();
        setCallStatus("idle");
        setCallerId(null);
        // Also remove Firebase state so the other side sees the call ended
        remove(ref(rtdb, `${roomPath}/callState`)).catch(() => {});
        remove(ref(rtdb, `${roomPath}/callSignals`)).catch(() => {});
      } else if (state === "closed") {
        logDebug("Connection closed", "Peer connection has been closed");
      }
    };

    peerConnectionRef.current = pc;
    logDebug("PeerConnection created", `signalingState: ${pc.signalingState}`);
    updateDebugStateFromPC();
    return pc;
  }, [slotId, otherSlotId, cleanup, roomPath, setupAudioBoost, logDebug, updateDebugStateFromPC, setError, clearError, clearConnectionTimeout]);

  // ── Start an outgoing call ───────────────────────────────────────────

  const startCall = useCallback(async () => {
    if (!slotId) {
      logDebug("startCall aborted", "No slotId", "warn");
      return;
    }
    if (callStatusRef.current !== "idle") {
      logDebug("startCall aborted", `Already in state: ${callStatusRef.current}`, "warn");
      return;
    }

    try {
      logDebug("Starting call", `From slot ${slotId} to slot ${otherSlotId}`);
      setCallStatus("calling");
      setCallerId(slotId);
      clearError();

      // Create AudioContext in user-gesture context so it is unlocked on iOS
      logDebug("startCall", "Ensuring AudioContext...");
      ensureAudioContext();
      // Warm-up audio so remote playback is unlocked (user-gesture context)
      warmUpAudio();

      // Clear any stale signals / state
      logDebug("startCall", "Clearing stale signals...");
      processedSignalsRef.current.clear();
      signalCountersRef.current = { sent: 0, received: 0 };
      await remove(ref(rtdb, `${roomPath}/callSignals`)).catch((e) => {
        logDebug("Failed to clear signals", (e as Error)?.message, "warn");
      });

      // Get microphone access
      logDebug("startCall", "Requesting microphone access...");
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        const audioTrack = stream.getAudioTracks()[0];
        logDebug("Microphone access granted", `Track: ${audioTrack?.label || "unknown"}, enabled: ${audioTrack?.enabled}`);
        setDebugState(prev => ({
          ...prev,
          hasLocalStream: true,
          localAudioEnabled: audioTrack?.enabled ?? false,
          localTracksCount: stream.getTracks().length,
        }));
      } catch (mediaErr) {
        const { code, message, details } = categorizeMediaError(mediaErr);
        setError(code, message, details);
        cleanup();
        setCallerId(null);
        return;
      }
      localStreamRef.current = stream;

      logDebug("startCall", "Creating peer connection...");
      const pc = createPeerConnection();
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
        logDebug("Local track added", `kind: ${track.kind}, id: ${track.id.slice(0, 8)}...`);
      });

      // Create and send offer
      logDebug("startCall", "Creating offer...");
      let offer: RTCSessionDescriptionInit;
      try {
        offer = await pc.createOffer();
        logDebug("Offer created", `type: ${offer.type}, sdp length: ${offer.sdp?.length ?? 0}`);
      } catch (offerErr) {
        setError("OFFER_FAILED", "Failed to create offer", (offerErr as Error)?.message);
        cleanup();
        setCallStatus("idle");
        setCallerId(null);
        return;
      }

      try {
        await pc.setLocalDescription(offer);
        logDebug("Local description set", `signalingState: ${pc.signalingState}`);
        updateDebugStateFromPC();
      } catch (descErr) {
        setError("OFFER_FAILED", "Failed to set local description", (descErr as Error)?.message);
        cleanup();
        setCallStatus("idle");
        setCallerId(null);
        return;
      }

      // Send offer to Firebase
      logDebug("startCall", "Sending offer via Firebase...");
      const signalRef = ref(rtdb, `${roomPath}/callSignals`);
      try {
        await push(signalRef, {
          from: slotId,
          to: otherSlotId,
          type: "offer",
          sdp: offer.sdp,
          timestamp: { ".sv": "timestamp" },
        } as CallSignal);
        signalCountersRef.current.sent++;
        setDebugState(prev => ({
          ...prev,
          signalsSent: signalCountersRef.current.sent,
          lastSignalType: "offer",
          lastSignalTime: Date.now(),
        }));
        logDebug("Offer sent", "Waiting for answer...");
      } catch (fbErr) {
        setError("FIREBASE_ERROR", "Failed to send call signal", (fbErr as Error)?.message);
        cleanup();
        setCallStatus("idle");
        setCallerId(null);
        return;
      }

      // Set call state in Firebase so the other party sees "ringing"
      try {
        await set(ref(rtdb, `${roomPath}/callState`), {
          status: "calling",
          callerId: slotId,
          startedAt: { ".sv": "timestamp" },
        });
        logDebug("Call state set", "Other party should see incoming call");
      } catch (fbErr) {
        setError("FIREBASE_ERROR", "Failed to set call state", (fbErr as Error)?.message);
        cleanup();
        setCallStatus("idle");
        setCallerId(null);
        return;
      }

      // Set connection timeout
      connectionTimeoutRef.current = window.setTimeout(() => {
        if (callStatusRef.current === "calling" || callStatusRef.current === "connecting") {
          logDebug("Connection timeout", `Call did not connect within ${CONNECTION_TIMEOUT_MS / 1000}s`, "error");
          setError("CONNECTION_TIMEOUT", "Call timed out", "The other party did not answer or connection could not be established");
          cleanup();
          setCallStatus("idle");
          setCallerId(null);
          remove(ref(rtdb, `${roomPath}/callState`)).catch(() => {});
          remove(ref(rtdb, `${roomPath}/callSignals`)).catch(() => {});
        }
      }, CONNECTION_TIMEOUT_MS);
      logDebug("startCall complete", `Timeout set for ${CONNECTION_TIMEOUT_MS / 1000}s`);
      
    } catch (err) {
      const errMsg = (err as Error)?.message || "Unknown error";
      logDebug("startCall failed", errMsg, "error");
      setError("UNKNOWN_ERROR", "Failed to start call", errMsg);
      cleanup();
      setCallStatus("idle");
      setCallerId(null);
    }
  }, [slotId, otherSlotId, createPeerConnection, cleanup, warmUpAudio, ensureAudioContext, roomPath, logDebug, setError, clearError, categorizeMediaError, updateDebugStateFromPC]);

  // ── Answer an incoming call ──────────────────────────────────────────

  const answerCall = useCallback(async () => {
    if (!slotId) {
      logDebug("answerCall aborted", "No slotId", "warn");
      return;
    }
    if (callStatusRef.current !== "ringing") {
      logDebug("answerCall aborted", `Not ringing, current state: ${callStatusRef.current}`, "warn");
      return;
    }

    try {
      logDebug("Answering call", `Slot ${slotId} answering call from ${callerId}`);
      setCallStatus("connecting");
      clearError();

      // Create / resume AudioContext in user-gesture context (unlocks on iOS)
      logDebug("answerCall", "Ensuring AudioContext...");
      ensureAudioContext();
      // Warm-up audio so remote playback is unlocked (user-gesture context)
      warmUpAudio();

      // Get microphone access
      logDebug("answerCall", "Requesting microphone access...");
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        const audioTrack = stream.getAudioTracks()[0];
        logDebug("Microphone access granted", `Track: ${audioTrack?.label || "unknown"}, enabled: ${audioTrack?.enabled}`);
        setDebugState(prev => ({
          ...prev,
          hasLocalStream: true,
          localAudioEnabled: audioTrack?.enabled ?? false,
          localTracksCount: stream.getTracks().length,
        }));
      } catch (mediaErr) {
        const { code, message, details } = categorizeMediaError(mediaErr);
        setError(code, message, details);
        cleanup();
        setCallerId(null);
        return;
      }
      localStreamRef.current = stream;

      // *** KEY FIX: reuse the PeerConnection that was created when the
      // offer signal arrived (it already has remoteDescription set). ***
      let pc = peerConnectionRef.current;
      if (!pc || pc.signalingState === "closed") {
        logDebug("answerCall", "No existing PC with offer – creating fresh one", "warn");
        pc = createPeerConnection();
      } else {
        logDebug("answerCall", `Reusing PC in state: ${pc.signalingState}, remoteDesc: ${!!pc.remoteDescription}`);
      }

      // Add our audio tracks to the existing PC
      stream.getTracks().forEach((track) => {
        pc!.addTrack(track, stream);
        logDebug("Local track added", `kind: ${track.kind}, id: ${track.id.slice(0, 8)}...`);
      });

      // Ensure all transceivers are set to sendrecv so our audio is in the answer SDP
      const transceivers = pc.getTransceivers();
      logDebug("answerCall", `Found ${transceivers.length} transceivers`);
      transceivers.forEach((t, i) => {
        if (t.receiver.track?.kind === "audio" && t.direction !== "sendrecv") {
          try {
            t.direction = "sendrecv";
            logDebug("Transceiver updated", `Index ${i}: set to sendrecv`);
          } catch {
            logDebug("Transceiver update failed", `Index ${i}: could not change direction`, "warn");
          }
        }
      });

      // Create answer (remote description was set by signal handler)
      logDebug("answerCall", "Creating answer...");
      let answer: RTCSessionDescriptionInit;
      try {
        answer = await pc.createAnswer();
        logDebug("Answer created", `type: ${answer.type}, sdp length: ${answer.sdp?.length ?? 0}`);
      } catch (answerErr) {
        setError("ANSWER_FAILED", "Failed to create answer", (answerErr as Error)?.message);
        cleanup();
        setCallStatus("idle");
        setCallerId(null);
        return;
      }

      try {
        await pc.setLocalDescription(answer);
        logDebug("Local description set", `signalingState: ${pc.signalingState}`);
        updateDebugStateFromPC();
      } catch (descErr) {
        setError("ANSWER_FAILED", "Failed to set local description", (descErr as Error)?.message);
        cleanup();
        setCallStatus("idle");
        setCallerId(null);
        return;
      }

      // Send the answer signal to the caller
      logDebug("answerCall", "Sending answer via Firebase...");
      const signalRef = ref(rtdb, `${roomPath}/callSignals`);
      try {
        await push(signalRef, {
          from: slotId,
          to: otherSlotId,
          type: "answer",
          sdp: answer.sdp,
          timestamp: { ".sv": "timestamp" },
        } as CallSignal);
        signalCountersRef.current.sent++;
        setDebugState(prev => ({
          ...prev,
          signalsSent: signalCountersRef.current.sent,
          lastSignalType: "answer",
          lastSignalTime: Date.now(),
        }));
        logDebug("Answer sent", "Waiting for connection...");
      } catch (fbErr) {
        setError("FIREBASE_ERROR", "Failed to send answer", (fbErr as Error)?.message);
        cleanup();
        setCallStatus("idle");
        setCallerId(null);
        return;
      }

      try {
        await set(ref(rtdb, `${roomPath}/callState/status`), "connected");
        logDebug("Call state updated", "Set to connected in Firebase");
      } catch (fbErr) {
        logDebug("Failed to update call state", (fbErr as Error)?.message, "warn");
      }

      // Set connection timeout for answering side too
      connectionTimeoutRef.current = window.setTimeout(() => {
        if (callStatusRef.current === "connecting") {
          logDebug("Connection timeout", `Call did not connect within ${CONNECTION_TIMEOUT_MS / 1000}s after answering`, "error");
          setError("CONNECTION_TIMEOUT", "Connection timed out", "WebRTC connection could not be established after answering");
          cleanup();
          setCallStatus("idle");
          setCallerId(null);
          remove(ref(rtdb, `${roomPath}/callState`)).catch(() => {});
          remove(ref(rtdb, `${roomPath}/callSignals`)).catch(() => {});
        }
      }, CONNECTION_TIMEOUT_MS);

      // Ensure remote audio is playing – warmUpAudio may have paused it, or
      // the earlier tryPlay() inside ontrack may have been blocked by the
      // browser for lack of a user gesture.  We are still inside the
      // user-gesture call-stack here so play() is allowed.
      remoteAudioRef.current?.play().then(() => {
        logDebug("Remote audio", "Playback confirmed");
        setDebugState(prev => ({ ...prev, remoteAudioPlaying: true }));
      }).catch((e) => {
        logDebug("Remote audio play failed", (e as Error)?.message, "warn");
      });
      
      logDebug("answerCall complete", "Waiting for WebRTC connection...");
    } catch (err) {
      const errMsg = (err as Error)?.message || "Unknown error";
      logDebug("answerCall failed", errMsg, "error");
      setError("UNKNOWN_ERROR", "Failed to answer call", errMsg);
      cleanup();
      setCallStatus("idle");
      setCallerId(null);
    }
  }, [slotId, otherSlotId, callerId, createPeerConnection, cleanup, warmUpAudio, ensureAudioContext, roomPath, logDebug, setError, clearError, categorizeMediaError, updateDebugStateFromPC]);

  // ── End / decline call ───────────────────────────────────────────────

  const endCall = useCallback(async () => {
    if (!slotId) {
      logDebug("endCall aborted", "No slotId", "warn");
      return;
    }

    logDebug("Ending call", `Current status: ${callStatusRef.current}`);

    try {
      const signalRef = ref(rtdb, `${roomPath}/callSignals`);
      await push(signalRef, {
        from: slotId,
        to: otherSlotId,
        type: "hangup",
        timestamp: { ".sv": "timestamp" },
      } as CallSignal);
      logDebug("Hangup signal sent");

      await remove(ref(rtdb, `${roomPath}/callState`));
      await remove(ref(rtdb, `${roomPath}/callSignals`));
      logDebug("Firebase call state cleared");
    } catch (err) {
      logDebug("endCall Firebase cleanup error", (err as Error)?.message, "warn");
    }

    cleanup();
    setCallStatus("idle");
    setCallerId(null);
    clearError();
    processedSignalsRef.current.clear();
    logDebug("Call ended", "All resources cleaned up");
  }, [slotId, otherSlotId, cleanup, roomPath, logDebug, clearError]);

  // ── Toggle mute ──────────────────────────────────────────────────────

  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
        logDebug("Mute toggled", `Muted: ${!audioTrack.enabled}`);
        setDebugState(prev => ({ ...prev, localAudioEnabled: audioTrack.enabled }));
      }
    } else {
      logDebug("toggleMute failed", "No local stream", "warn");
    }
  }, [logDebug]);

  // ── Toggle speaker / handset ─────────────────────────────────────────

  const toggleSpeaker = useCallback(() => {
    setIsSpeaker((prev) => {
      const next = !prev;
      // Speaker = full boost, Handset = lower gain for earpiece use
      if (gainNodeRef.current) {
        gainNodeRef.current.gain.value = next ? 3.0 : 0.5;
      }
      if (remoteAudioRef.current) {
        remoteAudioRef.current.volume = next ? 1.0 : 0.3;
      }
      logDebug("Speaker toggled", `Speaker: ${next}, gain: ${next ? 3.0 : 0.5}`);
      return next;
    });
  }, [logDebug]);

  // ── Listen for call state (presence of an active call in Firebase) ──

  useEffect(() => {
    if (!slotId) return;

    logDebug("Firebase listener", "Setting up call state listener");
    const callStateRef = ref(rtdb, `${roomPath}/callState`);
    const unsubscribe = onValue(callStateRef, (snapshot) => {
      const state = snapshot.val();

      if (!state) {
        // Call ended by other party
        if (callStatusRef.current !== "idle" && callStatusRef.current !== "error") {
          logDebug("Firebase", "Call state removed - other party ended call");
          cleanup();
          setCallStatus("idle");
          setCallerId(null);
        }
        return;
      }

      logDebug("Firebase call state", `status: ${state.status}, callerId: ${state.callerId}`);

      // Incoming call – only transition to ringing from idle
      if (
        state.status === "calling" &&
        state.callerId !== slotId &&
        callStatusRef.current === "idle"
      ) {
        logDebug("Incoming call", `From slot ${state.callerId}`);
        setCallStatus("ringing");
        setCallerId(state.callerId);
      }
    });

    return () => unsubscribe();
    // NOTE: we deliberately use callStatusRef instead of callStatus so this
    // effect does NOT re-subscribe every time callStatus changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slotId, cleanup, roomPath]);

  // ── Listen for WebRTC signaling messages ─────────────────────────────

  useEffect(() => {
    if (!slotId) return;

    logDebug("Firebase listener", "Setting up signal listener");
    const signalsRef = ref(rtdb, `${roomPath}/callSignals`);

    const unsubscribe = onChildAdded(signalsRef, async (snapshot) => {
      const key = snapshot.key;
      // Deduplicate: onChildAdded replays all existing children on re-subscribe
      if (!key || processedSignalsRef.current.has(key)) return;
      processedSignalsRef.current.add(key);

      const signal = snapshot.val() as CallSignal;

      // Only process signals addressed to us
      if (signal.to !== slotId) {
        logDebug("Signal ignored", `Not for us (to: ${signal.to}, we are: ${slotId})`);
        return;
      }

      signalCountersRef.current.received++;
      setDebugState(prev => ({
        ...prev,
        signalsReceived: signalCountersRef.current.received,
        lastSignalType: signal.type,
        lastSignalTime: Date.now(),
      }));

      logDebug("Signal received", `type: ${signal.type}, from: ${signal.from}`);

      try {
        switch (signal.type) {
          case "offer": {
            logDebug("Processing offer", `SDP length: ${signal.sdp?.length ?? 0}`);
            // Create (or reuse) a peer connection and store the remote offer
            const pc = createPeerConnection();
            try {
              await pc.setRemoteDescription({
                type: "offer",
                sdp: signal.sdp,
              });
              logDebug("Remote offer set", `signalingState: ${pc.signalingState}`);
              updateDebugStateFromPC();
            } catch (e) {
              logDebug("Failed to set remote offer", (e as Error)?.message, "error");
              setError("SIGNALING_FAILED", "Failed to process incoming call", (e as Error)?.message);
            }
            // Flush any ICE candidates that arrived before the offer
            await flushPendingCandidates();
            break;
          }

          case "answer": {
            logDebug("Processing answer", `SDP length: ${signal.sdp?.length ?? 0}`);
            const pc = peerConnectionRef.current;
            if (pc && pc.signalingState === "have-local-offer") {
              try {
                await pc.setRemoteDescription({
                  type: "answer",
                  sdp: signal.sdp,
                });
                logDebug("Remote answer set", `signalingState: ${pc.signalingState}`);
                updateDebugStateFromPC();
              } catch (e) {
                logDebug("Failed to set remote answer", (e as Error)?.message, "error");
                setError("SIGNALING_FAILED", "Failed to process call answer", (e as Error)?.message);
              }
              // Flush any ICE candidates that arrived before the answer
              await flushPendingCandidates();
            } else {
              logDebug("Answer ignored", `PC signalingState: ${pc?.signalingState ?? "no PC"}`, "warn");
            }
            break;
          }

          case "candidate": {
            if (!signal.candidate) {
              logDebug("Candidate ignored", "No candidate data");
              break;
            }
            const candidateInfo = `type: ${signal.candidate.candidate?.split(" ")[7] ?? "unknown"}`;
            logDebug("Processing ICE candidate", candidateInfo);
            
            const pc = peerConnectionRef.current;
            // If we have a PC with remote description, add immediately;
            // otherwise queue it for later.
            if (pc && pc.remoteDescription) {
              try {
                await pc.addIceCandidate(
                  new RTCIceCandidate(signal.candidate),
                );
                logDebug("ICE candidate added");
                setDebugState(prev => ({
                  ...prev,
                  remoteCandidatesCount: prev.remoteCandidatesCount + 1,
                }));
              } catch (e) {
                logDebug("ICE candidate add failed", (e as Error)?.message, "warn");
              }
            } else {
              pendingCandidatesRef.current.push(signal.candidate);
              logDebug("ICE candidate queued", `Pending: ${pendingCandidatesRef.current.length}`);
              setDebugState(prev => ({
                ...prev,
                pendingCandidatesCount: pendingCandidatesRef.current.length,
              }));
            }
            break;
          }

          case "hangup": {
            logDebug("Hangup received", "Other party ended the call");
            setError("REMOTE_HANGUP", "Call ended", "The other party ended the call");
            cleanup();
            setCallStatus("idle");
            setCallerId(null);
            break;
          }
        }
      } catch (err) {
        logDebug("Signal handling error", (err as Error)?.message, "error");
        setError("SIGNALING_FAILED", "Signal processing error", (err as Error)?.message);
      }
    });

    return () => {
      logDebug("Firebase listener", "Cleaning up signal listener");
      unsubscribe();
    };
  }, [slotId, createPeerConnection, cleanup, flushPendingCandidates, roomPath, logDebug, setError, updateDebugStateFromPC]);

  // ── Create audio element (once) for remote stream playback ───────────

  useEffect(() => {
    logDebug("Audio element", "Creating remote audio element");
    const audio = document.createElement("audio");
    audio.autoplay = true;
    audio.volume = 1.0;
    audio.setAttribute("playsinline", "true");
    // Allow audio to play when phone is on silent (iOS)
    audio.setAttribute("x-webkit-airplay", "allow");
    // Force media session to treat this as voice communication
    // so it routes to the correct output (speaker not earpiece)
    (audio as unknown as Record<string, unknown>).mozAudioChannelType = "content";
    // Append to DOM – some mobile browsers need the element in the DOM for playback
    audio.style.display = "none";
    document.body.appendChild(audio);
    remoteAudioRef.current = audio;
    logDebug("Audio element", "Created and appended to DOM");

    return () => {
      logDebug("Audio element", "Removing from DOM");
      audio.srcObject = null;
      audio.remove();
    };
  }, [logDebug]);

  // ── Cleanup on unmount ───────────────────────────────────────────────

  useEffect(() => {
    return () => {
      logDebug("Unmount", "Component unmounting, cleaning up");
      cleanup();
    };
  }, [cleanup, logDebug]);

  return {
    // Call state
    callStatus,
    callerId,
    isMuted,
    isSpeaker,
    callDuration,
    remoteAudioLevel,
    
    // Error state
    callError,
    clearError,
    
    // Debug state
    debugState,
    showDebugPanel,
    toggleDebugPanel,
    
    // Actions
    startCall,
    answerCall,
    endCall,
    toggleMute,
    toggleSpeaker,
  };
}
