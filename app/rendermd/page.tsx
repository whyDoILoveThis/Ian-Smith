"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import type { Components } from "react-markdown";

const mdComponents: Components = {
  code({ className, children, ...props }: any) {
    const match = /language-(\w+)/.exec(className || "");
    const codeString = String(children).replace(/\n$/, "");

    if (match) {
      return (
        <SyntaxHighlighter
          style={oneDark as any}
          language={match[1]}
          PreTag="div"
        >
          {codeString}
        </SyntaxHighlighter>
      );
    }

    // Block code without a language (e.g. ASCII diagrams)
    const isBlock = codeString.includes("\n");
    if (isBlock) {
      return (
        <code
          className="block bg-[#282c34] text-white/80 p-4 rounded-xl text-sm font-mono whitespace-pre overflow-x-auto"
          {...props}
        >
          {children}
        </code>
      );
    }

    return (
      <code
        className="bg-white/10 text-pink-300 px-1.5 py-0.5 rounded text-sm font-mono"
        {...props}
      >
        {children}
      </code>
    );
  },
  pre: ({ children }: any) => (
    <div className="my-4 rounded-xl overflow-hidden border border-white/10">
      {children}
    </div>
  ),
  h1: (props: any) => (
    <h1
      className="text-3xl font-bold my-5 text-white/95 border-b border-white/10 pb-3"
      {...props}
    />
  ),
  h2: (props: any) => (
    <h2
      className="text-2xl font-semibold my-4 text-white/90 border-b border-white/10 pb-2"
      {...props}
    />
  ),
  h3: (props: any) => (
    <h3 className="text-xl font-semibold my-3 text-white/85" {...props} />
  ),
  h4: (props: any) => (
    <h4 className="text-lg font-semibold my-2 text-white/80" {...props} />
  ),
  p: (props: any) => (
    <p className="my-2 text-white/70 leading-relaxed" {...props} />
  ),
  a: (props: any) => (
    <a
      className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 transition-colors"
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    />
  ),
  ul: (props: any) => (
    <ul className="my-2 ml-5 list-disc space-y-1" {...props} />
  ),
  ol: (props: any) => (
    <ol className="my-2 ml-5 list-decimal space-y-1" {...props} />
  ),
  li: (props: any) => <li className="text-white/70" {...props} />,
  table: (props: any) => (
    <div className="overflow-x-auto my-4 rounded-lg border border-white/10">
      <table className="min-w-full border-collapse" {...props} />
    </div>
  ),
  thead: (props: any) => <thead className="bg-white/5" {...props} />,
  th: (props: any) => (
    <th
      className="border border-white/10 px-3 py-2 text-left font-semibold text-white/80 text-sm"
      {...props}
    />
  ),
  td: (props: any) => (
    <td
      className="border border-white/10 px-3 py-2 text-white/65 text-sm"
      {...props}
    />
  ),
  blockquote: (props: any) => (
    <blockquote
      className="border-l-4 border-cyan-400/50 pl-4 my-3 text-white/50 italic"
      {...props}
    />
  ),
  hr: () => <hr className="my-8 border-white/10" />,
  strong: (props: any) => (
    <strong className="text-white/90 font-semibold" {...props} />
  ),
  em: (props: any) => <em className="text-white/75" {...props} />,
};

export default function MarkdownPage() {
  const [content, setContent] = useState("");
  const [fileName, setFileName] = useState("");
  const [mounted, setMounted] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => setMounted(true), []);

  const handleFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setContent(await file.text());
      setFileName(file.name);
    },
    [],
  );

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setContent(text);
        setFileName("clipboard");
      }
    } catch {
      alert("Clipboard access denied. Please allow clipboard permissions.");
    }
  }, []);

  const handleClear = useCallback(() => {
    setContent("");
    setFileName("");
    if (fileRef.current) fileRef.current.value = "";
  }, []);

  return (
    <div className="fixed inset-0 bg-[#0a0a0f] text-white overflow-y-auto z-50">
      {/* Ambient glow orbs */}
      <div className="fixed inset-0 pointer-events-none blur-lg">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-cyan-500/[0.08] rounded-full" />
        <div className="absolute top-1/3 -right-32 w-80 h-80 bg-violet-500/[0.08] rounded-full" />
        <div className="absolute -bottom-20 left-1/3 w-72 h-72 bg-pink-500/[0.06] rounded-full" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-cyan-400 via-violet-400 to-pink-400 bg-clip-text text-transparent">
            Markdown Viewer
          </h1>
          <p className="mt-2 text-sm text-white/30">
            Drop a file or paste from clipboard
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-3 mb-8 flex-wrap">
          <label className="group relative cursor-pointer">
            <input
              ref={fileRef}
              type="file"
              accept=".md,.mdx,.txt"
              onChange={handleFile}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white/70 hover:bg-white/10 hover:text-white/90 hover:border-white/20 transition-all">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 16V4m0 0L8 8m4-4l4 4M4 20h16"
                />
              </svg>
              Choose File
            </span>
          </label>

          <button
            onClick={handlePaste}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white/70 hover:bg-white/10 hover:text-white/90 hover:border-white/20 transition-all cursor-pointer"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 5h6"
              />
            </svg>
            Paste from Clipboard
          </button>

          {content && (
            <button
              onClick={handleClear}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-red-500/20 text-sm text-red-400/70 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 transition-all cursor-pointer"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
              Clear
            </button>
          )}
        </div>

        {/* Source indicator */}
        {fileName && (
          <div className="text-center mb-6">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-white/40">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/80" />
              {fileName}
            </span>
          </div>
        )}

        {/* Content */}
        {content && mounted ? (
          <div className="rounded-2xl bg-white/[0.03] border border-white/[0.07] p-8 md:p-10 shadow-2xl shadow-black/20">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={mdComponents}
            >
              {content}
            </ReactMarkdown>
          </div>
        ) : !content ? (
          <div className="rounded-2xl bg-white/[0.02] border border-dashed border-white/10 p-16 text-center">
            <div className="text-white/15 text-6xl mb-4">◇</div>
            <p className="text-white/25 text-sm">No markdown loaded yet</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
