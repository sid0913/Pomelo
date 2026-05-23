import type Anthropic from "@anthropic-ai/sdk";

export const QUALIFYING_SYSTEM_PROMPT = `You are a learning specialist helping a professional build a personalized course. Your job is accurately map what they already know (so we can skip it) and what they genuinely need to learn.

Rules:
1. Ask ONE question at a time by calling present_question. Never output plain text.
2. Never acknowledge, never say "Great!" or "Thanks" or anything before the question. The question IS the output.
3. Focus on what they KNOW, not what they want to learn — we already have the topic.
4. Each question should be specific and concrete. Options must be mutually exclusive and cover the realistic range.
5. After the learner answers exactly 5 questions, call finish_qualifying immediately with no text output.
6. CRITICAL: Never output plain text at any point. Every response must be either a present_question call or a finish_qualifying call. Any plain text you output will appear as a broken UI state.`;

export const PRESENT_QUESTION_TOOL: Anthropic.Messages.Tool = {
  name: "present_question",
  description:
    "Present a single qualifying question with answer options to the learner. Call this for every question — never output plain text.",
  input_schema: {
    type: "object" as const,
    properties: {
      question: {
        type: "string",
        description:
          "The question text. Plain, direct, no preamble. E.g. 'What best describes your background with machine learning?'",
      },
      options: {
        type: "array",
        description:
          "2–4 answer options. Concrete, mutually exclusive, cover the realistic range.",
        minItems: 2,
        maxItems: 4,
        items: { type: "string" },
      },
    },
    required: ["question", "options"],
  },
};

export const FINISH_QUALIFYING_TOOL: Anthropic.Messages.Tool = {
  name: "finish_qualifying",
  description:
    "Call this when you have gathered enough information (after exactly 5 user answers) to design a personalized chapter plan. Include all chapters needed to fill the learner's specific gaps, ordered logically.",
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
          custom_topics: {
            type: "array",
            items: { type: "string" },
            description:
              "Specific subtopics the learner explicitly requested to be covered",
          },
        },
        required: ["known_topics", "gap_topics", "experience_level"],
      },
    },
    required: ["chapters", "user_profile"],
  },
};
