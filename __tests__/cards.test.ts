import { describe, it, expect } from "vitest";
import { parseCards } from "@/lib/cards";
import type { UnresolvedCard } from "@/lib/cards";

// ── parseCards ─────────────────────────────────────────────────────────────────

describe("parseCards — plain text (no markers)", () => {
  it("returns a single text card when no markers present", () => {
    const result = parseCards("Hello world");
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ type: "text", content: "Hello world" });
  });

  it("returns a single text card for empty string", () => {
    const result = parseCards("");
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ type: "text", content: "" });
  });

  it("returns a single text card for whitespace-only input", () => {
    // parseCards does not trim the whole-content fallback path —
    // whitespace-only input produces a text card with the original content
    const result = parseCards("   \n\n   ");
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("text");
  });
});

describe("parseCards — VIDEO markers", () => {
  it("parses a single VIDEO marker", () => {
    const content = "Intro text.\n\n[[VIDEO: photosynthesis process | Watch how plants make food]]\n\nOutro text.";
    const result = parseCards(content);
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ type: "text", content: "Intro text." });
    expect(result[1]).toEqual({
      type: "video",
      query: "photosynthesis process",
      framing: "Watch how plants make food",
    });
    expect(result[2]).toEqual({ type: "text", content: "Outro text." });
  });

  it("trims whitespace from VIDEO query and framing", () => {
    const content = "[[VIDEO:  machine learning   |   See ML in action   ]]";
    const result = parseCards(content);
    expect(result[0]).toEqual({
      type: "video",
      query: "machine learning",
      framing: "See ML in action",
    });
  });

  it("produces only video card when no surrounding text", () => {
    const content = "[[VIDEO: neural network | Visualize a neural net]]";
    const result = parseCards(content);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("video");
  });

  it("parses multiple VIDEO markers", () => {
    const content =
      "Text A.\n\n[[VIDEO: query1 | framing1]]\n\nText B.\n\n[[VIDEO: query2 | framing2]]";
    const result = parseCards(content);
    expect(result).toHaveLength(4);
    expect(result[0]).toEqual({ type: "text", content: "Text A." });
    expect(result[1]).toEqual({ type: "video", query: "query1", framing: "framing1" });
    expect(result[2]).toEqual({ type: "text", content: "Text B." });
    expect(result[3]).toEqual({ type: "video", query: "query2", framing: "framing2" });
  });
});

describe("parseCards — IMAGE markers", () => {
  it("parses a single IMAGE marker", () => {
    const content = "Before.\n\n[[IMAGE: Eiffel tower aerial view | The Eiffel Tower in Paris]]\n\nAfter.";
    const result = parseCards(content);
    expect(result).toHaveLength(3);
    expect(result[1]).toEqual({
      type: "image",
      query: "Eiffel tower aerial view",
      caption: "The Eiffel Tower in Paris",
    });
  });

  it("trims whitespace from IMAGE query and caption", () => {
    const content = "[[IMAGE:  solar system diagram   |   Planets of our solar system   ]]";
    const result = parseCards(content);
    expect(result[0]).toEqual({
      type: "image",
      query: "solar system diagram",
      caption: "Planets of our solar system",
    });
  });

  it("parses multiple IMAGE markers", () => {
    const content =
      "[[IMAGE: cat | A cat]]\n\nMiddle text.\n\n[[IMAGE: dog | A dog]]";
    const result = parseCards(content);
    expect(result).toHaveLength(3);
    expect(result[0].type).toBe("image");
    expect(result[1].type).toBe("text");
    expect(result[2].type).toBe("image");
  });
});

describe("parseCards — CALLOUT markers", () => {
  it("parses a CALLOUT with 'Key insight' label", () => {
    const content = "Text.\n\n[[CALLOUT: Photosynthesis converts light into glucose. | Key insight]]\n\nMore text.";
    const result = parseCards(content);
    expect(result).toHaveLength(3);
    expect(result[1]).toEqual({
      type: "callout",
      content: "Photosynthesis converts light into glucose.",
      label: "Key insight",
    });
  });

  it("parses a CALLOUT with 'Definition' label", () => {
    const content = "[[CALLOUT: ATP is the energy currency of the cell. | Definition]]";
    const result = parseCards(content);
    expect(result[0]).toEqual({
      type: "callout",
      content: "ATP is the energy currency of the cell.",
      label: "Definition",
    });
  });

  it("parses a CALLOUT with 'Warning' label", () => {
    const content = "[[CALLOUT: Never mix bleach and ammonia. | Warning]]";
    const result = parseCards(content);
    expect(result[0]).toEqual({
      type: "callout",
      content: "Never mix bleach and ammonia.",
      label: "Warning",
    });
  });

  it("parses a CALLOUT with 'Example' label", () => {
    const content = "[[CALLOUT: Consider a car travelling at 60 mph. | Example]]";
    const result = parseCards(content);
    expect(result[0]).toEqual({
      type: "callout",
      content: "Consider a car travelling at 60 mph.",
      label: "Example",
    });
  });

  it("trims whitespace from CALLOUT content and label", () => {
    const content = "[[CALLOUT:   The mitochondria is the powerhouse   |   Key insight   ]]";
    const result = parseCards(content);
    expect(result[0]).toEqual({
      type: "callout",
      content: "The mitochondria is the powerhouse",
      label: "Key insight",
    });
  });

  it("skips CALLOUT with empty content", () => {
    // content portion is empty (just whitespace) after trimming
    const content = "Before text.\n\n[[CALLOUT:    | Key insight]]\n\nAfter text.";
    const result = parseCards(content);
    // Empty callout is skipped; before + after text remain
    const types = result.map((c) => c.type);
    expect(types).not.toContain("callout");
  });

  it("parses multiple CALLOUT markers", () => {
    const content =
      "Intro.\n\n[[CALLOUT: Insight one. | Key insight]]\n\nMiddle.\n\n[[CALLOUT: Insight two. | Definition]]";
    const result = parseCards(content);
    const callouts = result.filter((c) => c.type === "callout");
    expect(callouts).toHaveLength(2);
  });
});

