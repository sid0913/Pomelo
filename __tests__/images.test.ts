import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { searchImage, searchWikimediaImage } from "@/lib/images";

// ── searchWikimediaImage ───────────────────────────────────────────────────────

describe("searchWikimediaImage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the first jpeg image URL from a successful response", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        query: {
          pages: {
            "12345": {
              imageinfo: [{ url: "https://upload.wikimedia.org/photo.jpg", mime: "image/jpeg" }],
            },
          },
        },
      }),
    } as unknown as Response);

    const result = await searchWikimediaImage("cat");
    expect(result).toBe("https://upload.wikimedia.org/photo.jpg");
  });

  it("returns the first png image URL from a successful response", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        query: {
          pages: {
            "99": {
              imageinfo: [{ url: "https://upload.wikimedia.org/diagram.png", mime: "image/png" }],
            },
          },
        },
      }),
    } as unknown as Response);

    const result = await searchWikimediaImage("diagram");
    expect(result).toBe("https://upload.wikimedia.org/diagram.png");
  });

  it("returns svg URL from upload.wikimedia.org (SVG allowed, origin-checked)", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        query: {
          pages: {
            "42": {
              imageinfo: [{ url: "https://upload.wikimedia.org/icon.svg", mime: "image/svg+xml" }],
            },
          },
        },
      }),
    } as unknown as Response);

    const result = await searchWikimediaImage("icon");
    expect(result).toBe("https://upload.wikimedia.org/icon.svg");
  });

  it("rejects svg from non-Wikimedia origin (origin check blocks it)", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        query: {
          pages: {
            "42": {
              imageinfo: [{ url: "https://evil.example.com/xss.svg", mime: "image/svg+xml" }],
            },
          },
        },
      }),
    } as unknown as Response);

    const result = await searchWikimediaImage("icon");
    expect(result).toBeNull();
  });

  it("skips unsupported mime types (e.g. video/ogg) and returns null when none match", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        query: {
          pages: {
            "7": {
              imageinfo: [{ url: "https://upload.wikimedia.org/video.ogv", mime: "video/ogg" }],
            },
          },
        },
      }),
    } as unknown as Response);

    const result = await searchWikimediaImage("some video");
    expect(result).toBeNull();
  });

  it("returns null when response is not ok", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: false,
    } as unknown as Response);

    const result = await searchWikimediaImage("anything");
    expect(result).toBeNull();
  });

  it("returns null when query.pages is empty", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({ query: { pages: {} } }),
    } as unknown as Response);

    const result = await searchWikimediaImage("obscure topic");
    expect(result).toBeNull();
  });

  it("returns null when query is absent from response", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    } as unknown as Response);

    const result = await searchWikimediaImage("nothing");
    expect(result).toBeNull();
  });

  it("returns null when imageinfo is missing on a page", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        query: {
          pages: {
            "1": {},
          },
        },
      }),
    } as unknown as Response);

    const result = await searchWikimediaImage("bare page");
    expect(result).toBeNull();
  });

  it("returns null when imageinfo array is empty", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        query: {
          pages: {
            "1": { imageinfo: [] },
          },
        },
      }),
    } as unknown as Response);

    const result = await searchWikimediaImage("empty info");
    expect(result).toBeNull();
  });

  it("returns null when fetch throws", async () => {
    vi.spyOn(global, "fetch").mockRejectedValueOnce(new Error("Network failure"));

    const result = await searchWikimediaImage("crash");
    expect(result).toBeNull();
  });

  it("returns first valid jpeg from upload.wikimedia.org when multiple pages exist with different mime types", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        query: {
          pages: {
            "1": {
              imageinfo: [{ url: "https://upload.wikimedia.org/file.ogv", mime: "video/ogg" }],
            },
            "2": {
              imageinfo: [{ url: "https://upload.wikimedia.org/file.jpg", mime: "image/jpeg" }],
            },
          },
        },
      }),
    } as unknown as Response);

    const result = await searchWikimediaImage("multi page");
    expect(result).toBe("https://upload.wikimedia.org/file.jpg");
  });
});

// ── searchImage (tiered: Wikimedia → Unsplash) ────────────────────────────────

describe("searchImage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns Wikimedia URL when Wikimedia succeeds", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        query: {
          pages: {
            "1": {
              imageinfo: [{ url: "https://upload.wikimedia.org/photo.jpg", mime: "image/jpeg" }],
            },
          },
        },
      }),
    } as unknown as Response);

    const result = await searchImage("cat");
    expect(result).toBe("https://upload.wikimedia.org/photo.jpg");
  });

  it("falls back to Unsplash when Wikimedia returns null", async () => {
    const unsplashUrl = "https://images.unsplash.com/photo-1234?w=800";

    vi.spyOn(global, "fetch")
      // First call: Wikimedia — empty result
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ query: { pages: {} } }),
      } as unknown as Response)
      // Second call: Unsplash redirect
      .mockResolvedValueOnce({
        ok: true,
        url: unsplashUrl,
      } as unknown as Response);

    const result = await searchImage("dog");
    expect(result).toBe(unsplashUrl);
  });

  it("returns null when both Wikimedia and Unsplash fail", async () => {
    vi.spyOn(global, "fetch")
      // Wikimedia: not ok
      .mockResolvedValueOnce({ ok: false } as unknown as Response)
      // Unsplash: throws
      .mockRejectedValueOnce(new Error("Unsplash down"));

    const result = await searchImage("impossible query");
    expect(result).toBeNull();
  });

  it("returns null when Wikimedia throws and Unsplash returns same URL as the constructed request URL (no redirect)", async () => {
    // The implementation checks res.url !== constructedUrl.
    // Construct the exact URL the code will build for the query "no redirect".
    const query = "no redirect";
    const constructedUrl = `https://source.unsplash.com/800x600/?${encodeURIComponent(query)}`;

    vi.spyOn(global, "fetch")
      // Wikimedia: throws
      .mockRejectedValueOnce(new Error("Network error"))
      // Unsplash: ok but url equals the constructed URL (no redirect happened)
      .mockResolvedValueOnce({
        ok: true,
        url: constructedUrl,
      } as unknown as Response);

    const result = await searchImage(query);
    // res.url === constructed url → no redirect → return null
    expect(result).toBeNull();
  });

  it("returns null when Wikimedia throws and Unsplash returns not ok", async () => {
    vi.spyOn(global, "fetch")
      .mockRejectedValueOnce(new Error("Wikimedia down"))
      .mockResolvedValueOnce({ ok: false } as unknown as Response);

    const result = await searchImage("fail both");
    expect(result).toBeNull();
  });
});
