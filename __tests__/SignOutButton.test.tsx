import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SignOutButton } from "@/app/(app)/SignOutButton";

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockSignOut = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      signOut: mockSignOut,
    },
  }),
}));

// ──────────────────────────────────────────────────────────────────────────

describe("SignOutButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: signOut resolves successfully
    mockSignOut.mockResolvedValue({ error: null });
  });

  it("renders a button with 'Sign out' text", () => {
    render(<SignOutButton />);
    expect(
      screen.getByRole("button", { name: /sign out/i })
    ).toBeInTheDocument();
  });

  it("calls supabase.auth.signOut when clicked", async () => {
    render(<SignOutButton />);
    fireEvent.click(screen.getByRole("button", { name: /sign out/i }));
    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledTimes(1);
    });
  });

  it("redirects to '/' after sign out", async () => {
    render(<SignOutButton />);
    fireEvent.click(screen.getByRole("button", { name: /sign out/i }));
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/");
    });
  });

  it("calls router.push('/') AFTER signOut resolves", async () => {
    // Verify ordering: signOut must finish before redirect
    let signOutResolved = false;
    mockSignOut.mockImplementation(async () => {
      await new Promise((r) => setTimeout(r, 10));
      signOutResolved = true;
      return { error: null };
    });

    render(<SignOutButton />);
    fireEvent.click(screen.getByRole("button", { name: /sign out/i }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/");
    });
    expect(signOutResolved).toBe(true);
  });
});
