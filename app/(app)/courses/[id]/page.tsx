import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { CourseDashboard } from "./CourseDashboard";
import { AppShell } from "@/app/(app)/AppShell";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ new?: string }> };

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

  return (
    <AppShell user={user} activePath="/courses">
      <CourseDashboard
        course={{ ...course, totalMinutes }}
        chapters={chapters ?? []}
        completedIds={completedIds}
        completedToday={completedToday}
        isNew={isNew === "1"}
      />
    </AppShell>
  );
}
