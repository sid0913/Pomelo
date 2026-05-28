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

  // Fetch chapters and progress for all courses in two queries
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

  // Build per-course stats
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
      [c.course_id]:
        (acc[c.course_id] ?? 0) + (completedChapterIds.has(c.id) ? 1 : 0),
    }),
    {}
  );

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-2xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="flex items-baseline justify-between mb-8">
          <h1 className="text-2xl font-bold text-stone-900">My courses</h1>
          <span className="text-sm text-stone-400">
            {courseList.length} course{courseList.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* New course form */}
        <div className="mb-8">
          <NewCourseForm />
        </div>

        {/* Course list */}
        {courseList.length === 0 ? (
          <div className="text-center py-16 text-stone-400">
            <p className="text-base">No courses yet.</p>
            <p className="text-sm mt-1">Enter a topic above to build your first one.</p>
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-stone-100">
            {courseList.map((course) => {
              const total = chaptersByCourse[course.id] ?? 0;
              const completed = completedByCourse[course.id] ?? 0;
              const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

              return (
                <Link
                  key={course.id}
                  href={`/courses/${course.id}`}
                  className="flex items-center gap-4 py-4 group hover:bg-white hover:rounded-lg hover:px-3 hover:-mx-3 transition-all"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-medium text-stone-900 truncate group-hover:text-orange-700 transition-colors">
                      {toTitleCase(course.topic)}
                    </p>
                    <p className="text-xs text-stone-400 mt-0.5">
                      {completed}/{total} chapters complete
                    </p>
                  </div>

                  {/* Progress bar */}
                  <div className="shrink-0 flex items-center gap-3">
                    <div className="w-20 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-orange-700 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-stone-400 w-8 text-right">
                      {pct}%
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
