import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { LandingPage } from "@/app/LandingPage";

// ── Next.js navigation mock ───────────────────────────────────────────────────
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn() }),
}));

// ── Supabase mock ─────────────────────────────────────────────────────────────
const mockSignInWithOtp = vi.fn();
const mockVerifyOtp = vi.fn();
const mockSignInWithPassword = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      signInWithOtp: mockSignInWithOtp,
      verifyOtp: mockVerifyOtp,
      signInWithPassword: mockSignInWithPassword,
    },
  }),
}));

// ── localStorage stub ─────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────

describe("LandingPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    mockSignInWithOtp.mockResolvedValue({ error: null });
    mockVerifyOtp.mockResolvedValue({ error: null });
    mockSignInWithPassword.mockResolvedValue({ error: null });
  });

  // ── topic step (default) ───────────────────────────────────────────────────

  it("renders the topic step by default", () => {
    render(<LandingPage />);
    expect(screen.getByPlaceholderText(/molecular biology/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /get started/i })).toBeInTheDocument();
  });

  it("renders 'Sign in' button in header on topic step", () => {
    render(<LandingPage />);
    expect(screen.getByRole("button", { name: /^sign in$/i })).toBeInTheDocument();
  });

  // ── topic → email navigation (new user flow) ───────────────────────────────

  it("submitting topic navigates to email step", () => {
    render(<LandingPage />);
    const topicInput = screen.getByPlaceholderText(/molecular biology/i);
    fireEvent.change(topicInput, { target: { value: "machine learning" } });
    fireEvent.submit(topicInput.closest("form")!);
    expect(screen.getByPlaceholderText(/you@example.com/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /send code/i })).toBeInTheDocument();
  });

  // ── email step: OTP send ──────────────────────────────────────────────────

  it("sendOtp is called with email and shouldCreateUser flag", async () => {
    render(<LandingPage />);
    fireEvent.change(screen.getByPlaceholderText(/molecular biology/i), {
      target: { value: "machine learning" },
    });
    fireEvent.submit(screen.getByPlaceholderText(/molecular biology/i).closest("form")!);

    const emailInput = screen.getByPlaceholderText(/you@example.com/i);
    fireEvent.change(emailInput, { target: { value: "user@example.com" } });
    fireEvent.submit(emailInput.closest("form")!);

    await waitFor(() => expect(mockSignInWithOtp).toHaveBeenCalledTimes(1));
    expect(mockSignInWithOtp).toHaveBeenCalledWith({
      email: "user@example.com",
      options: { shouldCreateUser: true },
    });
  });

  it("OTP step shown after successful sendOtp", async () => {
    render(<LandingPage />);
    fireEvent.change(screen.getByPlaceholderText(/molecular biology/i), {
      target: { value: "machine learning" },
    });
    fireEvent.submit(screen.getByPlaceholderText(/molecular biology/i).closest("form")!);

    const emailInput = screen.getByPlaceholderText(/you@example.com/i);
    fireEvent.change(emailInput, { target: { value: "user@example.com" } });
    fireEvent.submit(emailInput.closest("form")!);

    await waitFor(() => {
      expect(screen.getByText(/check your inbox/i)).toBeInTheDocument();
    });
    expect(screen.getByPlaceholderText("000000")).toBeInTheDocument();
  });

  it("shows error message when sendOtp fails", async () => {
    mockSignInWithOtp.mockResolvedValueOnce({ error: new Error("rate limited") });
    render(<LandingPage />);
    fireEvent.change(screen.getByPlaceholderText(/molecular biology/i), {
      target: { value: "machine learning" },
    });
    fireEvent.submit(screen.getByPlaceholderText(/molecular biology/i).closest("form")!);

    const emailInput = screen.getByPlaceholderText(/you@example.com/i);
    fireEvent.change(emailInput, { target: { value: "user@example.com" } });
    fireEvent.submit(emailInput.closest("form")!);

    await waitFor(() => {
      expect(screen.getByText(/couldn't send a code/i)).toBeInTheDocument();
    });
    expect(screen.queryByPlaceholderText("000000")).not.toBeInTheDocument();
  });

  // ── signin step (returning user) ──────────────────────────────────────────

  it("clicking 'Sign in' switches to signin step", () => {
    render(<LandingPage />);
    fireEvent.click(screen.getByRole("button", { name: /^sign in$/i }));
    expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
  });

  it("signin step shows back button that returns to topic step", () => {
    render(<LandingPage />);
    fireEvent.click(screen.getByRole("button", { name: /^sign in$/i }));
    expect(screen.getByText(/welcome back/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /back/i }));
    expect(screen.getByPlaceholderText(/molecular biology/i)).toBeInTheDocument();
    expect(screen.queryByText(/welcome back/i)).not.toBeInTheDocument();
  });

  it("signInWithPassword called with correct credentials", async () => {
    render(<LandingPage />);
    fireEvent.click(screen.getByRole("button", { name: /^sign in$/i }));

    fireEvent.change(screen.getByLabelText(/^email$/i), {
      target: { value: "user@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: "hunter2" },
    });
    fireEvent.submit(screen.getByLabelText(/^password$/i).closest("form")!);

    await waitFor(() => expect(mockSignInWithPassword).toHaveBeenCalledTimes(1));
    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: "user@example.com",
      password: "hunter2",
    });
    expect(mockPush).toHaveBeenCalledWith("/courses");
  });

  it("shows error when signInWithPassword fails", async () => {
    mockSignInWithPassword.mockResolvedValueOnce({ error: new Error("invalid") });
    render(<LandingPage />);
    fireEvent.click(screen.getByRole("button", { name: /^sign in$/i }));

    fireEvent.change(screen.getByLabelText(/^email$/i), {
      target: { value: "user@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: "wrong" },
    });
    fireEvent.submit(screen.getByLabelText(/^password$/i).closest("form")!);

    await waitFor(() => {
      expect(screen.getByText(/wrong email or password/i)).toBeInTheDocument();
    });
    expect(mockPush).not.toHaveBeenCalled();
  });
});
