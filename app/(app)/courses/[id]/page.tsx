import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { CourseDashboard } from "./CourseDashboard";
import { AppShell } from "@/app/(app)/AppShell";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ new?: string }> };

function computeStreak(completedDates: string[]): number {
  if (completedDates.length === 0) return 0;

  const today = new Date().toISOString().slice(0, 10);
  const dayBefore = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

  const activeDays = new Set(completedDates.map((d) => d.slice(0, 10)));

  // Streak only counts if user completed something today or yesterday
  if (!activeDays.has(today) && !activeDays.has(dayBefore)) return 0;

  let streak = 0;
  let cursor = activeDays.has(today) ? new Date(today) : new Date(dayBefore);

  while (true) {
    const dateStr = cursor.toISOString().slice(0, 10);
    if (!activeDays.has(dateStr)) break;
    streak++;
    cursor = new Date(cursor.getTime() - 86_400_000);
  }

  return streak;
}

export default async function CoursePage({ params, searchParams }: Props) {
  const { id } = await params;
  const { new: isNew } = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const serviceClient = createServiceClient();

  const { data: course } = await serviceClient
    .from("courses")
    .select("id, topic, daily_goal, created_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!course) redirect("/");

  const { data: chapters } = await serviceClient
    .from("chapters")
    .select("id, chapter_index, title, estimated_minutes, status")
    .eq("course_id", id)
    .order("chapter_index");

  // Progress for this course (for daily goal + completion status)
  const { data: progress } = await serviceClient
    .from("chapter_progress")
    .select("chapter_id, completed_at")
    .eq("user_id", user.id)
    .in("chapter_id", (chapters ?? []).map((c) => c.id));

  // All user progress (across all courses) for streak computation
  const { data: allProgress } = await serviceClient
    .from("chapter_progress")
    .select("completed_at")
    .eq("user_id", user.id)
    .not("completed_at", "is", null);

  const completedIds = new Set(
    (progress ?? []).filter((p) => p.completed_at).map((p) => p.chapter_id)
  );

  const completedToday = (progress ?? []).filter((p) => {
    if (!p.completed_at) return false;
    return p.completed_at.slice(0, 10) === new Date().toISOString().slice(0, 10);
  }).length;

  const totalMinutes = (chapters ?? []).reduce(
    (sum, c) => sum + c.estimated_minutes,
    0
  );

  const streak = computeStreak(
    (allProgress ?? []).map((p) => p.completed_at as string)
  );

  return (
    <AppShell user={user} activePath="/courses">
      <CourseDashboard
        course={{ ...course, totalMinutes }}
        chapters={chapters ?? []}
        completedIds={completedIds}
        completedToday={completedToday}
        streak={streak}
        isNew={isNew === "1"}
      />
    </AppShell>
  );
}
