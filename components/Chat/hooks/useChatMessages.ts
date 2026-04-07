"use client";

import { useCallback, useRef, useState } from "react";
import { push, ref, set, update, remove } from "firebase/database";
import { rtdb } from "@/lib/firebaseConfig";
import { appwrImgUp, appwrImgDelete } from "@/appwrite/appwrStorage";
import { encryptMessage } from "../crypto";
import type { Message, RecordedDrawingStroke } from "../types";

export function useChatMessages(
  slotId: "1" | "2" | null,
  screenName: string,
  encryptionKey: CryptoKey | null,
  messages: Message[],
  roomPath: string,
  useFallbackBucket: boolean = false,
) {
  const [messageText, setMessageText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [lastUploadUsedFallback, setLastUploadUsedFallback] = useState(false);

  const typingTimeoutRef = useRef<number | null>(null);
  const localPulseKeyRef = useRef(0);
  const [localPulseKey, setLocalPulseKey] = useState(0);
  const markedAsReadRef = useRef<Set<string>>(new Set());
  const markedReceiptAsSeenRef = useRef<Set<string>>(new Set());

  const setTypingState = useCallback(
    async (isTyping: boolean) => {
      if (!slotId) return;
      try {
        await set(ref(rtdb, `${roomPath}/typing/${slotId}`), isTyping);
      } catch {
        // ignore typing errors
      }
    },
    [slotId, roomPath],
  );

  const handleSendMessage = useCallback(async () => {
    if (!slotId || !screenName.trim() || !messageText.trim() || !encryptionKey)
      return;
    setIsSending(true);
    setSendError(null);

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
        msgData.replyToText = replyingTo.decryptedText?.slice(0, 100)
          || (replyingTo.imageUrl ? "📷 Image" : "")
          || (replyingTo.drawingData?.length ? "🎨 Drawing" : "")
          || (replyingTo.videoUrl ? "📹 Video" : "");
        if (replyingTo.imageUrl) {
          msgData.replyToImageUrl = replyingTo.imageUrl;
        }
      }

      const msgRef = ref(rtdb, `${roomPath}/messages`);
      await push(msgRef, msgData);
      setMessageText("");
      setReplyingTo(null);
    } catch {
      setSendError("Message failed to send.");
      throw new Error("Message failed to send.");
    } finally {
      setIsSending(false);
    }
  }, [encryptionKey, messageText, replyingTo, screenName, setTypingState, slotId, roomPath]);

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
      caption?: string,
    ) => {
      if (!pendingImageFile || !slotId || !screenName.trim()) return;
      setIsSending(true);

      try {
        const upload = await appwrImgUp(pendingImageFile, { useFallbackBucket });
        const isVideo = pendingImageFile.type.startsWith("video/");
        const msgRef = ref(rtdb, `${roomPath}/messages`);
        
        const msgData: Record<string, unknown> = {
          slotId,
          sender: screenName.trim(),
          createdAt: { ".sv": "timestamp" },
        };

        if (caption?.trim() && encryptionKey) {
          msgData.text = await encryptMessage(caption.trim(), encryptionKey);
        }
        
        if (isVideo) {
          msgData.videoUrl = upload.url;
          msgData.videoFileId = upload.fileId;
        } else {
          msgData.imageUrl = upload.url;
          msgData.imageFileId = upload.fileId;
        }
        msgData.mediaBucket = useFallbackBucket ? "2" : "1";
        
        await push(msgRef, msgData);
        if (useFallbackBucket) setLastUploadUsedFallback(true);
      } catch {
        setSendError("Media failed to send.");
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
    [screenName, slotId, roomPath, encryptionKey, useFallbackBucket],
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
          `${roomPath}/messages/${msg.id}/readBy/${slotId}`,
        );
        set(readRef, true).catch(() => {});
      }
    },
    [slotId, roomPath],
  );

  // Mark that I've seen my read receipt (so they know I saw that they saw it)
  const markReceiptAsSeen = useCallback(
    (msg: Message) => {
      if (!slotId) return;
      const otherSlot = slotId === "1" ? "2" : "1";
      // Only for my messages that the other person has read
      if (
        msg.slotId === slotId &&
        msg.readBy?.[otherSlot] &&
        !markedReceiptAsSeenRef.current.has(msg.id)
      ) {
        markedReceiptAsSeenRef.current.add(msg.id);
        const seenRef = ref(
          rtdb,
          `${roomPath}/messages/${msg.id}/seenReceiptBy/${slotId}`,
        );
        set(seenRef, true).catch(() => {});
      }
    },
    [slotId, roomPath],
  );

  const sendKeystrokePulse = useCallback(() => {
    if (!slotId) return;
    set(ref(rtdb, `${roomPath}/keystrokePulse/${slotId}`), Date.now()).catch(() => {});
  }, [slotId, roomPath]);

  const sendBackspacePulse = useCallback(() => {
    if (!slotId) return;
    set(ref(rtdb, `${roomPath}/backspacePulse/${slotId}`), Date.now()).catch(() => {});
  }, [slotId, roomPath]);

  const handleTypingChange = useCallback(
    (value: string) => {
      setMessageText(value);
      if (slotId) {
        // Trigger local pulse immediately
        localPulseKeyRef.current += 1;
        setLocalPulseKey(localPulseKeyRef.current);
        // Broadcast keystroke pulse to other side
        sendKeystrokePulse();
        setTypingState(true);
        if (typingTimeoutRef.current) {
          window.clearTimeout(typingTimeoutRef.current);
        }
        typingTimeoutRef.current = window.setTimeout(() => {
          setTypingState(false);
        }, 1200);
      }
    },
    [setTypingState, slotId, sendKeystrokePulse],
  );

  // Handle sending ephemeral video (recorded in-app)
  const handleSendEphemeralVideo = useCallback(
    async (videoBlob: Blob, caption?: string) => {
      if (!slotId || !screenName.trim()) return;
      setIsSending(true);

      try {
        // Convert blob to file for upload
        const videoFile = new File([videoBlob], `ephemeral-${Date.now()}.webm`, {
          type: videoBlob.type || "video/webm",
        });

        const upload = await appwrImgUp(videoFile, { useFallbackBucket });
        const msgRef = ref(rtdb, `${roomPath}/messages`);

        const msgData: Record<string, unknown> = {
          slotId,
          sender: screenName.trim(),
          videoUrl: upload.url,
          videoFileId: upload.fileId,
          mediaBucket: useFallbackBucket ? "2" : "1",
          isEphemeral: true,
          createdAt: { ".sv": "timestamp" },
        };

        if (caption?.trim() && encryptionKey) {
          msgData.text = await encryptMessage(caption.trim(), encryptionKey);
        }

        await push(msgRef, msgData);
        if (useFallbackBucket) setLastUploadUsedFallback(true);
      } catch {
        setSendError("Ephemeral video failed to send.");
        throw new Error("Ephemeral video failed to send.");
      } finally {
        setIsSending(false);
      }
    },
    [screenName, slotId, roomPath, encryptionKey, useFallbackBucket],
  );

  // Handle sending ephemeral photo (from file picker or gallery)
  const handleSendEphemeralPhoto = useCallback(
    async (imageFile: File, duration: number, caption?: string) => {
      if (!slotId || !screenName.trim()) return;
      setIsSending(true);

      try {
        const upload = await appwrImgUp(imageFile, { useFallbackBucket });
        const msgRef = ref(rtdb, `${roomPath}/messages`);

        const msgData: Record<string, unknown> = {
          slotId,
          sender: screenName.trim(),
          imageUrl: upload.url,
          imageFileId: upload.fileId,
          mediaBucket: useFallbackBucket ? "2" : "1",
          isEphemeral: true,
          ephemeralDuration: duration,
          createdAt: { ".sv": "timestamp" },
        };

        if (caption?.trim() && encryptionKey) {
          msgData.text = await encryptMessage(caption.trim(), encryptionKey);
        }

        await push(msgRef, msgData);
        if (useFallbackBucket) setLastUploadUsedFallback(true);
      } catch {
        setSendError("Ephemeral photo failed to send.");
        throw new Error("Ephemeral photo failed to send.");
      } finally {
        setIsSending(false);
      }
    },
    [screenName, slotId, roomPath, encryptionKey, useFallbackBucket],
  );

  // Handle sending a recorded drawing
  const handleSendDrawing = useCallback(
    async (strokes: RecordedDrawingStroke[], duration: number, caption?: string) => {
      if (!slotId || !screenName.trim() || strokes.length === 0) return;
      setIsSending(true);

      try {
        const msgRef = ref(rtdb, `${roomPath}/messages`);
        const msgData: Record<string, unknown> = {
          slotId,
          sender: screenName.trim(),
          drawingData: strokes,
          drawingDuration: duration,
          createdAt: { ".sv": "timestamp" },
        };

        if (caption?.trim() && encryptionKey) {
          msgData.text = await encryptMessage(caption.trim(), encryptionKey);
        }

        await push(msgRef, msgData);
      } catch {
        setSendError("Drawing failed to send.");
        throw new Error("Drawing failed to send.");
      } finally {
        setIsSending(false);
      }
    },
    [screenName, slotId, roomPath, encryptionKey],
  );

  // Mark ephemeral video as viewed by current user
  const markEphemeralViewed = useCallback(
    async (messageId: string) => {
      if (!slotId) return;
      try {
        const viewedRef = ref(
          rtdb,
          `${roomPath}/messages/${messageId}/viewedBy/${slotId}`,
        );
        await set(viewedRef, true);
      } catch {
        // Ignore errors
      }
    },
    [slotId, roomPath],
  );

  // Delete ephemeral video completely from Appwrite storage and Firebase
  const deleteEphemeralMessage = useCallback(
    async (messageId: string, videoFileId?: string, imageFileId?: string) => {
      if (!slotId) return;
      try {
        // Delete video file from Appwrite storage
        if (videoFileId) {
          try {
            await appwrImgDelete(videoFileId);
            console.log(`✅ Deleted ephemeral video from Appwrite: ${videoFileId}`);
          } catch (err) {
            console.error("Failed to delete video from Appwrite:", err);
          }
        }
        // Delete image file from Appwrite storage
        if (imageFileId) {
          try {
            await appwrImgDelete(imageFileId);
            console.log(`✅ Deleted ephemeral photo from Appwrite: ${imageFileId}`);
          } catch (err) {
            console.error("Failed to delete image from Appwrite:", err);
          }
        }

        // Delete message from Firebase
        const messageRef = ref(rtdb, `${roomPath}/messages/${messageId}`);
        await remove(messageRef);
        console.log(`✅ Deleted ephemeral message from Firebase: ${messageId}`);
      } catch (err) {
        console.error("Failed to delete ephemeral message:", err);
      }
    },
    [slotId, roomPath],
  );

  // Delete any message (only call for own messages)
  const deleteMessage = useCallback(
    async (messageId: string, imageFileId?: string, videoFileId?: string) => {
      if (!slotId) return;
      try {
        // Clean up Appwrite files if present
        if (imageFileId) {
          try {
            await appwrImgDelete(imageFileId);
          } catch (err) {
            console.error("Failed to delete image from Appwrite:", err);
          }
        }
        if (videoFileId) {
          try {
            await appwrImgDelete(videoFileId);
          } catch (err) {
            console.error("Failed to delete video from Appwrite:", err);
          }
        }

        const messageRef = ref(rtdb, `${roomPath}/messages/${messageId}`);
        await remove(messageRef);
      } catch (err) {
        console.error("Failed to delete message:", err);
      }
    },
    [slotId, roomPath],
  );

  // Toggle an emoji reaction on a message
  const toggleReaction = useCallback(
    async (messageId: string, emoji: string) => {
      if (!slotId) return;
      const reactionRef = ref(
        rtdb,
        `${roomPath}/messages/${messageId}/reactions/${emoji}/${slotId}`,
      );
      // Check current state from local messages
      const msg = messages.find((m) => m.id === messageId);
      const alreadyReacted = !!msg?.reactions?.[emoji]?.[slotId];
      try {
        if (alreadyReacted) {
          await set(reactionRef, null);
        } else {
          await set(reactionRef, true);
        }
      } catch (err) {
        console.error("Failed to toggle reaction:", err);
      }
    },
    [slotId, roomPath, messages],
  );

  // Set or clear a per-message background color
  const setMessageBgColor = useCallback(
    async (messageId: string, color: string | null) => {
      const bgRef = ref(rtdb, `${roomPath}/messages/${messageId}/bgColor`);
      try {
        await set(bgRef, color);
      } catch (err) {
        console.error("Failed to set message bg color:", err);
      }
    },
    [roomPath],
  );

  // Set or clear per-message background emojis
  const setMessageBgEmojis = useCallback(
    async (messageId: string, data: { emojis: string[]; density: number } | null) => {
      const bgRef = ref(rtdb, `${roomPath}/messages/${messageId}/bgEmojis`);
      try {
        await set(bgRef, data);
      } catch (err) {
        console.error("Failed to set message bg emojis:", err);
      }
    },
    [roomPath],
  );

  return {
    messageText,
    setMessageText,
    isSending,
    sendError,
    setSendError,
    lastUploadUsedFallback,
    setLastUploadUsedFallback,
    replyingTo,
    setReplyingTo,
    handleSendMessage,
    handleImageUpload,
    handleConfirmImage,
    handleCancelImage,
    markMessageAsRead,
    markReceiptAsSeen,
    handleTypingChange,
    localPulseKey,
    sendBackspacePulse,
    handleSendEphemeralVideo,
    handleSendEphemeralPhoto,
    handleSendDrawing,
    markEphemeralViewed,
    deleteEphemeralMessage,
    deleteMessage,
    toggleReaction,
    setMessageBgColor,
    setMessageBgEmojis,
  };
}
