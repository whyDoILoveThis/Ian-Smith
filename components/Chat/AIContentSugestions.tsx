"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { COMBO_STORAGE_KEY, THEME_COLORS, comboToRoomPath } from "./constants";

const DISGUISE_TIMEOUT_KEY = "twoWayChatDisguiseTimeout";
import {
  useChatFirebase,
  useChatSession,
  useChatMessages,
  useTicTacToe,
  useAIChat,
  useVoiceCall,
  useTouchIndicators,
  useDrawing,
  useDrawingRecorder,
  useSlots,
} from "./hooks";
import {
  LockBoxScreen,
  AIChatDisguise,
  ChatHeader,
  RoomSpotsView,
  ChatMessagesView,
  ChatInputArea,
  ImageConfirmModal,
  VoiceCallOverlay,
  ActiveCallBanner,
  VideoRecorder,
  TouchIndicatorsOverlay,
  DrawingOverlay,
  DrawingRecordPreview,
  ErrorToast,
} from "./components";
import type { Toast } from "./components";
import type { RecordedDrawingStroke } from "./types";

export default function AIContentSugestions() {
  // Core state for app flow
  const [showLockBox, setShowLockBox] = useState(false);
  const [showRealChat, setShowRealChat] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [combo, setCombo] = useState<[number, number, number, number] | null>(
    null,
  );
  const [activeTab, setActiveTab] = useState<"chat" | "room">("chat");
  const [isCallExpanded, setIsCallExpanded] = useState(true);
  const [isVideoRecorderOpen, setIsVideoRecorderOpen] = useState(false);
  const [scrollToMessageId, setScrollToMessageId] = useState<string | null>(
    null,
  );
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  // ── Toast notifications for errors/success ─────────────────────────
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastIdCounter = useRef(0);

  const showToast = useCallback(
    (message: string, type: Toast["type"] = "error") => {
      const id = String(++toastIdCounter.current);
      setToasts((prev) => [...prev, { id, message, type }]);
    },
    [],
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Disguise timeout (minutes, 0 = always show disguise / never auto-return)
  const [disguiseTimeout, setDisguiseTimeout] = useState<number>(0);
  const disguiseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load disguise timeout from localStorage on mount
  useEffect(() => {
    const stored = window.localStorage.getItem(DISGUISE_TIMEOUT_KEY);
    if (stored) setDisguiseTimeout(Number(stored) || 0);
  }, []);

  // Save disguise timeout to localStorage
  const handleSetDisguiseTimeout = useCallback((minutes: number) => {
    setDisguiseTimeout(minutes);
    window.localStorage.setItem(DISGUISE_TIMEOUT_KEY, String(minutes));
    // When switching to a timeout, record the entry time now
    if (minutes > 0) {
      window.localStorage.setItem(
        DISGUISE_TIMEOUT_KEY + "_entered",
        String(Date.now()),
      );
    } else {
      window.localStorage.removeItem(DISGUISE_TIMEOUT_KEY + "_entered");
    }
  }, []);

  // Auto-skip disguise on mount when timeout is active and hasn't expired
  useEffect(() => {
    const storedTimeout = Number(
      window.localStorage.getItem(DISGUISE_TIMEOUT_KEY) || 0,
    );
    const enteredAt = Number(
      window.localStorage.getItem(DISGUISE_TIMEOUT_KEY + "_entered") || 0,
    );
    const storedCombo = window.localStorage.getItem(COMBO_STORAGE_KEY);
    if (storedTimeout > 0 && enteredAt > 0 && storedCombo) {
      const elapsed = Date.now() - enteredAt;
      const timeoutMs = storedTimeout * 60 * 1000;
      if (elapsed < timeoutMs) {
        // Skip disguise — go straight to the room
        try {
          const parsed = JSON.parse(storedCombo);
          if (Array.isArray(parsed) && parsed.length === 4) {
            setCombo(parsed as [number, number, number, number]);
            setIsUnlocked(true);
            setShowRealChat(true);
          }
        } catch {
          /* ignore parse error */
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Record entry time when showRealChat becomes true while timeout is active
  useEffect(() => {
    if (showRealChat && disguiseTimeout > 0) {
      window.localStorage.setItem(
        DISGUISE_TIMEOUT_KEY + "_entered",
        String(Date.now()),
      );
    }
  }, [showRealChat, disguiseTimeout]);

  // ── Panic close: press "p" to instantly hide chat back to AI disguise ──
  useEffect(() => {
    const handlePanicKey = (e: KeyboardEvent) => {
      // Don't trigger when typing in an input, textarea, or contenteditable
      const tag = (e.target as HTMLElement)?.tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        (e.target as HTMLElement)?.isContentEditable
      )
        return;

      if (e.key === "p" || e.key === "P") {
        // Reset disguise timeout to 0 ("always") so it doesn't auto-skip back
        if (disguiseTimeout > 0) {
          handleSetDisguiseTimeout(0);
        }
        // Go back to AI disguise
        setShowRealChat(false);
      }
    };

    window.addEventListener("keydown", handlePanicKey);
    return () => window.removeEventListener("keydown", handlePanicKey);
  }, [disguiseTimeout, handleSetDisguiseTimeout]);

  // Auto-hide chat after timeout (go back to disguise)
  useEffect(() => {
    if (disguiseTimerRef.current) {
      clearTimeout(disguiseTimerRef.current);
      disguiseTimerRef.current = null;
    }
    if (showRealChat && disguiseTimeout > 0) {
      disguiseTimerRef.current = setTimeout(
        () => {
          setShowRealChat(false);
        },
        disguiseTimeout * 60 * 1000,
      );
    }
    return () => {
      if (disguiseTimerRef.current) clearTimeout(disguiseTimerRef.current);
    };
  }, [showRealChat, disguiseTimeout]);

  // Store combo locally (user-entered)
  useEffect(() => {
    if (combo) {
      window.localStorage.setItem(COMBO_STORAGE_KEY, JSON.stringify(combo));
    }
  }, [combo]);

  // AI Chat hook for disguise
  const aiChat = useAIChat(combo, setShowRealChat);

  // Compute the room path from the combo
  const roomPath = useMemo(() => comboToRoomPath(combo), [combo]);

  // Lightweight slots subscription (no messages / decryption)
  const slots = useSlots(isUnlocked, roomPath);

  // Session management (join/leave) — only needs slots
  const session = useChatSession(isUnlocked, slots, roomPath, combo);
  const { slotId, screenName } = session;

  // Single Firebase hook — includes messages, decryption, typing, presence, etc.
  const firebaseWithSlot = useChatFirebase(isUnlocked, combo, slotId, roomPath);
  const { encryptionKey, chatTheme, handleThemeChange } = firebaseWithSlot;

  // Surface Firebase connection errors as toasts
  useEffect(() => {
    if (firebaseWithSlot.connectionError) {
      showToast(firebaseWithSlot.connectionError);
    }
  }, [firebaseWithSlot.connectionError, showToast]);

  // Message handling
  const chatMessages = useChatMessages(
    slotId,
    screenName,
    encryptionKey,
    firebaseWithSlot.messages,
    roomPath,
  );

  // Surface message send errors as toasts
  useEffect(() => {
    if (chatMessages.sendError) {
      showToast(chatMessages.sendError);
      chatMessages.setSendError(null);
    }
  }, [chatMessages.sendError, showToast, chatMessages]);

  // Surface session errors as toasts
  useEffect(() => {
    if (session.error) {
      showToast(session.error);
      session.setError(null);
    }
  }, [session.error, showToast, session]);

  // Tic Tac Toe
  const ticTacToe = useTicTacToe(slotId, roomPath);

  // Voice Call
  const voiceCall = useVoiceCall(slotId, roomPath);

  // Auto-expand call overlay when a call starts or an incoming call rings
  useEffect(() => {
    if (
      voiceCall.callStatus === "ringing" ||
      voiceCall.callStatus === "calling" ||
      voiceCall.callStatus === "connecting"
    ) {
      setIsCallExpanded(true);
    }
  }, [voiceCall.callStatus]);

  // ── Message notifications ──────────────────────────────────────────
  const seenMessageIdsRef = React.useRef<Set<string>>(new Set());
  const notifInitializedRef = React.useRef(false);

  useEffect(() => {
    const msgs = firebaseWithSlot.messages;

    // First run or notifications off: just seed the seen set so we don't
    // blast the user with old messages when they turn notifications on.
    if (!notificationsEnabled || !slotId) {
      seenMessageIdsRef.current = new Set(msgs.map((m) => m.id));
      notifInitializedRef.current = false;
      return;
    }

    // If we just turned notifications on, seed the set and mark as
    // initialized so that only FUTURE messages trigger a notification.
    if (!notifInitializedRef.current) {
      seenMessageIdsRef.current = new Set(msgs.map((m) => m.id));
      notifInitializedRef.current = true;
      return;
    }

    const seen = seenMessageIdsRef.current;

    for (const msg of msgs) {
      if (seen.has(msg.id)) continue; // already processed
      seen.add(msg.id);

      // Only notify for messages from the OTHER user
      if (msg.slotId === slotId) continue;

      const body =
        msg.decryptedText ||
        (msg.imageUrl
          ? "Sent a photo"
          : msg.drawingData
            ? "Sent a drawing"
            : msg.videoUrl
              ? "Sent a video"
              : "New message");

      // 1. Play an audio notification beep (works everywhere)
      try {
        const audioCtx = new (
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext
        )();
        const oscillator = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        oscillator.connect(gain);
        gain.connect(audioCtx.destination);
        oscillator.frequency.value = 880;
        oscillator.type = "sine";
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(
          0.001,
          audioCtx.currentTime + 0.3,
        );
        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + 0.3);
      } catch {
        /* audio not available */
      }

      // 2. Browser / ServiceWorker notification (for when tab is in background)
      if (
        typeof Notification !== "undefined" &&
        Notification.permission === "granted"
      ) {
        const title = msg.sender || "New message";
        const options = { body, tag: msg.id, icon: "/favicon.ico" };

        // Try ServiceWorker notification first (works on mobile)
        if (navigator.serviceWorker?.controller) {
          navigator.serviceWorker.ready
            .then((reg) => reg.showNotification(title, options))
            .catch(() => {
              // Fallback to classic Notification constructor
              try {
                new Notification(title, options);
              } catch {
                /* */
              }
            });
        } else {
          try {
            new Notification(title, options);
          } catch {
            /* */
          }
        }
      }
    }
  }, [firebaseWithSlot.messages, notificationsEnabled, slotId]);

  const handleToggleNotifications = useCallback(async () => {
    if (!notificationsEnabled) {
      // Turning on — request permission if needed
      if (typeof Notification === "undefined") return;
      if (Notification.permission === "default") {
        const result = await Notification.requestPermission();
        if (result !== "granted") return;
      } else if (Notification.permission === "denied") {
        return; // can't enable, browser blocked it
      }
      setNotificationsEnabled(true);
    } else {
      setNotificationsEnabled(false);
    }
  }, [notificationsEnabled]);

  // Touch Indicators
  const touchIndicators = useTouchIndicators(slotId, roomPath);

  // Drawing
  const drawing = useDrawing(slotId, roomPath);

  // Drawing recorder
  const drawingRecorder = useDrawingRecorder();
  const [pendingDrawing, setPendingDrawing] = useState<{
    strokes: RecordedDrawingStroke[];
    duration: number;
  } | null>(null);

  // Check if other person is online (uses real-time presence)
  const otherPersonOnline = useMemo(() => {
    if (!slotId) return false;
    const otherSlot = slotId === "1" ? "2" : "1";
    return !!firebaseWithSlot.presence?.[otherSlot];
  }, [slotId, firebaseWithSlot.presence]);

  // Last seen timestamp for the other person
  const otherLastSeen = useMemo(() => {
    if (!slotId) return null;
    const otherSlot = slotId === "1" ? "2" : "1";
    return firebaseWithSlot.lastSeen?.[otherSlot] ?? null;
  }, [slotId, firebaseWithSlot.lastSeen]);

  // Get caller name for overlay
  const callerName = useMemo(() => {
    if (!voiceCall.callerId) return "Unknown";
    return slots[voiceCall.callerId]?.name || "Unknown";
  }, [voiceCall.callerId, slots]);

  const themeColors = useMemo(
    () => THEME_COLORS[chatTheme as keyof typeof THEME_COLORS],
    [chatTheme],
  );

  const formatTimestamp = useCallback((createdAt?: number | object) => {
    if (typeof createdAt !== "number") return "";
    const date = new Date(createdAt);
    if (Number.isNaN(date.getTime())) return "";
    const datePart = date.toLocaleDateString([], {
      month: "short",
      day: "numeric",
    });
    const timePart = date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${datePart} • ${timePart}`;
  }, []);

  // Image handling wrapper
  const handleImageUploadWrapper = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      chatMessages.handleImageUpload(
        e,
        session.pendingImageUrl,
        session.setPendingImageFile,
        session.setPendingImageUrl,
        session.setPendingIsVideo,
        session.setIsImageConfirmOpen,
      );
    },
    [chatMessages, session],
  );

  const handleConfirmImageWrapper = useCallback(
    async (caption: string) => {
      try {
        await chatMessages.handleConfirmImage(
          session.pendingImageFile,
          session.pendingImageUrl,
          session.setPendingImageFile,
          session.setPendingImageUrl,
          session.setIsImageConfirmOpen,
          caption,
        );
      } catch {
        showToast("Image failed to send.");
      }
    },
    [chatMessages, session, showToast],
  );

  const handleCancelImageWrapper = useCallback(() => {
    chatMessages.handleCancelImage(
      session.pendingImageUrl,
      session.setPendingImageFile,
      session.setPendingImageUrl,
      session.setIsImageConfirmOpen,
    );
  }, [chatMessages, session]);

  const handleSendMessageWrapper = useCallback(async () => {
    try {
      await chatMessages.handleSendMessage();
    } catch {
      showToast("Message failed to send.");
    }
  }, [chatMessages, showToast]);

  // Ephemeral video send handler
  const handleSendEphemeralVideoWrapper = useCallback(
    async (videoBlob: Blob, caption: string) => {
      try {
        await chatMessages.handleSendEphemeralVideo(videoBlob, caption);
        setIsVideoRecorderOpen(false);
      } catch {
        showToast("Ephemeral video failed to send.");
      }
    },
    [chatMessages, showToast],
  );

  // Drawing recording handlers
  const handleStartRecording = useCallback(() => {
    drawingRecorder.startRecording();
  }, [drawingRecorder]);

  const handleStopRecording = useCallback(() => {
    const result = drawingRecorder.stopRecording();
    if (result && result.strokes.length > 0) {
      setPendingDrawing(result);
    }
  }, [drawingRecorder]);

  const handleConfirmDrawing = useCallback(
    async (caption: string) => {
      if (!pendingDrawing) return;
      try {
        await chatMessages.handleSendDrawing(
          pendingDrawing.strokes,
          pendingDrawing.duration,
          caption,
        );
        setPendingDrawing(null);
      } catch {
        showToast("Drawing failed to send.");
      }
    },
    [pendingDrawing, chatMessages, showToast],
  );

  const handleCancelDrawing = useCallback(() => {
    setPendingDrawing(null);
  }, []);

  // LockBox screen
  if (showLockBox) {
    return (
      <LockBoxScreen
        onUnlock={(selectedCombo) => {
          setCombo(selectedCombo);
          setIsUnlocked(true);
          setShowLockBox(false);
        }}
        onBack={() => setShowLockBox(false)}
      />
    );
  }

  // AI Chat disguise
  if (!showRealChat) {
    return (
      <AIChatDisguise
        aiMessages={aiChat.aiMessages}
        aiInput={aiChat.aiInput}
        setAiInput={aiChat.setAiInput}
        isAiLoading={aiChat.isAiLoading}
        aiBottomRef={aiChat.aiBottomRef}
        handleAiSend={aiChat.handleAiSend}
        onOpenLockBox={() => setShowLockBox(true)}
      />
    );
  }

  // Main chat UI
  // Show call overlay when expanded (any active call state)
  const hasActiveCall =
    voiceCall.callStatus !== "idle" && voiceCall.callStatus !== "ended";
  const showCallOverlay = hasActiveCall && isCallExpanded;

  return (
    <div className="fixed inset-0 flex flex-col bg-gradient-to-br from-neutral-950 via-neutral-900 to-black">
      {/* Error / success toast notifications */}
      <ErrorToast toasts={toasts} onDismiss={dismissToast} />

      {/* Loading overlay while Firebase initializes */}
      {firebaseWithSlot.isLoading && (
        <div className="absolute inset-0 z-[60] flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
          <svg
            className="h-8 w-8 animate-spin text-white/70"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <p className="mt-3 text-sm text-white/60">Connecting to room...</p>
        </div>
      )}

      {/* Voice Call Overlay */}
      {showCallOverlay && (
        <VoiceCallOverlay
          callStatus={voiceCall.callStatus}
          callerId={voiceCall.callerId}
          callerName={callerName}
          isMuted={voiceCall.isMuted}
          isSpeaker={voiceCall.isSpeaker}
          callDuration={voiceCall.callDuration}
          remoteAudioLevel={voiceCall.remoteAudioLevel}
          themeColors={themeColors}
          onAnswer={() => {
            voiceCall.answerCall();
            setIsCallExpanded(true);
          }}
          onEnd={voiceCall.endCall}
          onToggleMute={voiceCall.toggleMute}
          onToggleSpeaker={voiceCall.toggleSpeaker}
          onMinimize={() => setIsCallExpanded(false)}
        />
      )}

      {/* Image Confirm Modal */}
      {session.isImageConfirmOpen && session.pendingImageUrl && (
        <ImageConfirmModal
          pendingMediaUrl={session.pendingImageUrl}
          themeColors={themeColors}
          isVideo={session.pendingIsVideo}
          isSending={chatMessages.isSending}
          onConfirm={handleConfirmImageWrapper}
          onCancel={handleCancelImageWrapper}
        />
      )}

      {/* Drawing Record Preview Modal */}
      {pendingDrawing && (
        <DrawingRecordPreview
          strokes={pendingDrawing.strokes}
          duration={pendingDrawing.duration}
          themeColors={themeColors}
          isSending={chatMessages.isSending}
          onConfirm={handleConfirmDrawing}
          onCancel={handleCancelDrawing}
        />
      )}

      {/* Video Recorder Modal */}
      {isVideoRecorderOpen && (
        <VideoRecorder
          onSend={handleSendEphemeralVideoWrapper}
          onClose={() => setIsVideoRecorderOpen(false)}
          isSending={chatMessages.isSending}
        />
      )}

      {/* Header */}
      <ChatHeader
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        chatTheme={chatTheme}
        handleThemeChange={handleThemeChange}
        slotId={slotId}
        callStatus={voiceCall.callStatus}
        otherPersonOnline={otherPersonOnline}
        otherLastSeen={otherLastSeen}
        onStartCall={() => {
          voiceCall.startCall();
          setIsCallExpanded(true);
        }}
        selectedDrawingColor={drawing.selectedColor}
        onSelectDrawingColor={drawing.setSelectedColor}
        isRecordingDrawing={drawingRecorder.isRecording}
        onStartRecording={handleStartRecording}
        onStopRecording={handleStopRecording}
        messages={firebaseWithSlot.messages}
        slots={slots}
        onScrollToMessage={(id) => setScrollToMessageId(id + ":" + Date.now())}
      />

      {/* Active Call Banner (when minimized) */}
      {!isCallExpanded && hasActiveCall && (
        <ActiveCallBanner
          callStatus={voiceCall.callStatus}
          callDuration={voiceCall.callDuration}
          isMuted={voiceCall.isMuted}
          onToggleMute={voiceCall.toggleMute}
          onEndCall={voiceCall.endCall}
          onExpand={() => setIsCallExpanded(true)}
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {activeTab === "room" ? (
          <RoomSpotsView
            slots={slots}
            slotId={slotId}
            screenName={screenName}
            setScreenName={session.setScreenName}
            availability={session.availability}
            isJoining={session.isJoining}
            isLeaving={session.isLeaving}
            error={null}
            handleJoin={session.handleJoin}
            handleLeave={session.handleLeave}
            tttState={firebaseWithSlot.tttState}
            handleTttMove={ticTacToe.handleTttMove}
            handleTttReset={ticTacToe.handleTttReset}
            combo={combo}
            onEditPasskey={
              disguiseTimeout === 0
                ? () => {
                    setShowLockBox(true);
                    setShowRealChat(false);
                  }
                : undefined
            }
            disguiseTimeout={disguiseTimeout}
            onSetDisguiseTimeout={handleSetDisguiseTimeout}
            themeColors={themeColors}
            indicatorColor={
              slotId ? firebaseWithSlot.indicatorColors?.[slotId] : undefined
            }
            onIndicatorColorChange={firebaseWithSlot.handleIndicatorColorChange}
            roomPath={roomPath}
            messages={firebaseWithSlot.messages}
            notificationsEnabled={notificationsEnabled}
            onToggleNotifications={handleToggleNotifications}
            onSetSpotPasskey={session.setSpotPasskey}
            onKickSpot={session.kickSpot}
            onClaimSpot={session.claimSpot}
            onMigrateConvo={session.migrateConvo}
          />
        ) : (
          <>
            <ChatMessagesView
              messages={firebaseWithSlot.messages}
              slotId={slotId}
              themeColors={themeColors}
              isOtherTyping={firebaseWithSlot.isOtherTyping}
              formatTimestamp={formatTimestamp}
              setReplyingTo={chatMessages.setReplyingTo}
              markMessageAsRead={chatMessages.markMessageAsRead}
              markReceiptAsSeen={chatMessages.markReceiptAsSeen}
              onMarkEphemeralViewed={chatMessages.markEphemeralViewed}
              onDeleteEphemeralMessage={chatMessages.deleteEphemeralMessage}
              onDeleteMessage={chatMessages.deleteMessage}
              onReact={chatMessages.toggleReaction}
              scrollToMessageId={scrollToMessageId}
              hasMoreOnServer={firebaseWithSlot.hasMoreOnServer}
              loadOlderFromServer={firebaseWithSlot.loadOlderFromServer}
              isLoadingOlder={firebaseWithSlot.isLoadingOlder}
            />
            <ChatInputArea
              slotId={slotId}
              messageText={chatMessages.messageText}
              isSending={chatMessages.isSending}
              replyingTo={chatMessages.replyingTo}
              themeColors={themeColors}
              chatTheme={chatTheme}
              handleTypingChange={chatMessages.handleTypingChange}
              handleSendMessage={handleSendMessageWrapper}
              handleImageUpload={handleImageUploadWrapper}
              setReplyingTo={chatMessages.setReplyingTo}
              onOpenVideoRecorder={() => setIsVideoRecorderOpen(true)}
            />
          </>
        )}
      </div>

      {/* Touch Indicators Overlay - only visible when in chat mode and not in other modals */}
      {showRealChat &&
        !showCallOverlay &&
        !session.isImageConfirmOpen &&
        !isVideoRecorderOpen &&
        !drawing.isDrawingMode && (
          <TouchIndicatorsOverlay
            touches={touchIndicators.touches}
            onTap={touchIndicators.sendTap}
            onSwipe={touchIndicators.sendSwipe}
            enabled={!!slotId}
            customColors={firebaseWithSlot.indicatorColors}
          />
        )}

      {/* Drawing Overlay - always visible when there are strokes, interactive when drawing mode is on */}
      {showRealChat &&
        !showCallOverlay &&
        !session.isImageConfirmOpen &&
        !isVideoRecorderOpen && (
          <DrawingOverlay
            strokes={drawing.strokes}
            isDrawingMode={drawing.isDrawingMode}
            onStartStroke={(x, y) => {
              drawing.startStroke(x, y);
              if (drawingRecorder.isRecording && drawing.selectedColor) {
                drawingRecorder.onStrokeStart(drawing.selectedColor);
              }
            }}
            onAddPoint={(x, y) => {
              drawing.addPoint(x, y);
              if (drawingRecorder.isRecording) {
                drawingRecorder.onStrokePoint(x, y);
              }
            }}
            onEndStroke={() => {
              drawing.endStroke();
              if (drawingRecorder.isRecording) {
                drawingRecorder.onStrokeEnd();
              }
            }}
            strokeDuration={drawing.STROKE_DURATION}
            fadeDuration={drawing.FADE_DURATION}
          />
        )}
    </div>
  );
}
