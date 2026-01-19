"use client";

import React, { useState, useEffect, useRef } from "react";
import FingerprintJS from "@fingerprintjs/fingerprintjs";
import { v4 as uuidv4 } from "uuid";
import { Conversation, Message } from "./types";
import { Sidebar } from "./Sidebar";
import { ChatArea } from "./ChatArea";
import { MobileSidebar } from "./MobileSidebar";
import { fbSaveConversationSessionByUser } from "@/firebase/fbConversationByUser";
import { doFingerprintThing } from "./Fingerprinter";

interface Props {
  show: boolean;
  setShow: (show: boolean) => void;
}

export default function ItsBot({ show, setShow }: Props) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [fingerprint, setFingerprint] = useState<string | null>(null);

  // helper key for per-user localStorage
  const localKey = (fp?: string) => `portfolioBotConversations:${fp ?? "anon"}`;

  // Initialize fingerprint and load sessions (remote first, fallback to local)
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        // get fingerprint
        const {
          visitorId,
          os,
          browserUA,
          timezone,
          languages,
          screenResolution,
          cpuCores,
          memoryGB,
          gpuInfo,
        } = await doFingerprintThing(mounted, setFingerprint);

        console.log("🆔 visitorId:", visitorId);
        console.log("💻 os:", os);
        console.log("🌐 browserUA:", browserUA);
        console.log("⏰ timezone:", timezone);
        console.log("🗣️ languages:", languages);
        console.log("🖥️ screenResolution:", screenResolution);
        console.log("🧠 cpuCores:", cpuCores);
        console.log("💾 memoryGB:", memoryGB);
        console.log("🎮 gpuInfo:", gpuInfo);

        // fallback: check per-user localStorage
        const saved = localStorage.getItem(localKey(visitorId));
        if (saved) {
          const parsed: Conversation[] = JSON.parse(saved);
          if (!mounted) return;
          setConversations(parsed);
          setActiveId(parsed[0]?.id ?? null);
          return;
        }

        // final fallback: start a new conversation (tag it with fingerprint)
        const id = uuidv4();
        const newConv: Conversation = {
          id,
          title: "Conversation 1",
          messages: [],
          fingerprint: visitorId,
        };
        if (!mounted) return;
        setConversations([newConv]);
        setActiveId(id);
        localStorage.setItem(localKey(visitorId), JSON.stringify([newConv]));
        // also save remote doc with initial conv so user has a doc
        await fbSaveConversationSessionByUser(visitorId, [newConv]);
      } catch (err) {
        console.error("Fingerprint or session load failed", err);
        // fallback to generic localStorage if fingerprint failed
        const saved = localStorage.getItem(localKey());
        if (saved) {
          const parsed: Conversation[] = JSON.parse(saved);
          if (!mounted) return;
          setConversations(parsed);
          setActiveId(parsed[0]?.id ?? null);
        } else {
          const id = uuidv4();
          const newConv: Conversation = {
            id,
            title: "Conversation 1",
            messages: [],
          };
          if (!mounted) return;
          setConversations([newConv]);
          setActiveId(id);
        }
      }
    };

    init();
    return () => {
      mounted = false;
    };
  }, []);

  // Save to local AND remote when conversations change (grouped by fingerprint)
  useEffect(() => {
    if (!conversations) return;
    // save local per-user cache
    const key = localKey(fingerprint ?? undefined);
    localStorage.setItem(key, JSON.stringify(conversations));

    // If we have a fingerprint, persist merged to firestore
    if (fingerprint) {
      // fbSaveConversationSessionByUser handles merging by id (no duplicates)
      fbSaveConversationSessionByUser(fingerprint, conversations).catch((err) =>
        console.error("Failed to save sessions:", err),
      );
    }
  }, [conversations, fingerprint]);

  // rest of your handlers (updateConversation, handleNewConversation, etc.)
  const updateConversation = (
    id: string,
    messages: Message[],
    title?: string,
  ) =>
    setConversations((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, messages, title: title ?? c.title } : c,
      ),
    );

  const handleNewConversation = (fingerprintId?: string) => {
    const hasEmpty = conversations.some((c) => c.messages.length === 0);
    if (hasEmpty) return;

    const id = uuidv4();
    const newConv: Conversation = {
      id,
      title:
        conversations.length === 0
          ? "Conversation 1"
          : `Conversation ${conversations.length + 1}`,
      messages: [],
      fingerprint: fingerprintId ?? fingerprint ?? undefined,
    };

    setConversations((prev) => [newConv, ...prev]);
    setActiveId(id);
  };

  const handleDeleteConversation = (id: string) => {
    setConversations((prev) => {
      const filtered = prev.filter((c) => c.id !== id);
      if (filtered.length === 0) {
        // create fresh conv tied to fingerprint
        const id2 = uuidv4();
        const newConv: Conversation = {
          id: id2,
          title: "Conversation 1",
          messages: [],
          fingerprint: fingerprint ?? undefined,
        };
        setActiveId(newConv.id);
        return [newConv];
      }
      if (id === activeId) setActiveId(filtered[0].id);
      return filtered;
    });
  };

  const handleClearAll = () => {
    if (window.confirm("Are you sure you want to clear all conversations?")) {
      const key = localKey(fingerprint ?? undefined);
      localStorage.removeItem(key);
      setConversations([]);
      handleNewConversation(fingerprint ?? undefined);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const activeConversation = conversations.find((c) => c.id === activeId);
    if (!input.trim() || !activeConversation) return;

    const newMessages = [
      ...activeConversation.messages,
      { role: "user" as const, content: input, timestamp: Date.now() },
    ];

    if (activeConversation.messages.length === 0) {
      updateConversation(
        activeConversation.id,
        newMessages,
        input.slice(0, 30),
      );
    } else {
      updateConversation(activeConversation.id, newMessages);
    }

    setInput("");
    setLoading(true);

    try {
      // For API, remove timestamp
      const messagesForAPI = newMessages.map(({ role, content }) => ({
        role,
        content,
      }));

      const res = await fetch("/api/its-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userMessages: messagesForAPI }),
      });
      const data = await res.json();
      const botReply = data.reply ?? "Not sure what to say.";
      updateConversation(activeConversation.id, [
        ...newMessages,
        {
          role: "assistant" as const,
          content: botReply,
          timestamp: Date.now(),
        },
      ]);
    } catch (err) {
      console.error(err);
      updateConversation(activeConversation.id, [
        ...newMessages,
        {
          role: "assistant" as const,
          content: "Something went wrong on my end.",
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row w-full max-w-5xl h-full border rounded-lg rounded-b-none overflow-hidden shadow-lg bg-white dark:bg-gray-900 transition-colors">
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        setActiveId={setActiveId}
        editMode={editMode}
        setEditMode={setEditMode}
        handleNewConversation={() =>
          handleNewConversation(fingerprint ?? undefined)
        }
        handleDeleteConversation={handleDeleteConversation}
        handleClearAll={handleClearAll}
        setShow={setShow}
      />
      <MobileSidebar
        conversations={conversations}
        activeId={activeId}
        setActiveId={setActiveId}
        editMode={editMode}
        setEditMode={setEditMode}
        handleNewConversation={() =>
          handleNewConversation(fingerprint ?? undefined)
        }
        handleDeleteConversation={handleDeleteConversation}
        handleClearAll={handleClearAll}
        setShow={setShow}
      />
      <ChatArea
        activeConversation={
          conversations.find((c) => c.id === activeId) ?? undefined
        }
        input={input}
        setInput={setInput}
        handleSend={handleSend}
        loading={loading}
      />
    </div>
  );
}
