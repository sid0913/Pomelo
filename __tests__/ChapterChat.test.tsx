import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ChapterChat } from "@/app/(app)/courses/[id]/chapters/[cId]/ChapterChat";

// jsdom doesn't implement scrollIntoView
Element.prototype.scrollIntoView = vi.fn();

const CHAPTER_ID = "ch-test-123";

const emptyThreads = { threads: [] };
const successResponse = {
  threadId: "t-1",
  threadName: "Main",
  messages: [
    { role: "user", content: "hello", timestamp: "2026-01-01T00:00:00Z" },
    { role: "assistant", content: "hi there", timestamp: "2026-01-01T00:00:01Z" },
  ],
};

function mockFetch(postOk: boolean, postBody?: object) {
  vi.spyOn(global, "fetch").mockImplementation(async (_url, options) => {
    const isPost = (options as RequestInit | undefined)?.method === "POST";
    if (!isPost) {
      return { ok: true, json: async () => emptyThreads } as Response;
    }
    if (!postOk) {
      return { ok: false, text: async () => "Internal server error" } as Response;
    }
    return { ok: true, json: async () => postBody ?? successResponse } as Response;
  });
}

function mockFetchThrowOnPost() {
  vi.spyOn(global, "fetch").mockImplementation(async (_url, options) => {
    const isPost = (options as RequestInit | undefined)?.method === "POST";
    if (!isPost) {
      return { ok: true, json: async () => emptyThreads } as Response;
    }
    throw new Error("Failed to fetch");
  });
}

async function renderAndWaitForInput() {
  render(<ChapterChat chapterId={CHAPTER_ID} />);
  return screen.findByPlaceholderText(/ask about this chapter/i);
}

async function typeAndSend(textarea: HTMLElement, text: string) {
  fireEvent.change(textarea, { target: { value: text } });
  fireEvent.click(screen.getByRole("button", { name: /send/i }));
}

// ─────────────────────────────────────────────────────────────────────────────

describe("ChapterChat — sendError", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows error below textarea when POST returns non-OK", async () => {
    mockFetch(false);
    const textarea = await renderAndWaitForInput();
    await typeAndSend(textarea, "What is entropy?");
    await waitFor(() => {
      expect(screen.getByText(/couldn't send message/i)).toBeInTheDocument();
    });
  });

  it("shows error below textarea when network throws", async () => {
    mockFetchThrowOnPost();
    const textarea = await renderAndWaitForInput();
    await typeAndSend(textarea, "What is entropy?");
    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });
  });

  it("clears sendError on subsequent successful send", async () => {
    let postCount = 0;
    vi.spyOn(global, "fetch").mockImplementation(async (_url, options) => {
      const isPost = (options as RequestInit | undefined)?.method === "POST";
      if (!isPost) {
        return { ok: true, json: async () => emptyThreads } as Response;
      }
      postCount++;
      if (postCount === 1) {
        return { ok: false, text: async () => "error" } as Response;
      }
      return { ok: true, json: async () => successResponse } as Response;
    });

    const textarea = await renderAndWaitForInput();

    // First send: fails → error shown
    await typeAndSend(textarea, "first question");
    await waitFor(() => {
      expect(screen.getByText(/couldn't send message/i)).toBeInTheDocument();
    });

    // Second send: succeeds → error cleared
    await typeAndSend(textarea, "second question");
    await waitFor(() => {
      expect(screen.queryByText(/couldn't send message/i)).not.toBeInTheDocument();
    });
  });
});
