import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { generateSources, type UserProfile } from "@/lib/claude";
import { searchYouTube } from "@/lib/youtube";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id: chapterId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const serviceClient = createServiceClient();

  const { data: chapter } = await serviceClient
    .from("chapters")
    .select("id, enriched, videos, sources, courses!inner(user_id)")
    .eq("id", chapterId)
    .single();

  if (!chapter) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const courseData = chapter.courses;
  const course = Array.isArray(courseData) ? courseData[0] : courseData;
  if ((course as { user_id: string }).user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    ready: chapter.enriched,
    videos: chapter.videos ?? [],
    sources: chapter.sources ?? [],
  });
}

export async function POST(_req: NextRequest, { params }: Params) {
  const { id: chapterId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const serviceClient = createServiceClient();

  // Fetch chapter + course for ownership check and context
  const { data: chapter } = await serviceClient
    .from("chapters")
    .select("id, title, content, enriched, videos, sources, courses!inner(user_id, topic, user_profile)")
    .eq("id", chapterId)
    .single();

  if (!chapter) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const courseData = chapter.courses;
  const course = (Array.isArray(courseData) ? courseData[0] : courseData) as {
    user_id: string;
    topic: string;
    user_profile: UserProfile;
  };

  if (course.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Already enriched — return existing data
  if (chapter.enriched) {
    return NextResponse.json({
      ready: true,
      videos: chapter.videos ?? [],
      sources: chapter.sources ?? [],
    });
  }

  // Atomic claim: only enrich if still not enriched
  const { data: claimed } = await serviceClient
    .from("chapters")
    .update({ enriched: true })
    .eq("id", chapterId)
    .eq("enriched", false)
    .select("id")
    .single();

  if (!claimed) {
    // Another request beat us — return current state
    const { data: current } = await serviceClient
      .from("chapters")
      .select("videos, sources")
      .eq("id", chapterId)
      .single();

    return NextResponse.json({
      ready: true,
      videos: current?.videos ?? [],
      sources: current?.sources ?? [],
    });
  }

  // Run YouTube + source generation concurrently
  const searchQuery = `${chapter.title} ${course.topic}`;
  const [videos, sources] = await Promise.all([
    searchYouTube(searchQuery, 2),
    generateSources(chapter.title, course.topic, course.user_profile),
  ]);

  // Persist results
  await serviceClient
    .from("chapters")
    .update({ videos, sources })
    .eq("id", chapterId);

  return NextResponse.json({ ready: true, videos, sources });
}
