"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Message = { role: "user" | "assistant"; content: string };
type Status = "idle" | "loading" | "creating";

const LOADING_VERBS = [
  "thinking...",
  "exploring...",
  "course-ing...",
  "calibrating...",
  "mapping gaps...",
  "connecting ideas...",
  "charting your path...",
  "profiling...",
];

export default function NewCoursePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Topic comes from URL param or localStorage (restored after magic link)
  const [topic, setTopic] = useState<string>("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [turnCount, setTurnCount] = useState(0);
  const [verbIndex, setVerbIndex] = useState(0);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Restore topic
  useEffect(() => {
    const fromUrl = searchParams.get("topic");
    const fromStorage = localStorage.getItem("pomelo_pending_topic");
    const resolved = fromUrl || fromStorage || "";
    setTopic(resolved);

    if (resolved) {
      // Send initial greeting automatically
      void sendMessage(resolved, null, [], resolved);
    } else {
      router.replace("/");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

  useEffect(() => {
    if (status !== "loading") return;
    const interval = setInterval(
      () => setVerbIndex((i) => (i + 1) % LOADING_VERBS.length),
      2000
    );
    return () => clearInterval(interval);
  }, [status]);

  async function sendMessage(
    userText: string,
    sid: string | null,
    currentMessages: Message[],
    topicOverride?: string
  ) {
    const currentTopic = topicOverride ?? topic;
    setStatus("loading");
    setError(null);

    const newMessages: Message[] = [
      ...currentMessages,
      { role: "user", content: userText },
    ];
    setMessages(newMessages);

    try {
      const res = await fetch("/api/qualifying-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-timezone": Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        body: JSON.stringify({
          sessionId: sid ?? undefined,
          topic: sid ? undefined : currentTopic,
          userMessage: userText,
        }),
      });

      if (!res.ok) throw new Error(await res.text());

      const data = await res.json();

      if (data.done) {
        // Course created — clear pending topic and redirect
        localStorage.removeItem("pomelo_pending_topic");
        setStatus("creating");
        setTimeout(() => router.push(`/courses/${data.courseId}?new=1`), 800);
        return;
      }

      setSessionId(data.sessionId);
      setTurnCount((n) => n + 1);
      setMessages([
        ...newMessages,
        { role: "assistant", content: data.assistantMessage },
      ]);
      setStatus("idle");
      setTimeout(() => inputRef.current?.focus(), 50);
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
      setStatus("idle");
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || status !== "idle") return;
    setInput("");
    void sendMessage(text, sessionId, messages);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const text = input.trim();
      if (text && status === "idle") {
        setInput("");
        void sendMessage(text, sessionId, messages);
      }
    }
  }

  if (status === "creating") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-stone-600">
        <div className="w-8 h-8 rounded-full border-2 border-stone-200 border-t-amber-600 animate-spin" />
        <p className="text-base font-medium">Creating your personalized course…</p>
      </div>
    );
  }

  const ESTIMATED_TURNS = 7;

  return (
    <div className="flex flex-col h-screen bg-stone-50">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-stone-200 bg-white">
        <p className="text-sm text-stone-500 truncate max-w-[60%]">{topic}</p>
        {turnCount > 0 && (
          <p className="text-xs text-stone-400 whitespace-nowrap">
            Building your knowledge profile —{" "}
            {Math.min(turnCount, ESTIMATED_TURNS)} of ~{ESTIMATED_TURNS}
          </p>
        )}
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-2xl mx-auto flex flex-col gap-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-xl px-4 py-3 text-base leading-relaxed ${
                  msg.role === "user"
                    ? "bg-amber-50 text-stone-900 border border-amber-100"
                    : "bg-white text-stone-900 border border-stone-200"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {status === "loading" && (
            <div className="flex justify-start">
              <div className="bg-white border border-stone-200 rounded-xl px-4 py-3">
                <span key={verbIndex} className="verb-shimmer">
                  {LOADING_VERBS[verbIndex]}
                </span>
              </div>
            </div>
          )}

          {error && (
            <p className="text-center text-sm text-red-600">{error}</p>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-stone-200 bg-white px-4 py-3">
        <form
          onSubmit={handleSubmit}
          className="max-w-2xl mx-auto flex gap-2 items-end"
        >
          <label htmlFor="chat-input" className="sr-only">
            Your message
          </label>
          <textarea
            id="chat-input"
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your answer…"
            rows={1}
            className="flex-1 resize-none rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500 text-base leading-relaxed max-h-32 overflow-y-auto"
            disabled={status !== "idle"}
          />
          <button
            type="submit"
            className="rounded-lg bg-amber-600 px-4 py-3 text-white font-semibold hover:bg-amber-700 transition-colors disabled:opacity-40 whitespace-nowrap min-h-[48px]"
            disabled={!input.trim() || status !== "idle"}
            aria-label="Send"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
