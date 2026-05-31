import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { anthropic, CHAT_MODEL, type UserProfile } from "@/lib/claude";
import { buildChapterChatSystemPrompt } from "@/lib/prompts/chapter-chat";

type Params = { params: Promise<{ id: string }> };

type Message = { role: "user" | "assistant"; content: string; timestamp: string };

// GET — list threads (id + name) for this chapter + user
export async function GET(_req: NextRequest, { params }: Params) {
  const { id: chapterId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const serviceClient = createServiceClient();

  const { data: threads } = await serviceClient
    .from("chapter_chats")
    .select("id, thread_name, messages, updated_at")
    .eq("chapter_id", chapterId)
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  return NextResponse.json({ threads: threads ?? [] });
}

const PostSchema = z.object({
  threadId: z.string().uuid().optional(),
  threadName: z.string().min(1).max(80).optional(),
  message: z.string().min(1).max(4000),
});

// POST — send message, get Claude reply
export async function POST(req: NextRequest, { params }: Params) {
  const { id: chapterId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = PostSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { threadId, threadName, message } = parsed.data;
  const serviceClient = createServiceClient();

  // Fetch chapter + course for context and ownership check
  const { data: chapter } = await serviceClient
    .from("chapters")
    .select("id, title, content, courses!inner(user_id, topic, user_profile)")
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

  // Get or create thread
  let thread: { id: string; thread_name: string; messages: Message[] };

  if (threadId) {
    const { data } = await serviceClient
      .from("chapter_chats")
      .select("id, thread_name, messages")
      .eq("id", threadId)
      .eq("user_id", user.id)
      .single();

    if (!data) return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    thread = data as typeof thread;
  } else {
    const name = threadName ?? "Main";
    const { data, error } = await serviceClient
      .from("chapter_chats")
      .upsert(
        { chapter_id: chapterId, user_id: user.id, thread_name: name, messages: [] },
        { onConflict: "chapter_id,user_id,thread_name", ignoreDuplicates: false }
      )
      .select("id, thread_name, messages")
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Failed to create thread" }, { status: 500 });
    }
    thread = data as typeof thread;
  }

  // Append user message
  const now = new Date().toISOString();
  const updatedMessages: Message[] = [
    ...thread.messages,
    { role: "user", content: message, timestamp: now },
  ];

  // Build Claude messages (max last 40 turns to stay within context)
  const recentMessages = updatedMessages.slice(-40);
  const claudeMessages = recentMessages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const systemPrompt = buildChapterChatSystemPrompt(
    chapter.title,
    chapter.content ?? "",
    course.topic,
    course.user_profile
  );

  let assistantText = "";
  try {
    const res = await anthropic.messages.create({
      model: CHAT_MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages: claudeMessages,
    });

    assistantText = res.content
      .filter((b) => b.type === "text")
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("");
  } catch (err) {
    console.error("Chat Claude error:", err);
    return NextResponse.json({ error: "AI service error" }, { status: 500 });
  }

  const CHAT_HISTORY_CAP = 100;
  const finalMessages: Message[] = [
    ...updatedMessages,
    { role: "assistant" as const, content: assistantText, timestamp: new Date().toISOString() },
  ].slice(-CHAT_HISTORY_CAP);

  await serviceClient
    .from("chapter_chats")
    .update({ messages: finalMessages, updated_at: new Date().toISOString() })
    .eq("id", thread.id);

  return NextResponse.json({
    threadId: thread.id,
    threadName: thread.thread_name,
    assistantMessage: assistantText,
    messages: finalMessages,
  });
}
