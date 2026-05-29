import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { NewCourseForm } from "./NewCourseForm";
import { toTitleCase } from "@/lib/format";

export default async function CoursesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const serviceClient = createServiceClient();

  const { data: courses } = await serviceClient
    .from("courses")
    .select("id, topic, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const courseList = courses ?? [];
  const courseIds = courseList.map((c) => c.id);

  const { data: allChapters } = courseIds.length > 0
    ? await serviceClient
        .from("chapters")
        .select("id, course_id")
        .in("course_id", courseIds)
    : { data: [] };

  const chapterIds = (allChapters ?? []).map((c) => c.id);

  const { data: allProgress } = chapterIds.length > 0
    ? await serviceClient
        .from("chapter_progress")
        .select("chapter_id, completed_at")
        .eq("user_id", user.id)
        .in("chapter_id", chapterIds)
        .not("completed_at", "is", null)
    : { data: [] };

  const chaptersByCourse = (allChapters ?? []).reduce<Record<string, number>>(
    (acc, c) => ({ ...acc, [c.course_id]: (acc[c.course_id] ?? 0) + 1 }),
    {}
  );

  const completedChapterIds = new Set(
    (allProgress ?? []).map((p) => p.chapter_id)
  );
  const completedByCourse = (allChapters ?? []).reduce<Record<string, number>>(
    (acc, c) => ({
      ...acc,
      [c.course_id]: (acc[c.course_id] ?? 0) + (completedChapterIds.has(c.id) ? 1 : 0),
    }),
    {}
  );

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-2xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-baseline justify-between mb-6">
            <h1 className="font-display text-[28px] font-bold text-stone-900">
              My courses
            </h1>
            {courseList.length > 0 && (
              <span className="font-[family-name:var(--font-data)] text-xs text-stone-400">
                {courseList.length} course{courseList.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {/* New course form */}
          <NewCourseForm />
        </div>

        {/* Course list */}
        {courseList.length === 0 ? (
          <div className="text-center py-20">
            <p className="font-display text-xl font-semibold italic text-stone-400 mb-2">
              Nothing here yet.
            </p>
            <p className="text-stone-400 text-sm">
              Enter a topic above — we&apos;ll ask you five questions, then build your first course.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {courseList.map((course) => {
              const total = chaptersByCourse[course.id] ?? 0;
              const completed = completedByCourse[course.id] ?? 0;
              const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

              return (
                <Link
                  key={course.id}
                  href={`/courses/${course.id}`}
                  className="group flex items-center gap-4 rounded-xl bg-white border border-stone-200 hover:border-orange-200 hover:shadow-sm px-5 py-4 transition-all"
                >
                  <div className="flex-1 min-w-0">
                    <h2 className="font-display text-[18px] font-semibold text-stone-900 leading-snug truncate group-hover:text-orange-700 transition-colors mb-1">
                      {toTitleCase(course.topic)}
                    </h2>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-1 bg-stone-100 rounded-full overflow-hidden max-w-[120px]">
                        <div
                          className="h-full bg-orange-700 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="font-[family-name:var(--font-data)] text-[11px] text-stone-400">
                        {completed}/{total} chapters
                      </span>
                    </div>
                  </div>
                  <span className="text-stone-300 group-hover:text-orange-700 transition-colors text-base shrink-0">
                    →
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
