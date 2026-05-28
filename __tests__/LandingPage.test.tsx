import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { LandingPage } from "@/app/LandingPage";

// ── Supabase mock ─────────────────────────────────────────────────────────────
const mockSignInWithOtp = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      signInWithOtp: mockSignInWithOtp,
    },
  }),
}));

// ── localStorage stub ─────────────────────────────────────────────────────────
function makeLocalStorageMock() {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
}
const localStorageMock = makeLocalStorageMock();
Object.defineProperty(globalThis, "localStorage", {
  value: localStorageMock,
  writable: true,
});

// ── window.location.origin stub ───────────────────────────────────────────────
Object.defineProperty(window, "location", {
  value: { origin: "http://localhost:3000" },
  writable: true,
});

// ─────────────────────────────────────────────────────────────────────────────

describe("LandingPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    // Default: OTP succeeds
    mockSignInWithOtp.mockResolvedValue({ error: null });
  });

  // ── topic step (default) ───────────────────────────────────────────────────

  it("renders the topic step by default", () => {
    render(<LandingPage />);
    expect(
      screen.getByPlaceholderText(/molecular biology/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /get started/i })
    ).toBeInTheDocument();
  });

  it("renders 'Already have an account?' button on topic step", () => {
    render(<LandingPage />);
    expect(
      screen.getByRole("button", { name: /already have an account/i })
    ).toBeInTheDocument();
  });

  // ── topic → returning navigation ──────────────────────────────────────────

  it("clicking 'Already have an account?' switches to returning step", () => {
    render(<LandingPage />);
    fireEvent.click(
      screen.getByRole("button", { name: /already have an account/i })
    );
    expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/you@example.com/i)).toBeInTheDocument();
  });

  // ── returning step UI ─────────────────────────────────────────────────────

  it("returning step shows email input and back button", () => {
    render(<LandingPage />);
    fireEvent.click(
      screen.getByRole("button", { name: /already have an account/i })
    );
    expect(
      screen.getByLabelText(/email address/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /back/i })
    ).toBeInTheDocument();
  });

  // ── returning → topic back navigation ────────────────────────────────────

  it("back button from returning step returns to topic step", () => {
    render(<LandingPage />);
    fireEvent.click(
      screen.getByRole("button", { name: /already have an account/i })
    );
    // Now on returning step
    expect(screen.getByText(/welcome back/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /back/i }));
    // Should be back on topic step
    expect(
      screen.getByPlaceholderText(/molecular biology/i)
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/welcome back/i)
    ).not.toBeInTheDocument();
  });

  // ── returning step OTP submit → sent ─────────────────────────────────────

  it("submitting email on returning step transitions to sent step with no-topic text", async () => {
    render(<LandingPage />);
    // Navigate to returning step (topic is still empty)
    fireEvent.click(
      screen.getByRole("button", { name: /already have an account/i })
    );
    const emailInput = screen.getByLabelText(/email address/i);
    fireEvent.change(emailInput, { target: { value: "user@example.com" } });
    fireEvent.submit(emailInput.closest("form")!);

    await waitFor(() => {
      expect(screen.getByText(/check your inbox/i)).toBeInTheDocument();
    });
    // No-topic variant of sent text
    expect(
      screen.getByText(/sign in to your account/i)
    ).toBeInTheDocument();
  });

  it("returning step OTP call uses redirectTo without ?topic= param when topic is empty", async () => {
    render(<LandingPage />);
    fireEvent.click(
      screen.getByRole("button", { name: /already have an account/i })
    );
    const emailInput = screen.getByLabelText(/email address/i);
    fireEvent.change(emailInput, { target: { value: "user@example.com" } });
    fireEvent.submit(emailInput.closest("form")!);

    await waitFor(() => {
      expect(mockSignInWithOtp).toHaveBeenCalledTimes(1);
    });
    const callArgs = mockSignInWithOtp.mock.calls[0][0];
    // redirectTo should NOT contain ?topic=
    expect(callArgs.options.emailRedirectTo).not.toContain("topic");
    expect(callArgs.options.emailRedirectTo).toBe(
      "http://localhost:3000/auth/callback"
    );
  });

  // ── sent step: topic set → course text ───────────────────────────────────

  it("sent step shows course text when topic is set (new user flow)", async () => {
    render(<LandingPage />);
    // Fill topic
    const topicInput = screen.getByPlaceholderText(/molecular biology/i);
    fireEvent.change(topicInput, { target: { value: "machine learning" } });
    fireEvent.submit(topicInput.closest("form")!);
    // Now on email step
    const emailInput = screen.getByLabelText(/email address/i);
    fireEvent.change(emailInput, { target: { value: "user@example.com" } });
    fireEvent.submit(emailInput.closest("form")!);

    await waitFor(() => {
      expect(screen.getByText(/check your inbox/i)).toBeInTheDocument();
    });
    expect(
      screen.getByText(/start building your personalized/i)
    ).toBeInTheDocument();
    expect(screen.getByText("machine learning")).toBeInTheDocument();
  });

  // ── sent step: no topic → sign-in text ───────────────────────────────────

  it("sent step shows sign-in text when topic is empty", async () => {
    render(<LandingPage />);
    // Go directly to returning (no topic)
    fireEvent.click(
      screen.getByRole("button", { name: /already have an account/i })
    );
    const emailInput = screen.getByLabelText(/email address/i);
    fireEvent.change(emailInput, { target: { value: "user@example.com" } });
    fireEvent.submit(emailInput.closest("form")!);

    await waitFor(() => {
      expect(screen.getByText(/check your inbox/i)).toBeInTheDocument();
    });
    expect(
      screen.getByText(/sign in to your account/i)
    ).toBeInTheDocument();
  });

  // ── error handling ────────────────────────────────────────────────────────

  it("shows error message when OTP call fails", async () => {
    mockSignInWithOtp.mockResolvedValueOnce({ error: new Error("rate limited") });
    render(<LandingPage />);
    fireEvent.click(
      screen.getByRole("button", { name: /already have an account/i })
    );
    const emailInput = screen.getByLabelText(/email address/i);
    fireEvent.change(emailInput, { target: { value: "user@example.com" } });
    fireEvent.submit(emailInput.closest("form")!);

    await waitFor(() => {
      expect(
        screen.getByText(/something went wrong/i)
      ).toBeInTheDocument();
    });
    // Should stay on returning step, not advance to sent
    expect(screen.queryByText(/check your inbox/i)).not.toBeInTheDocument();
  });

  // ── OTP redirectTo includes topic when topic is set ───────────────────────

  it("OTP redirectTo includes ?topic= param when topic is set (new user flow)", async () => {
    render(<LandingPage />);
    const topicInput = screen.getByPlaceholderText(/molecular biology/i);
    fireEvent.change(topicInput, { target: { value: "machine learning" } });
    fireEvent.submit(topicInput.closest("form")!);

    const emailInput = screen.getByLabelText(/email address/i);
    fireEvent.change(emailInput, { target: { value: "user@example.com" } });
    fireEvent.submit(emailInput.closest("form")!);

    await waitFor(() => {
      expect(mockSignInWithOtp).toHaveBeenCalledTimes(1);
    });
    const callArgs = mockSignInWithOtp.mock.calls[0][0];
    expect(callArgs.options.emailRedirectTo).toBe(
      "http://localhost:3000/auth/callback?topic=machine%20learning"
    );
  });
});
