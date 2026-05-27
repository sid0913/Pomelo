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

  const coursesData = chapter.courses;
  const course = (Array.isArray(coursesData) ? coursesData[0] : coursesData) as {
    id: string;
    topic: string;
    user_id: string;
  };

  return (
    <div className="h-screen flex flex-col bg-stone-50 overflow-hidden">
      {/* Top nav */}
      <header className="shrink-0 border-b border-stone-200 bg-white px-4 py-3 flex items-center gap-3">
        <nav className="flex items-center gap-2 text-sm text-stone-400 flex-1 min-w-0">
          <Link
            href={`/courses/${courseId}`}
            className="hover:text-stone-600 transition-colors truncate max-w-[140px]"
          >
            {toTitleCase(course.topic)}
          </Link>
          <span className="shrink-0">→</span>
          <span className="text-stone-600 font-medium truncate">
            Ch. {chapter.chapter_index + 1} · {chapter.title}
          </span>
        </nav>
        <span className="shrink-0 text-xs text-stone-400">
          {chapter.estimated_minutes} min
        </span>
      </header>

      {/* Main split */}
      <div className="flex flex-1 overflow-hidden">
        {/* Content pane */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-6 py-10">
            <h1 className="text-3xl font-bold text-stone-900 mb-8" tabIndex={-1}>
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

            {/* Chapter navigation */}
            <div className="flex justify-between mt-16 pt-8 border-t border-stone-200 text-sm">
              {prev ? (
                <Link
                  href={`/courses/${courseId}/chapters/${prev.id}`}
                  className="text-stone-500 hover:text-stone-700 transition-colors"
                >
                  ← {prev.title}
                </Link>
              ) : (
                <span />
              )}
              {next && (
                <Link
                  href={`/courses/${courseId}/chapters/${next.id}`}
                  className="text-stone-500 hover:text-stone-700 transition-colors"
                >
                  {next.title} →
                </Link>
              )}
            </div>
          </div>
        </main>

        {/* Chat sidebar — hidden on mobile, shown on lg+ */}
        <aside className="hidden lg:flex w-80 xl:w-96 shrink-0 flex-col overflow-hidden">
          <ChapterChat chapterId={chapterId} />
        </aside>
      </div>
    </div>
  );
}
