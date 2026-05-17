"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";

type Status = "pending" | "generating" | "done" | "failed";

type Props = {
  chapterId: string;
  courseId: string;
  initialContent: string | null;
  initialStatus: Status;
  initialError: string | null;
  next: { id: string; title: string } | null;
};

const POLL_INTERVAL_MS = 2000;
const STILL_WORKING_MS = 8000;

export function ChapterContent({
  chapterId,
  courseId,
  initialContent,
  initialStatus,
  initialError,
  next,
}: Props) {
  const [content, setContent] = useState(initialContent ?? "");
  const [status, setStatus] = useState<Status>(initialStatus);
  const [error, setError] = useState(initialError ?? "");
  const [isStreaming, setIsStreaming] = useState(false);
  const [stillWorking, setStillWorking] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stillWorkingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Mark chapter complete when user scrolls to sentinel
  useEffect(() => {
    if (status !== "done" || completed) return;
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !completed) {
          setCompleted(true);
          void fetch(`/api/chapters/${chapterId}/progress`, { method: "PATCH" });
        }
      },
      { threshold: 1.0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [chapterId, status, completed]);

  const startGeneration = useCallback(async () => {
    setIsStreaming(true);
    setStatus("generating");
    setContent("");

    // Start still-working timer
    stillWorkingTimer.current = setTimeout(
      () => setStillWorking(true),
      STILL_WORKING_MS
    );

    try {
      const res = await fetch(`/api/chapters/${chapterId}`, { cache: "no-store" });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const contentType = res.headers.get("content-type") ?? "";

      if (contentType.includes("text/plain")) {
        // Streaming response
        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        if (!reader) throw new Error("No response body");

        let accumulated = "";
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          accumulated += chunk;
          setContent(accumulated);
          if (stillWorkingTimer.current) {
            clearTimeout(stillWorkingTimer.current);
            setStillWorking(false);
          }
        }

        setStatus("done");
        setIsStreaming(false);
      } else {
        // JSON response
        const data = await res.json();

        if (data.status === "done") {
          setContent(data.content ?? "");
          setStatus("done");
          setIsStreaming(false);
        } else if (data.status === "generating") {
          // Another request is generating — poll
          setIsStreaming(false);
          pollRef.current = setInterval(pollStatus, POLL_INTERVAL_MS);
        } else if (data.status === "failed") {
          setError(data.error ?? "Generation failed");
          setStatus("failed");
          setIsStreaming(false);
        }
      }
    } catch (err) {
      console.error("Chapter fetch error:", err);
      setError("Something went wrong. Try refreshing.");
      setStatus("failed");
      setIsStreaming(false);
    } finally {
      if (stillWorkingTimer.current) clearTimeout(stillWorkingTimer.current);
      setStillWorking(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterId]);

  async function pollStatus() {
    try {
      const res = await fetch(`/api/chapters/${chapterId}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();

      if (data.status === "done") {
        clearInterval(pollRef.current!);
        setContent(data.content ?? "");
        setStatus("done");
        setIsStreaming(false);
      } else if (data.status === "failed") {
        clearInterval(pollRef.current!);
        setError(data.error ?? "Generation failed");
        setStatus("failed");
        setIsStreaming(false);
      }
    } catch {
      // Swallow — will retry on next interval
    }
  }

  async function handleRetry() {
    setRetrying(true);
    try {
      await fetch(`/api/chapters/${chapterId}/retry`, { method: "POST" });
      setError("");
      setStatus("pending");
      void startGeneration();
    } catch {
      setError("Retry failed. Refresh and try again.");
    } finally {
      setRetrying(false);
    }
  }

  // Trigger generation on mount if not already done
  useEffect(() => {
    if (initialStatus === "done" && initialContent) return;
    void startGeneration();

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (stillWorkingTimer.current) clearTimeout(stillWorkingTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Render ────────────────────────────────────────────────────
  if (status === "failed" && !content) {
    return (
      <div className="text-center py-16">
        <p className="text-stone-500 mb-4">Couldn&apos;t generate this chapter.</p>
        <button
          onClick={handleRetry}
          disabled={retrying}
          className="rounded-lg border border-stone-300 px-4 py-2 text-sm text-stone-600 hover:border-stone-400 hover:text-stone-800 transition-colors disabled:opacity-50"
        >
          {retrying ? "Retrying…" : "Try again"}
        </button>
      </div>
    );
  }

  if ((status === "pending" || status === "generating") && !content) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-stone-500">
        <div className="w-6 h-6 rounded-full border-2 border-stone-200 border-t-amber-600 animate-spin" />
        <p className="text-sm">
          {stillWorking
            ? "This is taking a while — still working on it."
            : "Generating your chapter…"}
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Chapter prose */}
      <article
        className={`prose prose-stone prose-lg max-w-none leading-8 ${
          isStreaming ? "streaming-cursor" : ""
        }`}
        aria-live="polite"
        aria-label="Chapter content"
      >
        {content.split("\n\n").map((para, i) => (
          <p key={i} className="mb-5 text-stone-800 text-[17px] leading-[1.8]">
            {para}
          </p>
        ))}
      </article>

      {/* Scroll sentinel for auto-complete */}
      <div ref={sentinelRef} className="h-px" aria-hidden />

      {/* Post-completion CTA */}
      {status === "done" && (
        <div className="mt-12 pt-8 border-t border-stone-200 text-center">
          {next ? (
            <Link
              href={`/courses/${courseId}/chapters/${next.id}`}
              className="inline-block rounded-lg bg-amber-600 px-6 py-3 text-white font-semibold hover:bg-amber-700 transition-colors"
            >
              Next chapter →
            </Link>
          ) : (
            <div>
              <p className="text-stone-600 font-medium mb-3">
                You&apos;ve completed this course.
              </p>
              <Link
                href={`/courses/${courseId}`}
                className="text-sm text-amber-600 hover:underline"
              >
                ← Back to course
              </Link>
            </div>
          )}
        </div>
      )}
    </>
  );
}
