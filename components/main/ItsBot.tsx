"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";

export default function PortfolioBot() {
  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Append user's message
    const newMessages = [
      ...messages,
      { role: "user" as const, content: input },
    ];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/its-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userMessages: newMessages, // <-- send full conversation
        }),
      });

      const data = await res.json();

      if (data.error) {
        setMessages((prev) => [
          ...newMessages,
          {
            role: "assistant" as const,
            content: `Server error: ${data.error}`,
          },
        ]);
      } else {
        const botReply = data.reply ?? "Not sure what to say.";
        setMessages((prev) => [
          ...newMessages,
          { role: "assistant" as const, content: botReply },
        ]);
      }
    } catch (err) {
      console.error("Chat error:", err);
      setMessages((prev) => [
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

  return (
    <div className="flex flex-col w-full max-w-lg mx-auto h-[80vh] border rounded-lg shadow-lg bg-white dark:bg-gray-900 transition-colors">
      <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 scrollbar-thumb-rounded-lg">
        {messages.map((msg, idx) => (
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

      <form
        onSubmit={handleSend}
        className="flex border-t p-2 bg-gray-50 dark:bg-gray-800 transition-colors"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Ian if he's right for your project..."
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
  );
}
