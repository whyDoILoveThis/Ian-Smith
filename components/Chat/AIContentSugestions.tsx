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
} from "./components";
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

  // Firebase subscriptions
  const chatFirebase = useChatFirebase(isUnlocked, combo, null, roomPath); // We'll update slotId after session hook
  const { slots, messages, encryptionKey, chatTheme, handleThemeChange } =
    chatFirebase;

  // Session management (join/leave)
  const session = useChatSession(isUnlocked, slots, roomPath);
  const { slotId, screenName } = session;

  // Re-initialize firebase with slotId for typing indicator
  const firebaseWithSlot = useChatFirebase(isUnlocked, combo, slotId, roomPath);

  // Message handling
  const chatMessages = useChatMessages(
    slotId,
    screenName,
    encryptionKey,
    messages,
    roomPath,
  );

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
  const prevMessageCountRef = React.useRef(0);

  useEffect(() => {
    if (!notificationsEnabled || !slotId) {
      prevMessageCountRef.current = firebaseWithSlot.messages.length;
      return;
    }
    const msgs = firebaseWithSlot.messages;
    const prevCount = prevMessageCountRef.current;
    if (msgs.length > prevCount && prevCount > 0) {
      // Find new messages from the other user
      const newMsgs = msgs.slice(prevCount);
      for (const msg of newMsgs) {
        if (msg.slotId !== slotId) {
          const body =
            msg.decryptedText ||
            (msg.imageUrl
              ? "Sent a photo"
              : msg.drawingData
                ? "Sent a drawing"
                : msg.videoUrl
                  ? "Sent a video"
                  : "New message");
          if (Notification.permission === "granted") {
            try {
              new Notification(msg.sender || "New message", {
                body,
                tag: msg.id,
                icon: "/favicon.ico",
              });
            } catch {
              /* notifications not supported in this context */
            }
          }
        }
      }
    }
    prevMessageCountRef.current = msgs.length;
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
      } catch (err) {
        session.setError("Image failed to send.");
      }
    },
    [chatMessages, session],
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
      session.setError("Message failed to send.");
    }
  }, [chatMessages, session]);

  // Ephemeral video send handler
  const handleSendEphemeralVideoWrapper = useCallback(
    async (videoBlob: Blob, caption: string) => {
      try {
        await chatMessages.handleSendEphemeralVideo(videoBlob, caption);
        setIsVideoRecorderOpen(false);
      } catch {
        session.setError("Ephemeral video failed to send.");
      }
    },
    [chatMessages, session],
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
        session.setError("Drawing failed to send.");
      }
    },
    [pendingDrawing, chatMessages, session],
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
            error={session.error}
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
