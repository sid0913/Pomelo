import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { anthropic, QUALIFYING_MODEL } from "@/lib/claude";
import {
  QUALIFYING_SYSTEM_PROMPT,
  PRESENT_QUESTION_TOOL,
  FINISH_QUALIFYING_TOOL,
} from "@/lib/prompts/qualifying";

const RequestSchema = z.object({
  sessionId: z.string().uuid().optional(),
  topic: z.string().min(1).max(200).optional(),
  userMessage: z.string().min(1).max(2000),
  truncateToTurns: z.number().int().min(0).optional(),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { sessionId, topic, userMessage, truncateToTurns } = parsed.data;
  const serviceClient = createServiceClient();

  // ── Get or create qualifying session ──────────────────────
  let session: { id: string; topic: string; turns: Turn[] };

  if (sessionId) {
    const { data, error } = await serviceClient
      .from("qualifying_sessions")
      .select("id, topic, turns")
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    session = data as typeof session;
  } else {
    if (!topic) {
      return NextResponse.json(
        { error: "topic required for new session" },
        { status: 400 }
      );
    }
    const { data, error } = await serviceClient
      .from("qualifying_sessions")
      .insert({ user_id: user.id, topic, turns: [] })
      .select("id, topic, turns")
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "Failed to create session" },
        { status: 500 }
      );
    }
    session = data as typeof session;
  }

  // Apply back-navigation truncation before appending new turn
  const baseTurns =
    truncateToTurns !== undefined
      ? session.turns.slice(0, truncateToTurns)
      : session.turns;

  const updatedTurns: Turn[] = [
    ...baseTurns,
    { role: "user", content: userMessage, timestamp: new Date().toISOString() },
  ];

  // ── Call Claude ────────────────────────────────────────────
  const messages: { role: "user" | "assistant"; content: string }[] =
    updatedTurns.map((t) => ({ role: t.role, content: t.content }));

  const userTurnCount = updatedTurns.filter((t) => t.role === "user").length;
  // After 5 user turns, force finish_qualifying; otherwise force any tool (no plain text)
  const toolChoice =
    userTurnCount >= 5
      ? ({ type: "tool", name: "finish_qualifying" } as const)
      : ({ type: "any" } as const);

  let claudeResponse;
  try {
    claudeResponse = await anthropic.messages.create({
      model: QUALIFYING_MODEL,
      max_tokens: 4096,
      system: `${QUALIFYING_SYSTEM_PROMPT}\n\nThe learner's topic is: "${session.topic}"`,
      tools: [PRESENT_QUESTION_TOOL, FINISH_QUALIFYING_TOOL],
      tool_choice: toolChoice,
      messages,
    });
  } catch (err) {
    console.error("Claude error:", err);
    return NextResponse.json(
      { error: "AI service error. Please try again." },
      { status: 500 }
    );
  }

  const toolBlock = claudeResponse.content.find(
    (b) => b.type === "tool_use"
  );

  if (!toolBlock || toolBlock.type !== "tool_use") {
    return NextResponse.json({ error: "Unexpected tool response" }, { status: 500 });
  }

  // ── Handle present_question ────────────────────────────────
  if (toolBlock.name === "present_question") {
    const { question, options } = toolBlock.input as {
      question: string;
      options: string[];
    };

    // Persist turns with assistant turn encoded as JSON for history
    const assistantContent = JSON.stringify({ question, options });
    const finalTurns: Turn[] = [
      ...updatedTurns,
      {
        role: "assistant",
        content: assistantContent,
        timestamp: new Date().toISOString(),
      },
    ];

    await serviceClient
      .from("qualifying_sessions")
      .update({ turns: finalTurns, updated_at: new Date().toISOString() })
      .eq("id", session.id);

    return NextResponse.json({
      done: false,
      sessionId: session.id,
      question,
      options,
    });
  }

  // ── Handle finish_qualifying ───────────────────────────────
  if (toolBlock.name === "finish_qualifying") {
    const { chapters, user_profile } = toolBlock.input as {
      chapters: { title: string; summary: string; estimated_minutes: number }[];
      user_profile: {
        known_topics: string[];
        gap_topics: string[];
        experience_level: string;
        custom_topics?: string[];
      };
    };

    const { data: course, error: courseError } = await serviceClient
      .from("courses")
      .insert({
        user_id: user.id,
        topic: session.topic,
        qualifying_session_id: session.id,
        user_profile,
        daily_goal: 1,
      })
      .select("id")
      .single();

    if (courseError || !course) {
      return NextResponse.json({ error: "Failed to create course" }, { status: 500 });
    }

    const chapterRows = chapters.map((c, i) => ({
      course_id: course.id,
      chapter_index: i,
      title: c.title,
      summary: c.summary,
      estimated_minutes: c.estimated_minutes,
      status: "pending",
    }));

    const timezone =
      req.headers.get("x-timezone") ??
      Intl.DateTimeFormat().resolvedOptions().timeZone;
    const utcOffsetHours = -new Date().getTimezoneOffset() / 60;

    let validTimezone = "UTC";
    try {
      Intl.DateTimeFormat(undefined, { timeZone: timezone });
      validTimezone = timezone;
    } catch {
      // invalid timezone — fall back to UTC
    }

    await Promise.all([
      serviceClient.from("chapters").insert(chapterRows),
      serviceClient
        .from("qualifying_sessions")
        .update({ status: "complete", updated_at: new Date().toISOString() })
        .eq("id", session.id),
      serviceClient.from("habit_reminders").insert({
        user_id: user.id,
        course_id: course.id,
        timezone: validTimezone,
        utc_offset_hours: Math.round(utcOffsetHours),
        is_active: true,
      }),
    ]);

    return NextResponse.json({ done: true, courseId: course.id });
  }

  return NextResponse.json({ error: "Unexpected tool response" }, { status: 500 });
}

type Turn = { role: "user" | "assistant"; content: string; timestamp: string };
