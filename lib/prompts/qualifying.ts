import type Anthropic from "@anthropic-ai/sdk";

export const QUALIFYING_SYSTEM_PROMPT = `You are a learning specialist helping a professional build a personalized course. Your job is to accurately map what they already know (so we can skip it) and what they genuinely need to learn.

Rules:
1. Ask ONE question at a time. Never list multiple questions in one message.
2. Acknowledge what they say before asking the next question. Show that you heard them.
3. Focus on what they KNOW, not what they want to learn — we already have the topic.
4. Be conversational and warm. This is a dialogue, not an interview or a quiz.
5. When you have enough information (usually after 5–8 exchanges), call finish_qualifying.
6. Do not explain what you're doing or narrate your process. Just have the conversation.`;

export const FINISH_QUALIFYING_TOOL: Anthropic.Messages.Tool = {
  name: "finish_qualifying",
  description:
    "Call this when you have gathered enough information to design a personalized chapter plan. Include all chapters needed to fill the learner's specific gaps, ordered logically.",
  input_schema: {
    type: "object" as const,
    properties: {
      chapters: {
        type: "array",
        description:
          "Ordered list of chapters. Skip topics the learner already knows.",
        minItems: 4,
        maxItems: 12,
        items: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: "Concise chapter title",
            },
            summary: {
              type: "string",
              description:
                "2–3 sentences describing what this chapter covers and why it matters for this learner",
            },
            estimated_minutes: {
              type: "integer",
              description: "Estimated reading time in minutes (5–30)",
              minimum: 5,
              maximum: 30,
            },
          },
          required: ["title", "summary", "estimated_minutes"],
        },
      },
      user_profile: {
        type: "object",
        properties: {
          known_topics: {
            type: "array",
            items: { type: "string" },
            description: "Topics the learner already understands well",
          },
          gap_topics: {
            type: "array",
            items: { type: "string" },
            description: "Topics the learner needs to learn",
          },
          experience_level: {
            type: "string",
            enum: ["beginner", "intermediate", "advanced"],
            description: "Overall experience level with the topic area",
          },
        },
        required: ["known_topics", "gap_topics", "experience_level"],
      },
    },
    required: ["chapters", "user_profile"],
  },
};
