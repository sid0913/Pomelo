import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { ChapterContent } from "./ChapterContent";
import { ChapterChat } from "./ChapterChat";
import { toTitleCase } from "@/lib/format";
import type { Card } from "@/lib/cards";

function parseStoredCards(raw: unknown): Card[] | null {
  if (!Array.isArray(raw)) return null;
  const KNOWN_TYPES = new Set(["text", "video", "image", "callout"]);
  const valid = raw.filter((c) => c && typeof c === "object" && KNOWN_TYPES.has((c as { type?: unknown }).type as string));
  return valid.length > 0 ? (valid as Card[]) : null;
}

type Props = { params: Promise<{ id: string; cId: string }> };

export default async function ChapterPage({ params }: Props) {
  const { id: courseId, cId: chapterId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const serviceClient = createServiceClient();

  const { data: chapter } = await serviceClient
    .from("chapters")
    .select(
      "id, chapter_index, title, estimated_minutes, content, status, error, cards, courses!inner(id, topic, user_id)"
    )
    .eq("id", chapterId)
    .eq("courses.user_id", user.id)
    .single();

  if (!chapter) redirect(`/courses/${courseId}`);

  const { data: siblings } = await serviceClient
    .from("chapters")
    .select("id, chapter_index, title")
    .eq("course_id", courseId)
    .order("chapter_index");

  const allChapters = siblings ?? [];
  const idx = allChapters.findIndex((c) => c.id === chapterId);
  const prev = idx > 0 ? allChapters[idx - 1] : null;
  const next = idx < allChapters.length - 1 ? allChapters[idx + 1] : null;

  // Fetch completion status for TOC sidebar
  const { data: progressData } = await serviceClient
    .from("chapter_progress")
    .select("chapter_id")
    .eq("user_id", user.id)
    .in("chapter_id", allChapters.map((c) => c.id))
    .not("completed_at", "is", null);

  const completedIds = new Set((progressData ?? []).map((p) => p.chapter_id));

  const coursesData = chapter.courses;
  const course = (Array.isArray(coursesData) ? coursesData[0] : coursesData) as {
    id: string;
    topic: string;
    user_id: string;
  };

  return (
    <div className="h-screen flex flex-col bg-stone-50 overflow-hidden">

      {/* Top nav */}
      <header className="shrink-0 border-b border-stone-200 bg-white px-4 py-3 flex items-center gap-4">
        <nav className="flex items-center gap-2 text-sm text-stone-400 flex-1 min-w-0">
          <Link
            href={`/courses/${courseId}`}
            className="hover:text-stone-600 transition-colors truncate max-w-[160px] shrink-0"
          >
            {toTitleCase(course.topic)}
          </Link>
          <span className="shrink-0 text-stone-300">›</span>
          <span className="text-stone-600 font-medium truncate">
            {chapter.title}
          </span>
        </nav>
        <span className="shrink-0 font-[family-name:var(--font-data)] text-xs text-stone-400">
          {chapter.estimated_minutes} min
        </span>
      </header>

      {/* Main split */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left: TOC sidebar — xl+ only */}
        <aside className="hidden xl:flex w-52 shrink-0 flex-col border-r border-stone-200 bg-white overflow-y-auto">
          <div className="p-4 pt-5">
            <p className="font-[family-name:var(--font-data)] text-[10px] font-semibold uppercase tracking-widest text-stone-400 mb-3 px-2">
              {toTitleCase(course.topic)}
            </p>
            <nav className="flex flex-col gap-0.5">
              {allChapters.map((ch, i) => {
                const isActive = ch.id === chapterId;
                const isDone = completedIds.has(ch.id);
                return (
                  <Link
                    key={ch.id}
                    href={`/courses/${courseId}/chapters/${ch.id}`}
                    className={`flex items-start gap-2.5 px-2 py-2 rounded-lg text-[13px] leading-snug transition-colors ${
                      isActive
                        ? "bg-[#FEF3EC] text-orange-700 font-medium"
                        : "text-stone-500 hover:bg-stone-50 hover:text-stone-800"
                    }`}
                  >
                    <span className="font-[family-name:var(--font-data)] text-[10px] text-stone-400 w-4 shrink-0 text-right mt-0.5">
                      {i + 1}
                    </span>
                    <span className="flex-1 min-w-0">{ch.title}</span>
                    {isDone && !isActive && (
                      <span className="text-green-600 text-[10px] shrink-0 mt-0.5">✓</span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Center: reading content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[680px] mx-auto px-6 py-10">

            {/* Chapter overline */}
            <p className="font-[family-name:var(--font-data)] text-[11px] font-semibold uppercase tracking-widest text-stone-400 mb-3">
              Chapter {chapter.chapter_index + 1}
            </p>

            {/* Chapter title */}
            <h1
              className="font-display text-[32px] font-semibold text-stone-900 leading-snug mb-8"
              tabIndex={-1}
            >
              {chapter.title}
            </h1>

            <ChapterContent
              chapterId={chapterId}
              initialContent={chapter.content}
              initialStatus={chapter.status}
              initialError={chapter.error}
              initialCards={parseStoredCards((chapter as { cards?: unknown }).cards)}
              courseId={courseId}
              next={next}
            />

            {/* Prev / Next chapter navigation */}
            {(prev || next) && (
              <div className="flex justify-between mt-16 pt-8 border-t border-stone-200 text-sm gap-4">
                {prev ? (
                  <Link
                    href={`/courses/${courseId}/chapters/${prev.id}`}
                    className="flex items-start gap-2 text-stone-400 hover:text-stone-700 transition-colors group max-w-[45%]"
                  >
                    <span className="shrink-0 mt-0.5">←</span>
                    <span className="truncate">{prev.title}</span>
                  </Link>
                ) : <span />}
                {next && (
                  <Link
                    href={`/courses/${courseId}/chapters/${next.id}`}
                    className="flex items-start gap-2 text-stone-400 hover:text-stone-700 transition-colors group max-w-[45%] text-right ml-auto"
                  >
                    <span className="truncate">{next.title}</span>
                    <span className="shrink-0 mt-0.5">→</span>
                  </Link>
                )}
              </div>
            )}
          </div>
        </main>

        {/* Right: Chat sidebar — lg+ only */}
        <aside className="hidden lg:flex w-72 xl:w-80 shrink-0 flex-col overflow-hidden border-l border-stone-200">
          <ChapterChat chapterId={chapterId} />
        </aside>
      </div>
    </div>
  );
}
