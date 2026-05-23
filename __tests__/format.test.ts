import { describe, it, expect } from "vitest";
import { toTitleCase } from "@/lib/format";

describe("toTitleCase (sentence case)", () => {
  it("capitalizes first character", () => {
    expect(toTitleCase("machine learning")).toBe("Machine learning");
  });

  it("preserves acronyms and proper nouns", () => {
    expect(toTitleCase("AWS Lambda")).toBe("AWS Lambda");
    expect(toTitleCase("TypeScript fundamentals")).toBe("TypeScript fundamentals");
    expect(toTitleCase("GraphQL API design")).toBe("GraphQL API design");
  });

  it("handles single word", () => {
    expect(toTitleCase("python")).toBe("Python");
  });

  it("handles already-capitalized input", () => {
    expect(toTitleCase("Data Science")).toBe("Data Science");
  });

  it("handles empty string", () => {
    expect(toTitleCase("")).toBe("");
  });

  it("handles all-caps input without downcasing", () => {
    expect(toTitleCase("JAVASCRIPT FUNDAMENTALS")).toBe("JAVASCRIPT FUNDAMENTALS");
  });

  it("handles single character", () => {
    expect(toTitleCase("a")).toBe("A");
  });
});
