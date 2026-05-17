import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { anthropic, CHAPTER_MODEL, buildChapterPrompt } from "@/lib/claude";

const STALE_GENERATING_MS = 90_000;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return new Response("Unauthorized", { status: 401 });

  const serviceClient = createServiceClient();

  // Fetch chapter + verify ownership via course join
  const { data: row } = await serviceClient
    .from("chapters")
    .select("*, courses!inner(user_id, topic, user_profile)")
    .eq("id", id)
    .eq("courses.user_id", user.id)
    .single();

  if (!row) return new Response("Not found", { status: 404 });

  const chapter = row as ChapterWithCourse;

  // ── Already done ───────────────────────────────────────────
  if (chapter.content && chapter.status === "done") {
    return NextResponse.json({ status: "done", content: chapter.content });
  }

  // ── Failed ─────────────────────────────────────────────────
  if (chapter.status === "failed") {
    return NextResponse.json({ status: "failed", error: chapter.error });
  }

  // ── Generating ─────────────────────────────────────────────
  if (chapter.status === "generating") {
    const startedAt = chapter.generation_started_at
      ? new Date(chapter.generation_started_at).getTime()
      : 0;

    if (Date.now() - startedAt < STALE_GENERATING_MS) {
      return NextResponse.json({ status: "generating" });
    }
    // Stale — reset to pending and fall through
    await serviceClient
      .from("chapters")
      .update({ status: "pending", generation_started_at: null })
      .eq("id", id);
  }

  // ── Pending: atomic check-and-set ─────────────────────────
  const { data: claimed } = await serviceClient
    .from("chapters")
    .update({
      status: "generating",
      generation_started_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("status", "pending")
    .select("id");

  if (!claimed || claimed.length === 0) {
    // Lost the race — another request is generating
    return NextResponse.json({ status: "generating" });
  }

  // ── Stream Claude response ────────────────────────────────
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  const prompt = buildChapterPrompt(
    {
      id: chapter.id,
      title: chapter.title,
      summary: chapter.summary,
      estimated_minutes: chapter.estimated_minutes,
      chapter_index: chapter.chapter_index,
    },
    chapter.courses.user_profile,
    chapter.courses.topic
  );

  // Start generation (non-blocking)
  ;(async () => {
    let fullContent = "";
    try {
      const stream = await anthropic.messages.stream({
        model: CHAPTER_MODEL,
        max_tokens: 4096,
        messages: [{ role: "user", content: prompt }],
      });

      for await (const chunk of stream) {
        if (
          chunk.type === "content_block_delta" &&
          chunk.delta.type === "text_delta"
        ) {
          const text = chunk.delta.text;
          fullContent += text;
          await writer.write(encoder.encode(text));
        }
      }

      await serviceClient
        .from("chapters")
        .update({
          content: fullContent,
          status: "done",
          generated_at: new Date().toISOString(),
        })
        .eq("id", id);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Generation error";
      await serviceClient
        .from("chapters")
        .update({ status: "failed", error: message })
        .eq("id", id);
    } finally {
      await writer.close();
    }
  })();

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

type ChapterWithCourse = {
  id: string;
  course_id: string;
  chapter_index: number;
  title: string;
  summary: string;
  estimated_minutes: number;
  content: string | null;
  status: "pending" | "generating" | "done" | "failed";
  error: string | null;
  generation_started_at: string | null;
  generated_at: string | null;
  courses: {
    user_id: string;
    topic: string;
    user_profile: { known_topics: string[]; gap_topics: string[]; experience_level: "beginner" | "intermediate" | "advanced" };
  };
};
