import { describe, it, expect } from "vitest";
import { toTitleCase } from "@/lib/format";

describe("toTitleCase", () => {
  it("capitalizes first letter of each word", () => {
    expect(toTitleCase("machine learning")).toBe("Machine Learning");
  });

  it("lowercases the rest of each word", () => {
    expect(toTitleCase("JAVASCRIPT FUNDAMENTALS")).toBe("Javascript Fundamentals");
  });

  it("handles single word", () => {
    expect(toTitleCase("python")).toBe("Python");
  });

  it("handles already-title-case input", () => {
    expect(toTitleCase("Data Science")).toBe("Data Science");
  });

  it("handles empty string", () => {
    expect(toTitleCase("")).toBe("");
  });

  it("handles mixed case multi-word", () => {
    expect(toTitleCase("intro to web DEVELOPMENT")).toBe("Intro To Web Development");
  });
});
