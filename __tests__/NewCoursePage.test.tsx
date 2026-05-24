import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
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

// Keep the component in "loading" phase (fetch never resolves) so the
// Exit button is visible without needing to drive the full wizard flow.
function frozenFetch() {
  vi.spyOn(global, "fetch").mockImplementation(
    () => new Promise(() => {})
  );
}

describe("NewCoursePage — Exit button", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.setItem("pomelo_pending_topic", "machine learning");
    frozenFetch();
  });

  afterEach(() => {
    localStorageMock.clear();
    vi.restoreAllMocks();
  });

  it("renders the Exit button", () => {
    render(<NewCoursePage />);
    expect(
      screen.getByRole("button", { name: /exit qualifying session/i })
    ).toBeInTheDocument();
  });

  it("clears pomelo_pending_topic from localStorage on exit", () => {
    render(<NewCoursePage />);
    fireEvent.click(
      screen.getByRole("button", { name: /exit qualifying session/i })
    );
    expect(localStorageMock.getItem("pomelo_pending_topic")).toBeNull();
  });

  it("navigates to /courses on exit", () => {
    render(<NewCoursePage />);
    fireEvent.click(
      screen.getByRole("button", { name: /exit qualifying session/i })
    );
    expect(mockPush).toHaveBeenCalledWith("/courses");
    expect(mockPush).toHaveBeenCalledTimes(1);
  });
});
