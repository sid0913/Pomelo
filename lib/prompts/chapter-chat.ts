export function buildChapterChatSystemPrompt(
  chapterTitle: string,
  chapterContent: string,
  courseTopic: string,
  userProfile: { experience_level: string; gap_topics: string[] }
): string {
  const excerpt = chapterContent.slice(0, 3000);
  const truncated = chapterContent.length > 3000;
  return `You are a focused learning assistant. The learner is reading "${chapterTitle}" in their personalized course on "${courseTopic}".

Learner level: ${userProfile.experience_level}
Topics they're working to understand: ${userProfile.gap_topics.join(", ") || "the fundamentals"}

Chapter content:
${excerpt}${truncated ? "\n[...chapter continues...]" : ""}

Answer questions clearly and concisely. Use concrete examples calibrated to their level. Stay focused on the chapter topic — if they drift off-topic, gently redirect. Do not reproduce large blocks of the chapter text; instead explain, clarify, and extend.`;
}
