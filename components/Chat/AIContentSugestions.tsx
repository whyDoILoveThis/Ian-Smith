"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  COMBO_STORAGE_KEY,
  MESSAGES_PER_PAGE,
  THEME_COLORS,
} from "./constants";
import {
  useChatFirebase,
  useChatSession,
  useChatMessages,
  useTicTacToe,
  useAIChat,
  useVoiceCall,
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

  // Store combo locally (user-entered)
  useEffect(() => {
    if (combo) {
      window.localStorage.setItem(COMBO_STORAGE_KEY, JSON.stringify(combo));
    }
  }, [combo]);

  // AI Chat hook for disguise
  const aiChat = useAIChat(combo, setShowRealChat);

  // Firebase subscriptions
  const { slots, messages, encryptionKey, chatTheme, handleThemeChange } =
    useChatFirebase(isUnlocked, combo, null); // We'll update slotId after session hook

  // Session management (join/leave)
  const session = useChatSession(isUnlocked, slots);
  const { slotId, screenName } = session;

  // Re-initialize firebase with slotId for typing indicator
  const firebaseWithSlot = useChatFirebase(isUnlocked, combo, slotId);

  // Message handling
  const chatMessages = useChatMessages(
    slotId,
    screenName,
    encryptionKey,
    messages,
  );

  // Tic Tac Toe
  const ticTacToe = useTicTacToe(slotId);

  // Voice Call
  const voiceCall = useVoiceCall(slotId);

  // Check if other person is online
  const otherPersonOnline = useMemo(() => {
    if (!slotId) return false;
    const otherSlot = slotId === "1" ? "2" : "1";
    return !!slots[otherSlot]?.name;
  }, [slotId, slots]);

  // Get caller name for overlay
  const callerName = useMemo(() => {
    if (!voiceCall.callerId) return "Unknown";
    return slots[voiceCall.callerId]?.name || "Unknown";
  }, [voiceCall.callerId, slots]);

  const themeColors = useMemo(() => THEME_COLORS[chatTheme], [chatTheme]);

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
          isVideo={session.pendingIsVideo}
          isSending={chatMessages.isSending}
          onConfirm={handleConfirmImageWrapper}
          onCancel={handleCancelImageWrapper}
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
            />
            <ChatInputArea
              slotId={slotId}
              messageText={chatMessages.messageText}
              isSending={chatMessages.isSending}
              replyingTo={chatMessages.replyingTo}
              themeColors={themeColors}
              handleTypingChange={chatMessages.handleTypingChange}
              handleSendMessage={handleSendMessageWrapper}
              handleImageUpload={handleImageUploadWrapper}
              setReplyingTo={chatMessages.setReplyingTo}
            />
          </>
        )}
      </div>
    </div>
  );
}
