"use client";

import { useCallback, useRef, useState } from "react";
import { push, ref, set } from "firebase/database";
import { rtdb } from "@/lib/firebaseConfig";
import { appwrImgUp } from "@/appwrite/appwrStorage";
import { ROOM_PATH } from "../constants";
import { encryptMessage } from "../crypto";
import type { Message } from "../types";

export function useChatMessages(
  slotId: "1" | "2" | null,
  screenName: string,
  encryptionKey: CryptoKey | null,
  messages: Message[],
) {
  const [messageText, setMessageText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);

  const typingTimeoutRef = useRef<number | null>(null);
  const markedAsReadRef = useRef<Set<string>>(new Set());

  const setTypingState = useCallback(
    async (isTyping: boolean) => {
      if (!slotId) return;
      try {
        await set(ref(rtdb, `${ROOM_PATH}/typing/${slotId}`), isTyping);
      } catch {
        // ignore typing errors
      }
    },
    [slotId],
  );

  const handleSendMessage = useCallback(async () => {
    if (!slotId || !screenName.trim() || !messageText.trim() || !encryptionKey)
      return;
    setIsSending(true);

    setTypingState(false);

    try {
      // Encrypt the message before sending
      const encryptedText = await encryptMessage(
        messageText.trim(),
        encryptionKey,
      );

      const msgData: Record<string, unknown> = {
        slotId,
        sender: screenName.trim(),
        text: encryptedText, // Encrypted text goes to DB
        createdAt: { ".sv": "timestamp" },
      };

      // Add reply data if replying
      if (replyingTo) {
        msgData.replyToId = replyingTo.id;
        msgData.replyToSender = replyingTo.sender;
        msgData.replyToText = replyingTo.decryptedText?.slice(0, 100) || "";
      }

      const msgRef = ref(rtdb, `${ROOM_PATH}/messages`);
      await push(msgRef, msgData);
      setMessageText("");
      setReplyingTo(null);
    } catch {
      // Error handled by caller
      throw new Error("Message failed to send.");
    } finally {
      setIsSending(false);
    }
  }, [encryptionKey, messageText, replyingTo, screenName, setTypingState, slotId]);

  const handleImageUpload = useCallback(
    async (
      event: React.ChangeEvent<HTMLInputElement>,
      pendingImageUrl: string | null,
      setPendingImageFile: (file: File | null) => void,
      setPendingImageUrl: (url: string | null) => void,
      setPendingIsVideo: (isVideo: boolean) => void,
      setIsImageConfirmOpen: (open: boolean) => void,
    ) => {
      if (!slotId || !screenName.trim()) return;
      const file = event.target.files?.[0];
      if (!file) return;

      if (pendingImageUrl) {
        URL.revokeObjectURL(pendingImageUrl);
      }

      const previewUrl = URL.createObjectURL(file);
      setPendingImageFile(file);
      setPendingImageUrl(previewUrl);
      setPendingIsVideo(file.type.startsWith("video/"));
      setIsImageConfirmOpen(true);
      event.target.value = "";
    },
    [screenName, slotId],
  );

  const handleConfirmImage = useCallback(
    async (
      pendingImageFile: File | null,
      pendingImageUrl: string | null,
      setPendingImageFile: (file: File | null) => void,
      setPendingImageUrl: (url: string | null) => void,
      setIsImageConfirmOpen: (open: boolean) => void,
    ) => {
      if (!pendingImageFile || !slotId || !screenName.trim()) return;
      setIsSending(true);

      try {
        const upload = await appwrImgUp(pendingImageFile);
        const isVideo = pendingImageFile.type.startsWith("video/");
        const msgRef = ref(rtdb, `${ROOM_PATH}/messages`);
        
        const msgData: Record<string, unknown> = {
          slotId,
          sender: screenName.trim(),
          createdAt: { ".sv": "timestamp" },
        };
        
        if (isVideo) {
          msgData.videoUrl = upload.url;
          msgData.videoFileId = upload.fileId;
        } else {
          msgData.imageUrl = upload.url;
          msgData.imageFileId = upload.fileId;
        }
        
        await push(msgRef, msgData);
      } catch {
        throw new Error("Media failed to send.");
      } finally {
        setIsSending(false);
      }

      if (pendingImageUrl) {
        URL.revokeObjectURL(pendingImageUrl);
      }
      setPendingImageFile(null);
      setPendingImageUrl(null);
      setIsImageConfirmOpen(false);
    },
    [screenName, slotId],
  );

  const handleCancelImage = useCallback(
    (
      pendingImageUrl: string | null,
      setPendingImageFile: (file: File | null) => void,
      setPendingImageUrl: (url: string | null) => void,
      setIsImageConfirmOpen: (open: boolean) => void,
    ) => {
      if (pendingImageUrl) {
        URL.revokeObjectURL(pendingImageUrl);
      }
      setPendingImageFile(null);
      setPendingImageUrl(null);
      setIsImageConfirmOpen(false);
    },
    [],
  );

  const markMessageAsRead = useCallback(
    (msg: Message) => {
      if (!slotId) return;
      // Only mark other person's messages as read, and only once
      if (msg.slotId !== slotId && !markedAsReadRef.current.has(msg.id)) {
        markedAsReadRef.current.add(msg.id);
        const readRef = ref(
          rtdb,
          `${ROOM_PATH}/messages/${msg.id}/readBy/${slotId}`,
        );
        set(readRef, true).catch(() => {});
      }
    },
    [slotId],
  );

  const handleTypingChange = useCallback(
    (value: string) => {
      setMessageText(value);
      if (slotId) {
        setTypingState(true);
        if (typingTimeoutRef.current) {
          window.clearTimeout(typingTimeoutRef.current);
        }
        typingTimeoutRef.current = window.setTimeout(() => {
          setTypingState(false);
        }, 1200);
      }
    },
    [setTypingState, slotId],
  );

  return {
    messageText,
    setMessageText,
    isSending,
    replyingTo,
    setReplyingTo,
    handleSendMessage,
    handleImageUpload,
    handleConfirmImage,
    handleCancelImage,
    markMessageAsRead,
    handleTypingChange,
  };
}
