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

describe("NewCoursePage — T17: Back button removed and Q5 done:false error", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.setItem("pomelo_pending_topic", "machine learning");
  });

  afterEach(() => {
    localStorageMock.clear();
    vi.restoreAllMocks();
  });

  it("Back button is never rendered (T13 removed)", async () => {
    questionFetch();
    render(<NewCoursePage />);
    await screen.findByRole("button", { name: /exit qualifying session/i });
    expect(
      screen.queryByRole("button", { name: /go back to previous question/i })
    ).not.toBeInTheDocument();
  });

  it("shows error when Q5 submit returns done:false (T14)", async () => {
    // Real timers: MIN_HOLD_MS=800 × 6 fetches + EXIT_ANIMATION_MS=150 × 4 steps ≈ 5.4s
    let callCount = 0;
    vi.spyOn(global, "fetch").mockImplementation(async () => {
      callCount++;
      if (callCount <= 5) {
        return {
          ok: true,
          json: async () => ({
            done: false,
            sessionId: "session-t14",
            question: `Question ${callCount}?`,
            options: ["Option A", "Option B", "Option C", "Option D"],
          }),
        } as Response;
      }
      // Q5 submit → done:false triggers the T14 else branch
      return { ok: true, json: async () => ({ done: false }) } as Response;
    });

    render(<NewCoursePage />);

    // Click through Q1–Q4: findAllByRole waits up to 3s for each question to load
    for (let q = 0; q < 4; q++) {
      const radios = await screen.findAllByRole("radio", {}, { timeout: 3000 });
      fireEvent.click(radios[0]);
      fireEvent.click(screen.getByRole("button", { name: /continue →/i }));
    }

    // Q5 shows chip input instead of radio options
    await screen.findByPlaceholderText("Add topic…", {}, { timeout: 3000 });
    fireEvent.click(screen.getByText(/skip — no specific topics/i));
    fireEvent.click(screen.getByRole("button", { name: /finish →/i }));

    await waitFor(
      () => expect(screen.getByText(/something went wrong/i)).toBeInTheDocument(),
      { timeout: 3000 }
    );
  }, 30000);
});