describe("parseCards — mixed markers", () => {
  it("interleaves text, video, image, and callout cards", () => {
    const content = [
      "Introduction paragraph.",
      "[[VIDEO: mitosis cell division | Watch a cell divide]]",
      "After the video.",
      "[[IMAGE: mitosis diagram | Stages of mitosis]]",
      "More text.",
      "[[CALLOUT: Mitosis produces two genetically identical daughter cells. | Key insight]]",
      "Conclusion.",
    ].join("\n\n");

    const result = parseCards(content);
    const types = result.map((c) => c.type);
    expect(types).toEqual(["text", "video", "text", "image", "text", "callout", "text"]);
  });

  it("handles marker at the very start with no preceding text", () => {
    const content = "[[VIDEO: quantum mechanics | Intro video]]\n\nSome text after.";
    const result = parseCards(content);
    expect(result[0].type).toBe("video");
    expect(result[1]).toEqual({ type: "text", content: "Some text after." });
  });

  it("handles marker at the very end with no trailing text", () => {
    const content = "Leading text.\n\n[[IMAGE: black hole | Event horizon]]";
    const result = parseCards(content);
    expect(result[0]).toEqual({ type: "text", content: "Leading text." });
    expect(result[1].type).toBe("image");
  });

  it("handles back-to-back markers with no text between", () => {
    const content =
      "[[VIDEO: relativity | Einstein's theory]]\n\n[[CALLOUT: E=mc² means mass and energy are interchangeable. | Key insight]]";
    const result = parseCards(content);
    const types = result.map((c) => c.type);
    // no text card between them — text slices between markers should be empty and omitted
    expect(types).toContain("video");
    expect(types).toContain("callout");
    const textCards = result.filter((c) => c.type === "text");
    expect(textCards).toHaveLength(0);
  });

  it("VIDEO and IMAGE markers are correctly distinguished", () => {
    const content = "[[IMAGE: dna helix | DNA double helix]]\n\n[[VIDEO: DNA replication | See replication]]";
    const result = parseCards(content);
    expect(result[0].type).toBe("image");
    expect(result[1].type).toBe("video");
  });
});

describe("parseCards — return types", () => {
  it("text card has only type and content fields", () => {
    const [card] = parseCards("Just text");
    expect(card.type).toBe("text");
    expect((card as { content: string }).content).toBe("Just text");
  });

  it("video card has type, query, and framing fields (no video field — unresolved)", () => {
    const [card] = parseCards("[[VIDEO: gravity | Gravity explained]]") as UnresolvedCard[];
    expect(card.type).toBe("video");
    if (card.type === "video") {
      expect(card.query).toBe("gravity");
      expect(card.framing).toBe("Gravity explained");
      // UnresolvedVideoCard does NOT have a video property
      expect("video" in card).toBe(false);
    }
  });

  it("image card has type, query, and caption fields (no imageUrl — unresolved)", () => {
    const [card] = parseCards("[[IMAGE: Milky Way galaxy | Our galaxy]]") as UnresolvedCard[];
    expect(card.type).toBe("image");
    if (card.type === "image") {
      expect(card.query).toBe("Milky Way galaxy");
      expect(card.caption).toBe("Our galaxy");
      // UnresolvedImageCard does NOT have an imageUrl property
      expect("imageUrl" in card).toBe(false);
    }
  });

  it("callout card has type, content, and label fields", () => {
    const [card] = parseCards("[[CALLOUT: The sky is blue. | Key insight]]") as UnresolvedCard[];
    expect(card.type).toBe("callout");
    if (card.type === "callout") {
      expect(card.content).toBe("The sky is blue.");
      expect(card.label).toBe("Key insight");
    }
  });
});

describe("parseCards — edge cases", () => {
  it("treats unrecognized marker types as plain text", () => {
    // A marker with an unknown type should not be parsed as a card
    const content = "[[UNKNOWN: foo | bar]] and normal text";
    const result = parseCards(content);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("text");
    expect((result[0] as { content: string }).content).toContain("UNKNOWN");
  });

  it("does not confuse single-bracket text with markers", () => {
    const content = "Use [square brackets] for references.";
    const result = parseCards(content);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ type: "text", content: "Use [square brackets] for references." });
  });

  it("handles multi-paragraph text before and after marker", () => {
    const content =
      "Para one.\n\nPara two.\n\n[[IMAGE: cat | A cat]]\n\nPara three.\n\nPara four.";
    const result = parseCards(content);
    expect(result[0]).toEqual({ type: "text", content: "Para one.\n\nPara two." });
    expect(result[1].type).toBe("image");
    expect(result[2]).toEqual({ type: "text", content: "Para three.\n\nPara four." });
  });

  it("is case-sensitive — lowercase marker type is not parsed", () => {
    const content = "[[video: foo | bar]]";
    const result = parseCards(content);
    expect(result[0].type).toBe("text");
  });
});
