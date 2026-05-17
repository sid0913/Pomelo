import Anthropic from "@anthropic-ai/sdk";

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const QUALIFYING_MODEL =
  process.env.CLAUDE_QUALIFYING_MODEL ?? "claude-sonnet-4-6";

export const CHAPTER_MODEL =
  process.env.CLAUDE_CHAPTER_MODEL ?? "claude-sonnet-4-6";

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
