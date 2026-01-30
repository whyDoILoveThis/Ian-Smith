"use client";

import React, { useState, useEffect } from "react";
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

  const localKey = (fp?: string) => `portfolioBotConversations:${fp ?? "anon"}`;

  // Safe JSON parse helper
  const safeParse = <T,>(s: string | null): T | null => {
    if (!s) return null;
    try {
      return JSON.parse(s) as T;
    } catch (e) {
      console.warn("Failed to parse JSON:", e);
      return null;
    }
  };

  // Create a fresh conversation object (helper)
  const makeNewConv = (fp?: string, indexBasedTitle?: number): Conversation => {
    const id = uuidv4();
    const title =
      typeof indexBasedTitle === "number"
        ? `Conversation ${indexBasedTitle}`
        : `Conversation ${conversations.length + 1 || 1}`;
    return {
      id,
      title,
      messages: [],
      fingerprint: fp ?? undefined,
    };
  };

  // Initialize fingerprint and load local sessions (robust)
  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        const { visitorId } = await doFingerprintThing(mounted, setFingerprint);

        if (!mounted) return;

        setFingerprint((prev) => prev ?? visitorId);

        // try per-fingerprint localStorage first
        const fpKey = localKey(visitorId);
        const fpSaved = safeParse<Conversation[]>(localStorage.getItem(fpKey));
        if (fpSaved && fpSaved.length) {
          setConversations(fpSaved);
          setActiveId(fpSaved[0]?.id ?? null);
          // also ensure remote has it (best-effort)
          fbSaveConversationSessionByUser(visitorId, fpSaved).catch((err) =>
            console.error("Failed to ensure remote sessions:", err),
          );
          return;
        }

        // fallback to anon local storage
        const anonSaved = safeParse<Conversation[]>(
          localStorage.getItem(localKey()),
        );
        if (anonSaved && anonSaved.length) {
          // migrate anon -> fp key (merge w/out duplicates)
          const merged = [...anonSaved];
          localStorage.setItem(fpKey, JSON.stringify(merged));
          localStorage.removeItem(localKey());
          setConversations(merged);
          setActiveId(merged[0]?.id ?? null);
          await fbSaveConversationSessionByUser(visitorId, merged);
          return;
        }

        // if nothing found, create initial conv and persist
        const initial = makeNewConv(visitorId, 1);
        if (!mounted) return;
        setConversations([initial]);
        setActiveId(initial.id);
        localStorage.setItem(fpKey, JSON.stringify([initial]));
        await fbSaveConversationSessionByUser(visitorId, [initial]);
      } catch (err) {
        console.error("Fingerprint or session load failed:", err);
        // fallback: try anon key
        const anonSaved = safeParse<Conversation[]>(
          localStorage.getItem(localKey()),
        );
        if (anonSaved && anonSaved.length) {
          setConversations(anonSaved);
          setActiveId(anonSaved[0]?.id ?? null);
          return;
        }
        // last resort: create fresh anon conv
        const initial = makeNewConv(undefined, 1);
        setConversations([initial]);
        setActiveId(initial.id);
        localStorage.setItem(localKey(), JSON.stringify([initial]));
      }
    };

    init();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist conversations to localStorage and Firestore (when fingerprint available)
  useEffect(() => {
    // conversations can be empty during transitions; ensure there's always at least one conv
    if (!conversations || conversations.length === 0) return;

    const key = localKey(fingerprint ?? undefined);
    try {
      localStorage.setItem(key, JSON.stringify(conversations));
    } catch (e) {
      console.warn("Failed to write localStorage:", e);
    }

    if (fingerprint) {
      fbSaveConversationSessionByUser(fingerprint, conversations).catch((err) =>
        console.error("Failed to save sessions:", err),
      );
    }
  }, [conversations, fingerprint]);

  // --- Handlers ---

  // updateConversation uses functional update to avoid stale closures
  const updateConversation = (
    id: string,
    messages: Message[],
    title?: string,
  ) => {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, messages, title: title ?? c.title } : c,
      ),
    );
  };

  // Create a new conversation, but ensure we don't leave duplicates or skip when none exist
  const handleNewConversation = (fingerprintId?: string) => {
    setConversations((prev) => {
      // if an empty conversation already exists, reuse it (prevent duplicates)
      if (prev.some((c) => c.messages.length === 0)) return prev;

      const newConv = makeNewConv(fingerprintId ?? undefined, 1);
      setActiveId(newConv.id);

      return [newConv, ...prev];
    });
  };

  const handleDeleteConversation = (id: string) => {
    setConversations((prev) => {
      const filtered = prev.filter((c) => c.id !== id);
      if (filtered.length === 0) {
        const newConv = makeNewConv(fingerprint ?? undefined, 1);
        setActiveId(newConv.id);
        // persist will be handled by the conversations effect
        return [newConv];
      }
      if (id === activeId) {
        // ensure activeId moves to the first remaining
        setActiveId(filtered[0].id);
      }
      return filtered;
    });
  };

  const handleClearAll = () => {
    if (!window.confirm("Are you sure you want to clear all conversations?"))
      return;

    const fp = fingerprint ?? undefined;
    const key = localKey(fp);
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn("Failed to remove localStorage key:", e);
    }

    const newConv = makeNewConv(fp, 1);
    setConversations([newConv]);
    setActiveId(newConv.id);

    if (fp) {
      fbSaveConversationSessionByUser(fp, [newConv]).catch((err) =>
        console.error("Failed to save cleared session:", err),
      );
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const activeConversation = conversations.find((c) => c.id === activeId);
    if (!input.trim() || !activeConversation) return;

    const newMessages: Message[] = [
      ...activeConversation.messages,
      { role: "user", content: input, timestamp: Date.now() },
    ];

    // update title from first user message for empty convo
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
        { role: "assistant", content: botReply, timestamp: Date.now() },
      ]);
    } catch (err) {
      console.error(err);
      updateConversation(activeConversation.id, [
        ...newMessages,
        {
          role: "assistant",
          content: "Something went wrong on my end.",
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // render
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
