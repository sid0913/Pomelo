import Anthropic from "@anthropic-ai/sdk";

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const QUALIFYING_MODEL =
  process.env.CLAUDE_QUALIFYING_MODEL ?? "claude-sonnet-4-6";

export const CHAPTER_MODEL =
  process.env.CLAUDE_CHAPTER_MODEL ?? "claude-sonnet-4-6";

export const CHAT_MODEL =
  process.env.CLAUDE_CHAT_MODEL ?? "claude-haiku-4-5-20251001";

export type ChapterRow = {
  id: string;
  title: string;
  summary: string;
  estimated_minutes: number;
  chapter_index: number;
};

export type UserProfile = {
  known_topics: string[];
  gap_topics: string[];
  experience_level: "beginner" | "intermediate" | "advanced";
};

export type Source = {
  title: string;
  type: "article" | "video" | "book" | "docs" | "other";
  description: string;
};

export function buildChapterPrompt(
  chapter: ChapterRow,
  userProfile: UserProfile,
  courseTopic: string
): string {
  return `You are writing Chapter ${chapter.chapter_index + 1} of a personalized course on "${courseTopic}".

Chapter title: ${chapter.title}
Chapter summary: ${chapter.summary}
Target reading time: approximately ${chapter.estimated_minutes} minutes

Learner profile:
- Topics they already know well (SKIP or reference briefly): ${userProfile.known_topics.join(", ") || "none specified"}
- Topics they need to learn (FOCUS HERE): ${userProfile.gap_topics.join(", ") || "the fundamentals"}
- Experience level: ${userProfile.experience_level}

Write the full chapter content as clear, engaging prose. Do not include the chapter title or any markdown headers — start directly with the content. Use paragraphs, not bullet lists. Be concrete with examples. Assume the learner has the background described above — do not re-explain what they already know.`;
}

const SUGGEST_SOURCES_TOOL: Anthropic.Messages.Tool = {
  name: "suggest_sources",
  description:
    "Return 3–5 curated learning resources for this chapter. No URLs — titles and descriptions only to avoid hallucination.",
  input_schema: {
    type: "object" as const,
    properties: {
      sources: {
        type: "array",
        minItems: 3,
        maxItems: 5,
        items: {
          type: "object",
          properties: {
            title: { type: "string", description: "Resource title or name" },
            type: {
              type: "string",
              enum: ["article", "video", "book", "docs", "other"],
            },
            description: {
              type: "string",
              description: "1–2 sentences on what it covers and why it's useful",
            },
          },
          required: ["title", "type", "description"],
        },
      },
    },
    required: ["sources"],
  },
};

export async function generateSources(
  chapterTitle: string,
  courseTopic: string,
  userProfile: UserProfile
): Promise<Source[]> {
  try {
    const res = await anthropic.messages.create({
      model: CHAPTER_MODEL,
      max_tokens: 1024,
      tools: [SUGGEST_SOURCES_TOOL],
      tool_choice: { type: "any" as const },
      messages: [
        {
          role: "user",
          content: `Suggest 3–5 high-quality learning resources for someone studying "${chapterTitle}" as part of a course on "${courseTopic}". They are ${userProfile.experience_level} level. Focus on filling these gaps: ${userProfile.gap_topics.join(", ") || "core fundamentals"}.`,
        },
      ],
    });

    const toolBlock = res.content.find(
      (b) => b.type === "tool_use" && b.name === "suggest_sources"
    );
    if (!toolBlock || toolBlock.type !== "tool_use") return [];

    const { sources } = toolBlock.input as { sources: Source[] };
    return sources ?? [];
  } catch {
    return [];
  }
}
