"use client";

import { useEffect, useRef, useState } from "react";

type Message = { role: "user" | "assistant"; content: string; timestamp: string };
type Thread = { id: string; thread_name: string; messages: Message[] };

type Props = { chapterId: string };

export function ChapterChat({ chapterId }: Props) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [newThreadName, setNewThreadName] = useState("");
  const [showNewThread, setShowNewThread] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    void loadThreads();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function loadThreads() {
    setLoadingThreads(true);
    try {
      const res = await fetch(`/api/chapters/${chapterId}/chat`);
      if (!res.ok) return;
      const data = await res.json();
      const loaded: Thread[] = data.threads ?? [];
      setThreads(loaded);
      if (loaded.length > 0) {
        setActiveThreadId(loaded[0].id);
        setMessages(loaded[0].messages ?? []);
      }
    } finally {
      setLoadingThreads(false);
    }
  }

  function switchThread(t: Thread) {
    setActiveThreadId(t.id);
    setMessages(t.messages ?? []);
    setShowNewThread(false);
  }

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setLoading(true);

    const optimisticMsg: Message = {
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    const placeholderId = activeThreadId;
    const isPlaceholder = placeholderId?.startsWith("__new__");

    try {
      const body: Record<string, string> = { message: text };
      if (activeThreadId && !isPlaceholder) {
        body.threadId = activeThreadId;
      } else {
        // New thread — send name, let server upsert it
        body.threadName = activeThread?.thread_name ?? "Main";
      }

      const res = await fetch(`/api/chapters/${chapterId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        setMessages((prev) => prev.slice(0, -1));
        return;
      }

      const data = await res.json();
      const updatedThread: Thread = {
        id: data.threadId,
        thread_name: data.threadName,
        messages: data.messages,
      };

      setActiveThreadId(updatedThread.id);
      setMessages(updatedThread.messages);
      setThreads((prev) => {
        // Replace placeholder or update existing
        const existing = prev.find((t) => t.id === updatedThread.id);
        if (existing) {
          return prev.map((t) => (t.id === updatedThread.id ? updatedThread : t));
        }
        // Remove placeholder, add real thread
        return [updatedThread, ...prev.filter((t) => t.id !== placeholderId)];
      });
    } catch {
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
      textareaRef.current?.focus();
    }
  }

  async function createThread() {
    const name = newThreadName.trim() || `Thread ${threads.length + 1}`;
    setNewThreadName("");
    setShowNewThread(false);
    setActiveThreadId(null);
    setMessages([]);

    // Thread will be created on first message send
    const placeholder: Thread = {
      id: `__new__${Date.now()}`,
      thread_name: name,
      messages: [],
    };
    setThreads((prev) => [placeholder, ...prev]);
    setActiveThreadId(placeholder.id);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  }

  const activeThread = threads.find((t) => t.id === activeThreadId);
  const isNewThread = activeThreadId?.startsWith("__new__");

  return (
    <div className="flex flex-col h-full border-l border-stone-200 bg-white">
      {/* Header */}
      <div className="shrink-0 px-4 py-3 border-b border-stone-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-stone-400 uppercase tracking-wide">
            Ask a question
          </span>
          <button
            onClick={() => setShowNewThread((v) => !v)}
            className="text-xs text-amber-600 hover:underline"
          >
            + new thread
          </button>
        </div>

        {showNewThread && (
          <div className="flex gap-1 mb-2">
            <input
              type="text"
              value={newThreadName}
              onChange={(e) => setNewThreadName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void createThread()}
              placeholder="Thread name"
              className="flex-1 text-xs border border-stone-200 rounded px-2 py-1 outline-none focus:border-amber-400"
              autoFocus
            />
            <button
              onClick={createThread}
              className="text-xs bg-amber-600 text-white rounded px-2 py-1 hover:bg-amber-700"
            >
              Create
            </button>
          </div>
        )}

        {/* Thread tabs */}
        {!loadingThreads && threads.length > 1 && (
          <div className="flex gap-1 overflow-x-auto pb-1">
            {threads.map((t) => (
              <button
                key={t.id}
                onClick={() => switchThread(t)}
                className={`shrink-0 text-xs px-2 py-1 rounded-full transition-colors ${
                  t.id === activeThreadId
                    ? "bg-amber-100 text-amber-700 font-medium"
                    : "text-stone-400 hover:text-stone-600"
                }`}
              >
                {t.thread_name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
        {loadingThreads ? (
          <div className="flex justify-center py-8">
            <div className="w-4 h-4 rounded-full border-2 border-stone-200 border-t-amber-600 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-stone-400">
              {activeThread || isNewThread
                ? "Send a message to start the conversation."
                : "Ask anything about this chapter."}
            </p>
            <div className="mt-4 flex flex-col gap-2">
              {["What's the key takeaway?", "Give me a concrete example.", "How does this connect to the bigger picture?"].map(
                (q) => (
                  <button
                    key={q}
                    onClick={() => {
                      setInput(q);
                      textareaRef.current?.focus();
                    }}
                    className="text-xs text-left text-stone-400 hover:text-amber-600 transition-colors"
                  >
                    &ldquo;{q}&rdquo;
                  </button>
                )
              )}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                  m.role === "user"
                    ? "bg-amber-600 text-white rounded-br-sm"
                    : "bg-stone-100 text-stone-800 rounded-bl-sm"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))
        )}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-stone-100 rounded-2xl rounded-bl-sm px-3 py-2">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-stone-400 animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-stone-400 animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-stone-400 animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 px-3 py-3 border-t border-stone-100">
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about this chapter…"
            rows={1}
            className="flex-1 resize-none rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-amber-400 transition-colors leading-relaxed max-h-32 overflow-y-auto"
            style={{ fieldSizing: "content" } as React.CSSProperties}
            disabled={loading}
          />
          <button
            onClick={send}
            disabled={!input.trim() || loading}
            className="shrink-0 w-8 h-8 rounded-full bg-amber-600 text-white flex items-center justify-center hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Send"
          >
            <svg
              className="w-3.5 h-3.5 rotate-90"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </button>
        </div>
        <p className="text-[10px] text-stone-300 mt-1.5 text-center">
          Enter to send · Shift+Enter for newline
        </p>
      </div>
    </div>
  );
}
