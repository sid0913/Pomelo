import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/auth/callback/route";
import { NextRequest } from "next/server";

const mockExchangeCodeForSession = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { exchangeCodeForSession: mockExchangeCodeForSession },
  }),
}));

function makeRequest(params: Record<string, string>) {
  const url = new URL("http://localhost/auth/callback");
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return new NextRequest(url);
}

function redirectLocation(res: Response): string {
  return res.headers.get("location") ?? "";
}

describe("auth/callback/route — open-redirect guard (T11)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExchangeCodeForSession.mockResolvedValue({ error: null });
  });

  it('next="//evil.com" → blocked, redirects to /courses', async () => {
    const res = await GET(makeRequest({ code: "abc", next: "//evil.com" }));
    const loc = redirectLocation(res);
    expect(loc).toContain("/courses");
    expect(loc).not.toContain("evil.com");
  });

  it('next="https://evil.com" → blocked, redirects to /courses', async () => {
    const res = await GET(makeRequest({ code: "abc", next: "https://evil.com" }));
    const loc = redirectLocation(res);
    expect(loc).toContain("/courses");
    expect(loc).not.toContain("evil.com");
  });

  it('next="/reset-password" → allowed, redirects to /reset-password', async () => {
    const res = await GET(makeRequest({ code: "abc", next: "/reset-password" }));
    expect(redirectLocation(res)).toContain("/reset-password");
  });

  it("no next param → redirects to /courses", async () => {
    const res = await GET(makeRequest({ code: "abc" }));
    expect(redirectLocation(res)).toContain("/courses");
  });
});
