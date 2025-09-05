"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import { v4 as uuidv4 } from "uuid";
import CloseIcon from "../sub/CloseIcon";

type Message = { role: "user" | "assistant"; content: string };
type Conversation = { id: string; title: string; messages: Message[] };

interface Props {
  show: boolean;
  setShow: (show: boolean) => void;
}

export default function PortfolioBot({ show, setShow }: Props) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);

  // 🔹 Load saved convos on mount
  useEffect(() => {
    const saved = localStorage.getItem("portfolioBotConversations");
    if (saved) {
      const parsed: Conversation[] = JSON.parse(saved);
      setConversations(parsed);
      if (parsed.length > 0) setActiveId(parsed[0].id);
    } else {
      handleNewConversation();
    }
  }, []);

  // 🔹 Save whenever convos change
  useEffect(() => {
    if (conversations.length > 0) {
      localStorage.setItem(
        "portfolioBotConversations",
        JSON.stringify(conversations)
      );
    }
  }, [conversations]);

  const activeConversation = conversations.find((c) => c.id === activeId);

  // 🔹 Send a message
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !activeConversation) return;

    const newMessages = [
      ...activeConversation.messages,
      { role: "user" as const, content: input },
    ];

    // If conversation has no title, set the first user message as title
    if (activeConversation.messages.length === 0) {
      updateConversation(
        activeConversation.id,
        newMessages,
        input.slice(0, 30)
      );
    } else {
      updateConversation(activeConversation.id, newMessages);
    }

    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/its-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userMessages: newMessages }),
      });

      const data = await res.json();
      const botReply = data.reply ?? "Not sure what to say.";

      updateConversation(activeConversation.id, [
        ...newMessages,
        { role: "assistant" as const, content: botReply },
      ]);
    } catch (err) {
      console.error("Chat error:", err);
      updateConversation(activeConversation.id, [
        ...newMessages,
        {
          role: "assistant" as const,
          content: "Something went wrong on my end.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Update conversation (messages + optional title)
  const updateConversation = (
    id: string,
    messages: Message[],
    title?: string
  ) => {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, messages, title: title ?? c.title } : c
      )
    );
  };

  const handleNewConversation = () => {
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
    };
    setConversations((prev) => [newConv, ...prev]);
    setActiveId(id);
  };

  // 🔹 Delete a conversation
  const handleDeleteConversation = (id: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (id === activeId && conversations.length > 1) {
      setActiveId(conversations[0].id);
    } else if (conversations.length <= 1) {
      handleNewConversation();
    }
  };

  return (
    <div className="flex flex-col md:flex-row w-full max-w-5xl h-full border rounded-lg shadow-lg bg-white dark:bg-gray-900 transition-colors">
      {/* 🔹 Sidebar (desktop) */}
      <div className="hidden md:flex w-56 border-r dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-2 flex-col">
        <button
          onClick={handleNewConversation}
          className="mb-2 px-3 py-2 bg-blue-500 text-white rounded-lg"
        >
          ➕ New Chat
        </button>
        <div className="flex-1 overflow-y-auto space-y-1">
          {conversations.map((c) => (
            <div
              key={c.id}
              className={`flex justify-between items-center px-2 py-1 rounded cursor-pointer ${
                c.id === activeId
                  ? "bg-blue-100 dark:bg-blue-800"
                  : "hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
              onClick={() => setActiveId(c.id)}
            >
              <span className="truncate">{c.title}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteConversation(c.id);
                }}
                className="text-red-500 hover:text-red-700"
              >
                ✖
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 🔹 Mobile dropdown for convos */}
      <div className="md:hidden border-b dark:border-gray-700 bg-gray-100 dark:bg-gray-800 p-2 flex items-center justify-between">
        <button
          onClick={() => setMobileMenu(!mobileMenu)}
          className="px-3 py-2 bg-blue-500 text-white rounded-lg"
        >
          ☰ Chats
        </button>
        <button
          className="btn btn-round !border-red-400 !border-opacity-60 dark:!border-opacity-50 !text-red-300 dark:!text-red-200 text-opacity-65 dark:text-opacity-100 z-50"
          onClick={() => {
            if (setShow) {
              setShow(false);
            }
          }}
        >
          <CloseIcon />
        </button>
        {mobileMenu && (
          <div className="absolute max-w-48 top-14 left-2 right-2 bg-white dark:bg-gray-900 shadow-lg rounded-lg p-2 z-50">
            <button
              onClick={handleNewConversation}
              className="w-full mb-2 px-3 py-2 bg-blue-500 text-white rounded-lg"
            >
              ➕ New Chat
            </button>
            {conversations.map((c) => (
              <div
                key={c.id}
                className={`flex justify-between items-center px-2 py-1 rounded cursor-pointer ${
                  c.id === activeId
                    ? "bg-blue-100 dark:bg-blue-800"
                    : "hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
                onClick={() => {
                  setActiveId(c.id);
                  setMobileMenu(false);
                }}
              >
                <span className="truncate">{c.title}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteConversation(c.id);
                  }}
                  className="text-red-500 hover:text-red-700"
                >
                  ✖
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 🔹 Main chat area */}
      <div className="flex flex-col overflow-y-auto flex-1">
        <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 scrollbar-thumb-rounded-lg">
          {activeConversation?.messages.length === 0 && (
            <div className="p-6 text-center text-gray-600 dark:text-gray-300">
              <h2 className="text-xl font-bold mb-2">
                👋 Welcome to Ian’s PortfolioBot
              </h2>
              <p className="mb-4">
                This assistant knows about my skills, projects, and experience.
                Ask me anything to see if I’m a fit for your project!
              </p>
              <p className="italic text-sm">
                (All your conversations are saved automatically.)
              </p>
            </div>
          )}

          {activeConversation?.messages.map((msg, idx) => (
            <div
              key={idx}
              className={`max-w-xs px-3 py-2 rounded-lg break-words ${
                msg.role === "user"
                  ? "bg-blue-500 text-white self-end ml-auto"
                  : "bg-gray-200 text-black self-start dark:bg-gray-800 dark:text-white"
              }`}
            >
              <ReactMarkdown rehypePlugins={[rehypeHighlight]}>
                {msg.content}
              </ReactMarkdown>
            </div>
          ))}

          {loading && (
            <div className="bg-gray-200 text-black max-w-xs px-3 py-2 rounded-lg self-start animate-pulse dark:bg-gray-800 dark:text-white">
              typing...
            </div>
          )}
        </div>

        {/* Input */}
        <form
          onSubmit={handleSend}
          className="flex border-t p-2 bg-gray-50 dark:bg-gray-800 transition-colors"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Ian about his projects..."
            className="flex-1 border rounded-lg px-3 py-2 mr-2 focus:outline-none dark:bg-gray-700 dark:text-white dark:border-gray-600"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
