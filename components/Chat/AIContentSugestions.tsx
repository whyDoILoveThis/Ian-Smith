"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  COMBO_STORAGE_KEY,
  MESSAGES_PER_PAGE,
  THEME_COLORS,
  comboToRoomPath,
} from "./constants";
import {
  useChatFirebase,
  useChatSession,
  useChatMessages,
  useTicTacToe,
  useAIChat,
  useVoiceCall,
  useTouchIndicators,
  useDrawing,
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
} from "./components";

export default function AIContentSugestions() {
  // Core state for app flow
  const [showLockBox, setShowLockBox] = useState(false);
  const [showRealChat, setShowRealChat] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [combo, setCombo] = useState<[number, number, number, number] | null>(
    null,
  );
  const [activeTab, setActiveTab] = useState<"chat" | "room">("chat");
  const [visibleMessageCount, setVisibleMessageCount] =
    useState(MESSAGES_PER_PAGE);
  const [isCallExpanded, setIsCallExpanded] = useState(true);
  const [isVideoRecorderOpen, setIsVideoRecorderOpen] = useState(false);

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

  // Touch Indicators
  const touchIndicators = useTouchIndicators(slotId, roomPath);

  // Drawing
  const drawing = useDrawing(slotId, roomPath);

  // Check if other person is online (uses real-time presence)
  const otherPersonOnline = useMemo(() => {
    if (!slotId) return false;
    const otherSlot = slotId === "1" ? "2" : "1";
    return !!firebaseWithSlot.presence?.[otherSlot];
  }, [slotId, firebaseWithSlot.presence]);

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

  const handleConfirmImageWrapper = useCallback(async () => {
    try {
      await chatMessages.handleConfirmImage(
        session.pendingImageFile,
        session.pendingImageUrl,
        session.setPendingImageFile,
        session.setPendingImageUrl,
        session.setIsImageConfirmOpen,
      );
    } catch (err) {
      session.setError("Image failed to send.");
    }
  }, [chatMessages, session]);

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
    async (videoBlob: Blob) => {
      try {
        await chatMessages.handleSendEphemeralVideo(videoBlob);
        setIsVideoRecorderOpen(false);
      } catch {
        session.setError("Ephemeral video failed to send.");
      }
    },
    [chatMessages, session],
  );

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
  // Show call overlay when: ringing, calling, connecting, or (connected AND expanded)
  const showCallOverlay =
    voiceCall.callStatus === "ringing" ||
    voiceCall.callStatus === "calling" ||
    voiceCall.callStatus === "connecting" ||
    (voiceCall.callStatus === "connected" && isCallExpanded);

  return (
    <div className="fixed inset-0 flex flex-col bg-gradient-to-br from-neutral-950 via-neutral-900 to-black">
      {/* Voice Call Overlay */}
      {showCallOverlay && (
        <VoiceCallOverlay
          callStatus={voiceCall.callStatus}
          callerId={voiceCall.callerId}
          callerName={callerName}
          isMuted={voiceCall.isMuted}
          callDuration={voiceCall.callDuration}
          remoteAudioLevel={voiceCall.remoteAudioLevel}
          themeColors={themeColors}
          onAnswer={() => {
            voiceCall.answerCall();
            setIsCallExpanded(true);
          }}
          onEnd={voiceCall.endCall}
          onToggleMute={voiceCall.toggleMute}
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
        onStartCall={() => {
          voiceCall.startCall();
          setIsCallExpanded(true);
        }}
        selectedDrawingColor={drawing.selectedColor}
        onSelectDrawingColor={drawing.setSelectedColor}
      />

      {/* Active Call Banner (when minimized) */}
      {!isCallExpanded && voiceCall.callStatus === "connected" && (
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
            onEditPasskey={() => {
              setShowLockBox(true);
              setShowRealChat(false);
            }}
            themeColors={themeColors}
            indicatorColor={
              slotId ? firebaseWithSlot.indicatorColors?.[slotId] : undefined
            }
            onIndicatorColorChange={firebaseWithSlot.handleIndicatorColorChange}
            roomPath={roomPath}
          />
        ) : (
          <>
            <ChatMessagesView
              messages={firebaseWithSlot.messages}
              slotId={slotId}
              themeColors={themeColors}
              visibleMessageCount={visibleMessageCount}
              setVisibleMessageCount={setVisibleMessageCount}
              isOtherTyping={firebaseWithSlot.isOtherTyping}
              formatTimestamp={formatTimestamp}
              setReplyingTo={chatMessages.setReplyingTo}
              markMessageAsRead={chatMessages.markMessageAsRead}
              markReceiptAsSeen={chatMessages.markReceiptAsSeen}
              onMarkEphemeralViewed={chatMessages.markEphemeralViewed}
              onDeleteEphemeralMessage={chatMessages.deleteEphemeralMessage}
              onReact={chatMessages.toggleReaction}
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
            onStartStroke={drawing.startStroke}
            onAddPoint={drawing.addPoint}
            onEndStroke={drawing.endStroke}
            strokeDuration={drawing.STROKE_DURATION}
            fadeDuration={drawing.FADE_DURATION}
          />
        )}
    </div>
  );
}
