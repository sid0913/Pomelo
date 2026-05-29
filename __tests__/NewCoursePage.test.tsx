import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import NewCoursePage from "@/app/(app)/courses/new/page";

const mockPush = vi.fn();
const mockReplace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  useSearchParams: () => ({ get: (_: string) => null }),
}));

// jsdom's localStorage is present but may not be enumerable — use Object.defineProperty
// to ensure a reliable stub that survives vi.restoreAllMocks().
function makeLocalStorageMock() {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
}
const localStorageMock = makeLocalStorageMock();
Object.defineProperty(globalThis, "localStorage", {
  value: localStorageMock,
  writable: true,
});

// Return a single question so the component transitions to "question" phase,
// making the Exit button visible. The Exit button lives inside the question card.
function questionFetch() {
  vi.spyOn(global, "fetch").mockResolvedValue({
    ok: true,
    json: async () => ({
      done: false,
      sessionId: "test-session-123",
      question: "What is your current knowledge level?",
      options: ["Beginner", "Intermediate", "Advanced", "Expert"],
    }),
  } as Response);
}

describe("NewCoursePage — Exit button", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.setItem("pomelo_pending_topic", "machine learning");
    questionFetch();
  });

  afterEach(() => {
    localStorageMock.clear();
    vi.restoreAllMocks();
  });

  it("renders the Exit button", async () => {
    render(<NewCoursePage />);
    expect(
      await screen.findByRole("button", { name: /exit qualifying session/i })
    ).toBeInTheDocument();
  });

  it("clears pomelo_pending_topic from localStorage on exit", async () => {
    render(<NewCoursePage />);
    fireEvent.click(
      await screen.findByRole("button", { name: /exit qualifying session/i })
    );
    expect(localStorageMock.getItem("pomelo_pending_topic")).toBeNull();
  });

  it("navigates to /courses on exit", async () => {
    render(<NewCoursePage />);
    fireEvent.click(
      await screen.findByRole("button", { name: /exit qualifying session/i })
    );
    expect(mockPush).toHaveBeenCalledWith("/courses");
    expect(mockPush).toHaveBeenCalledTimes(1);
  });
});
