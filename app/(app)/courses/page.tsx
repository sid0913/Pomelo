import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { NewCourseForm } from "./NewCourseForm";
import { AppShell } from "@/app/(app)/AppShell";
import { toTitleCase } from "@/lib/format";

function getGreeting(): string {
  const h = new Date().getUTCHours();
  if (h >= 5 && h < 12) return "Good morning";
  if (h >= 12 && h < 18) return "Good afternoon";
  return "Good evening";
}

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

  const chapters = allChapters ?? [];
  const chapterIds = chapters.map((c) => c.id);

  const { data: allProgress } = chapterIds.length > 0
    ? await serviceClient
        .from("chapter_progress")
        .select("chapter_id, completed_at")
        .eq("user_id", user.id)
        .in("chapter_id", chapterIds)
        .not("completed_at", "is", null)
    : { data: [] };

  const progressRows = allProgress ?? [];
  const today = new Date().toISOString().slice(0, 10);
  const completedChapterIds = new Set(progressRows.map((p) => p.chapter_id));
  const doneToday = progressRows.filter((p) => p.completed_at?.slice(0, 10) === today).length;

  const chaptersByCourse = chapters.reduce<Record<string, number>>(
    (acc, c) => ({ ...acc, [c.course_id]: (acc[c.course_id] ?? 0) + 1 }),
    {}
  );
  const completedByCourse = chapters.reduce<Record<string, number>>(
    (acc, c) => ({
      ...acc,
      [c.course_id]: (acc[c.course_id] ?? 0) + (completedChapterIds.has(c.id) ? 1 : 0),
    }),
    {}
  );

  const displayName =
    user.user_metadata?.full_name ??
    user.email?.split("@")[0] ??
    "";

  return (
    <AppShell user={user} activePath="/courses">
      <div className="max-w-2xl mx-auto px-6 py-10">

        {/* Greeting */}
        <h1 className="font-display text-[32px] font-bold text-stone-900 mb-6">
          {getGreeting()}{displayName ? `, ${displayName}` : ""}.
        </h1>

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          <div className="rounded-xl bg-white border border-stone-200 px-4 py-4 text-center">
            <p className="font-[family-name:var(--font-data)] text-[26px] font-medium text-stone-900 leading-none mb-1 tabular-nums">
              {doneToday}
            </p>
            <p className="font-[family-name:var(--font-data)] text-[10px] uppercase tracking-widest text-stone-400">
              done today
            </p>
          </div>
          <div className="rounded-xl bg-white border border-stone-200 px-4 py-4 text-center">
            <p className="font-[family-name:var(--font-data)] text-[26px] font-medium text-stone-900 leading-none mb-1 tabular-nums">
              {courseList.length}
            </p>
            <p className="font-[family-name:var(--font-data)] text-[10px] uppercase tracking-widest text-stone-400">
              courses
            </p>
          </div>
        </div>

        {/* New course form */}
        <div className="mb-8">
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
                    <h2 className="font-display text-[17px] font-semibold text-stone-900 leading-snug truncate group-hover:text-orange-700 transition-colors mb-1.5">
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
    </AppShell>
  );
}
