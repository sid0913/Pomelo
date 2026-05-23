// Sentence case: capitalize only the first character, preserve the rest.
// Avoids corrupting proper nouns and acronyms (e.g. "AWS Lambda", "TypeScript").
export function toTitleCase(str: string) {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}
