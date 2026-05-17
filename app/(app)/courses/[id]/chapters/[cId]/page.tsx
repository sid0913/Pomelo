import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { ChapterContent } from "./ChapterContent";

type Props = { params: Promise<{ id: string; cId: string }> };

export default async function ChapterPage({ params }: Props) {
  const { id: courseId, cId: chapterId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const serviceClient = createServiceClient();

  // Verify ownership + get chapter
  const { data: chapter } = await serviceClient
    .from("chapters")
    .select(
      "id, chapter_index, title, estimated_minutes, content, status, error, courses!inner(id, topic, user_id)"
    )
    .eq("id", chapterId)
    .eq("courses.user_id", user.id)
    .single();

  if (!chapter) redirect(`/courses/${courseId}`);

  // Get prev/next chapters
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
  const course = (Array.isArray(coursesData) ? coursesData[0] : coursesData) as { id: string; topic: string; user_id: string };

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-2xl mx-auto px-4 py-10">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-stone-400 mb-8">
          <Link href={`/courses/${courseId}`} className="hover:text-stone-600 transition-colors truncate max-w-[160px]">
            {course.topic}
          </Link>
          <span>→</span>
          <span className="text-stone-500">
            Chapter {chapter.chapter_index + 1}
          </span>
        </nav>

        {/* Chapter header */}
        <h1 className="text-3xl font-bold text-stone-900 mb-2" tabIndex={-1}>
          {chapter.title}
        </h1>
        <p className="text-sm text-stone-400 mb-10">
          {chapter.estimated_minutes} min read
        </p>

        {/* Content */}
        <ChapterContent
          chapterId={chapterId}
          initialContent={chapter.content}
          initialStatus={chapter.status}
          initialError={chapter.error}
          courseId={courseId}
          next={next}
        />

        {/* Navigation */}
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
    </div>
  );
}
