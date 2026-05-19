"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";

type Status = "pending" | "generating" | "done" | "failed";

type VideoResult = {
  id: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
};

type Source = {
  title: string;
  type: "article" | "video" | "book" | "docs" | "other";
  description: string;
};

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

const SOURCE_ICONS: Record<Source["type"], string> = {
  article: "📄",
  video: "▶",
  book: "📖",
  docs: "📚",
  other: "🔗",
};

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

  const [videos, setVideos] = useState<VideoResult[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [enriching, setEnriching] = useState(false);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stillWorkingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const enrichedRef = useRef(false);

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

  // Trigger enrichment once content is done
  useEffect(() => {
    if (status !== "done" || enrichedRef.current) return;
    enrichedRef.current = true;
    setEnriching(true);
    fetch(`/api/chapters/${chapterId}/enrichment`, { method: "POST" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.ready) {
          setVideos(data.videos ?? []);
          setSources(data.sources ?? []);
        }
      })
      .catch(() => {})
      .finally(() => setEnriching(false));
  }, [chapterId, status]);

  const startGeneration = useCallback(async () => {
    setIsStreaming(true);
    setStatus("generating");
    setContent("");

    stillWorkingTimer.current = setTimeout(
      () => setStillWorking(true),
      STILL_WORKING_MS
    );

    try {
      const res = await fetch(`/api/chapters/${chapterId}`, { cache: "no-store" });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const contentType = res.headers.get("content-type") ?? "";

      if (contentType.includes("text/plain")) {
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
        const data = await res.json();

        if (data.status === "done") {
          setContent(data.content ?? "");
          setStatus("done");
          setIsStreaming(false);
        } else if (data.status === "generating") {
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

  useEffect(() => {
    if (initialStatus === "done" && initialContent) return;
    void startGeneration();

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (stillWorkingTimer.current) clearTimeout(stillWorkingTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

      {/* Scroll sentinel */}
      <div ref={sentinelRef} className="h-px" aria-hidden />

      {/* Enrichment: Videos */}
      {status === "done" && (enriching || videos.length > 0) && (
        <section className="mt-10">
          <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide mb-4">
            Videos
          </h2>
          {enriching && videos.length === 0 ? (
            <div className="flex items-center gap-2 text-stone-400 text-sm">
              <div className="w-4 h-4 rounded-full border border-stone-200 border-t-amber-600 animate-spin shrink-0" />
              Finding videos…
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {videos.map((v) => (
                <div key={v.id} className="rounded-xl overflow-hidden border border-stone-200">
                  <div className="relative" style={{ paddingBottom: "56.25%" }}>
                    <iframe
                      src={`https://www.youtube.com/embed/${v.id}`}
                      title={v.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="absolute inset-0 w-full h-full"
                      loading="lazy"
                    />
                  </div>
                  <div className="px-3 py-2">
                    <p className="text-sm font-medium text-stone-800 leading-snug">{v.title}</p>
                    <p className="text-xs text-stone-400 mt-0.5">{v.channelTitle}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Enrichment: Sources */}
      {status === "done" && (enriching || sources.length > 0) && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide mb-4">
            Further reading
          </h2>
          {enriching && sources.length === 0 ? (
            <div className="flex items-center gap-2 text-stone-400 text-sm">
              <div className="w-4 h-4 rounded-full border border-stone-200 border-t-amber-600 animate-spin shrink-0" />
              Curating sources…
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {sources.map((s, i) => (
                <div key={i} className="flex gap-3 py-3 border-b border-stone-100 last:border-0">
                  <span className="shrink-0 text-base" aria-label={s.type}>
                    {SOURCE_ICONS[s.type]}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-stone-800">{s.title}</p>
                    <p className="text-xs text-stone-500 mt-0.5 leading-relaxed">{s.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

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
