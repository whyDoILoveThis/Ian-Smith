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
import type { CallStatus, CallSignal } from "../types";

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

export function useVoiceCall(slotId: "1" | "2" | null, roomPath: string) {
  const [callStatus, setCallStatus] = useState<CallStatus>("idle");
  const [callerId, setCallerId] = useState<"1" | "2" | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [remoteAudioLevel, setRemoteAudioLevel] = useState(0);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const callStartTimeRef = useRef<number | null>(null);
  const durationIntervalRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

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

  // ── helpers ──────────────────────────────────────────────────────────

  // "Warm up" the audio element so mobile browsers allow playback later.
  // Must be called inside a real user-gesture handler (click / touchend).
  const warmUpAudio = useCallback(() => {
    const audio = remoteAudioRef.current;
    if (!audio) return;
    // A play() during a user gesture "unlocks" the element on iOS / Android
    audio.play().catch(() => {});
    // Only pause if no srcObject is set yet (pure warm-up scenario).
    // If srcObject is already attached (e.g. ontrack already fired for the
    // callee), pausing here would silence the remote stream permanently.
    if (!audio.srcObject) {
      audio.pause();
    }
  }, []);

  // Flush any ICE candidates that were queued before remote description
  const flushPendingCandidates = useCallback(async () => {
    const pc = peerConnectionRef.current;
    if (!pc || !pc.remoteDescription) return;
    const pending = pendingCandidatesRef.current.splice(0);
    for (const c of pending) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(c));
      } catch (e) {
        console.warn("[VoiceCall] Failed to add queued ICE candidate:", e);
      }
    }
  }, []);

  // Clean up WebRTC resources
  const cleanup = useCallback(() => {
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
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (durationIntervalRef.current) {
      window.clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    pendingCandidatesRef.current = [];
    callStartTimeRef.current = null;
    setCallDuration(0);
    setRemoteAudioLevel(0);
  }, []);

  // ── Peer connection factory ──────────────────────────────────────────

  const createPeerConnection = useCallback(() => {
    // If one already exists, return it (don't create duplicates)
    if (peerConnectionRef.current) {
      const state = peerConnectionRef.current.signalingState;
      if (state !== "closed") return peerConnectionRef.current;
    }

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

    pc.oniceconnectionstatechange = () => {
      console.log("[VoiceCall] ICE state:", pc.iceConnectionState);
      // Recover from temporary disconnects via ICE restart
      if (pc.iceConnectionState === "failed") {
        console.log("[VoiceCall] ICE failed – attempting restart");
        pc.restartIce();
      }
    };

    pc.ontrack = (event) => {
      // Use event.streams[0] if available, otherwise create a stream from the track
      const remoteStream = event.streams?.[0] ?? new MediaStream([event.track]);
      if (!remoteAudioRef.current) return;

      console.log("[VoiceCall] ontrack fired – stream tracks:", remoteStream.getTracks().length);

      // ── Audio boost pipeline via Web Audio API ──
      // Route through a GainNode to amplify volume (fixes low audio on mobile)
      try {
        const AC =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        if (AC) {
          const ctx = new AC();
          audioContextRef.current = ctx;
          if (ctx.state === "suspended") ctx.resume().catch(() => {});

          const source = ctx.createMediaStreamSource(remoteStream);

          // Gain node: boost volume by 3x (mobile devices often have very low WebRTC audio)
          const gainNode = ctx.createGain();
          gainNode.gain.value = 3.0;
          gainNodeRef.current = gainNode;

          // Analyser for visual audio level
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 256;
          analyserRef.current = analyser;

          // Pipeline: source → gain → analyser + destination
          source.connect(gainNode);
          gainNode.connect(analyser);
          gainNode.connect(ctx.destination);

          // Create a boosted MediaStream from the destination for the audio element
          // This ensures mobile browsers actually play the audio through the speaker
          if (typeof ctx.createMediaStreamDestination === "function") {
            const dest = ctx.createMediaStreamDestination();
            gainNode.connect(dest);
            remoteAudioRef.current.srcObject = dest.stream;
          } else {
            remoteAudioRef.current.srcObject = remoteStream;
          }

          const updateLevel = () => {
            if (!analyserRef.current) return;
            const data = new Uint8Array(analyserRef.current.frequencyBinCount);
            analyserRef.current.getByteFrequencyData(data);
            const avg = data.reduce((a, b) => a + b, 0) / data.length;
            setRemoteAudioLevel(Math.min(100, avg * 1.5));
            animationFrameRef.current = requestAnimationFrame(updateLevel);
          };
          updateLevel();
        } else {
          // Fallback: direct stream assignment
          remoteAudioRef.current.srcObject = remoteStream;
        }
      } catch {
        // Fallback: direct stream assignment if Web Audio API fails
        console.warn("[VoiceCall] Web Audio API boost failed, using direct stream");
        remoteAudioRef.current.srcObject = remoteStream;
      }

      // Ensure volume is maxed
      remoteAudioRef.current.volume = 1.0;

      // Try to play immediately, then retry after a short delay for mobile
      const tryPlay = () => {
        remoteAudioRef.current
          ?.play()
          .catch((e) => {
            console.warn("[VoiceCall] audio.play() blocked:", e.message);
            // Retry after a short delay
            setTimeout(() => {
              remoteAudioRef.current?.play().catch(() => {});
            }, 300);
          });
      };
      tryPlay();
    };

    pc.onconnectionstatechange = () => {
      console.log("[VoiceCall] connection state:", pc.connectionState);
      if (pc.connectionState === "connected") {
        setCallStatus("connected");
        callStartTimeRef.current = Date.now();
        durationIntervalRef.current = window.setInterval(() => {
          if (callStartTimeRef.current) {
            setCallDuration(
              Math.floor((Date.now() - callStartTimeRef.current) / 1000),
            );
          }
        }, 1000);
      } else if (
        pc.connectionState === "disconnected" ||
        pc.connectionState === "failed"
      ) {
        cleanup();
        setCallStatus("idle");
        setCallerId(null);
        // Also remove Firebase state so the other side sees the call ended
        remove(ref(rtdb, `${roomPath}/callState`)).catch(() => {});
        remove(ref(rtdb, `${roomPath}/callSignals`)).catch(() => {});
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  }, [slotId, otherSlotId, cleanup, roomPath]);

  // ── Start an outgoing call ───────────────────────────────────────────

  const startCall = useCallback(async () => {
    if (!slotId || callStatusRef.current !== "idle") return;

    try {
      setCallStatus("calling");
      setCallerId(slotId);

      // Warm-up audio so remote playback is unlocked (user-gesture context)
      warmUpAudio();

      // Clear any stale signals / state
      processedSignalsRef.current.clear();
      await remove(ref(rtdb, `${roomPath}/callSignals`)).catch(() => {});

      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
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

      // Set call state in Firebase so the other party sees "ringing"
      await set(ref(rtdb, `${roomPath}/callState`), {
        status: "calling",
        callerId: slotId,
        startedAt: { ".sv": "timestamp" },
      });
    } catch (err) {
      console.error("[VoiceCall] Failed to start call:", err);
      cleanup();
      setCallStatus("idle");
      setCallerId(null);
    }
  }, [slotId, otherSlotId, createPeerConnection, cleanup, warmUpAudio, roomPath]);

  // ── Answer an incoming call ──────────────────────────────────────────

  const answerCall = useCallback(async () => {
    if (!slotId || callStatusRef.current !== "ringing") return;

    try {
      setCallStatus("connecting");

      // Warm-up audio so remote playback is unlocked (user-gesture context)
      warmUpAudio();

      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      localStreamRef.current = stream;

      // *** KEY FIX: reuse the PeerConnection that was created when the
      // offer signal arrived (it already has remoteDescription set). ***
      let pc = peerConnectionRef.current;
      if (!pc || pc.signalingState === "closed") {
        console.warn(
          "[VoiceCall] No existing PC with offer – creating fresh one",
        );
        pc = createPeerConnection();
      }

      // Add our audio tracks to the existing PC
      stream.getTracks().forEach((track) => pc!.addTrack(track, stream));

      // Ensure all transceivers are set to sendrecv so our audio is in the answer SDP
      pc.getTransceivers().forEach((t) => {
        if (t.receiver.track?.kind === "audio" && t.direction !== "sendrecv") {
          try {
            t.direction = "sendrecv";
          } catch {
            /* some browsers don't allow this – addTrack should have handled it */
          }
        }
      });

      // Create answer (remote description was set by signal handler)
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // Send the answer signal to the caller
      const signalRef = ref(rtdb, `${roomPath}/callSignals`);
      await push(signalRef, {
        from: slotId,
        to: otherSlotId,
        type: "answer",
        sdp: answer.sdp,
        timestamp: { ".sv": "timestamp" },
      } as CallSignal);

      await set(ref(rtdb, `${roomPath}/callState/status`), "connected");

      // Ensure remote audio is playing – warmUpAudio may have paused it, or
      // the earlier tryPlay() inside ontrack may have been blocked by the
      // browser for lack of a user gesture.  We are still inside the
      // user-gesture call-stack here so play() is allowed.
      remoteAudioRef.current?.play().catch(() => {});
    } catch (err) {
      console.error("[VoiceCall] Failed to answer call:", err);
      cleanup();
      setCallStatus("idle");
      setCallerId(null);
    }
  }, [slotId, otherSlotId, createPeerConnection, cleanup, warmUpAudio, roomPath]);

  // ── End / decline call ───────────────────────────────────────────────

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
    processedSignalsRef.current.clear();
  }, [slotId, otherSlotId, cleanup, roomPath]);

  // ── Toggle mute ──────────────────────────────────────────────────────

  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  }, []);

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
      return next;
    });
  }, []);

  // ── Listen for call state (presence of an active call in Firebase) ──

  useEffect(() => {
    if (!slotId) return;

    const callStateRef = ref(rtdb, `${roomPath}/callState`);
    const unsubscribe = onValue(callStateRef, (snapshot) => {
      const state = snapshot.val();

      if (!state) {
        // Call ended by other party
        if (callStatusRef.current !== "idle") {
          cleanup();
          setCallStatus("idle");
          setCallerId(null);
        }
        return;
      }

      // Incoming call – only transition to ringing from idle
      if (
        state.status === "calling" &&
        state.callerId !== slotId &&
        callStatusRef.current === "idle"
      ) {
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

    const signalsRef = ref(rtdb, `${roomPath}/callSignals`);

    const unsubscribe = onChildAdded(signalsRef, async (snapshot) => {
      const key = snapshot.key;
      // Deduplicate: onChildAdded replays all existing children on re-subscribe
      if (!key || processedSignalsRef.current.has(key)) return;
      processedSignalsRef.current.add(key);

      const signal = snapshot.val() as CallSignal;

      // Only process signals addressed to us
      if (signal.to !== slotId) return;

      try {
        switch (signal.type) {
          case "offer": {
            // Create (or reuse) a peer connection and store the remote offer
            const pc = createPeerConnection();
            await pc.setRemoteDescription({
              type: "offer",
              sdp: signal.sdp,
            });
            // Flush any ICE candidates that arrived before the offer
            await flushPendingCandidates();
            break;
          }

          case "answer": {
            const pc = peerConnectionRef.current;
            if (pc && pc.signalingState === "have-local-offer") {
              await pc.setRemoteDescription({
                type: "answer",
                sdp: signal.sdp,
              });
              // Flush any ICE candidates that arrived before the answer
              await flushPendingCandidates();
            }
            break;
          }

          case "candidate": {
            if (!signal.candidate) break;
            const pc = peerConnectionRef.current;
            // If we have a PC with remote description, add immediately;
            // otherwise queue it for later.
            if (pc && pc.remoteDescription) {
              try {
                await pc.addIceCandidate(
                  new RTCIceCandidate(signal.candidate),
                );
              } catch (e) {
                console.warn("[VoiceCall] addIceCandidate failed:", e);
              }
            } else {
              pendingCandidatesRef.current.push(signal.candidate);
            }
            break;
          }

          case "hangup": {
            cleanup();
            setCallStatus("idle");
            setCallerId(null);
            break;
          }
        }
      } catch (err) {
        console.error("[VoiceCall] Signal handling error:", err);
      }
    });

    return () => unsubscribe();
  }, [slotId, createPeerConnection, cleanup, flushPendingCandidates, roomPath]);

  // ── Create audio element (once) for remote stream playback ───────────

  useEffect(() => {
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

    return () => {
      audio.srcObject = null;
      audio.remove();
    };
  }, []);

  // ── Cleanup on unmount ───────────────────────────────────────────────

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    callStatus,
    callerId,
    isMuted,
    isSpeaker,
    callDuration,
    remoteAudioLevel,
    startCall,
    answerCall,
    endCall,
    toggleMute,
    toggleSpeaker,
  };
}
