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

Write the full chapter content as clear, engaging prose. Do not include the chapter title or any markdown headers — start directly with the content. Use paragraphs, not bullet lists. Be concrete with examples. Assume the learner has the background described above — do not re-explain what they already know.

Structure the chapter with visual cadence. Every 2–3 paragraphs, embed a media marker on its own line with blank lines above and below. Target 3–5 markers per chapter total.

Available marker types:
- Video: [[VIDEO: <youtube search query> | <1–2 sentence framing: why this visual matters here>]]
- Image: [[IMAGE: <specific educational image query> | <caption>]]
- Callout: [[CALLOUT: <key insight or definition in 1–2 sentences — no pipe characters> | <Key insight | Definition | Warning | Example>]]

Image query guidance — be specific:
- Scientific diagrams: "<concept> diagram labeled" or "<process> schematic"
  Examples: "DNA replication diagram labeled", "mitosis stages diagram", "projectile motion force diagram physics", "photosynthesis light reactions diagram"
- Photographs: "photograph of <organism or phenomenon>"
  Examples: "photograph frog embryo development stages", "cell under electron microscope", "heart anatomy cross section photograph"
- Always prefer labeled diagrams over generic terms: "krebs cycle diagram" not "metabolism"

Callout placement: never place two CALLOUT markers back to back — always separate with at least one paragraph. Use callouts to anchor the single most important concept in each section.

${userProfile.experience_level === "beginner"
  ? "This is a beginner learner — prefer callout cards to define key terms and anchor concepts before introducing visuals."
  : "This is an intermediate or advanced learner — prefer detailed labeled diagrams and process schematics over basic definitions."}

Place markers only where they genuinely clarify a concept, not decoratively.`;
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
