export async function searchImage(query: string): Promise<string | null> {
  const wikimedia = await searchWikimediaImage(query);
  if (wikimedia) return wikimedia;
  return searchUnsplashImage(query);
}

async function searchUnsplashImage(query: string): Promise<string | null> {
  try {
    const url = `https://source.unsplash.com/800x600/?${encodeURIComponent(query)}`;
    const res = await fetch(url, { redirect: "follow", next: { revalidate: 86400 } });
    // Validate the redirect lands on an Unsplash CDN, not an arbitrary URL
    if (res.ok && res.url && res.url !== url) {
      try {
        const host = new URL(res.url).hostname;
        if (host === "images.unsplash.com" || host.endsWith(".unsplash.com")) return res.url;
      } catch { /* invalid URL */ }
    }
    return null;
  } catch {
    return null;
  }
}

export async function searchWikimediaImage(query: string): Promise<string | null> {
  try {
    const url = new URL("https://commons.wikimedia.org/w/api.php");
    url.searchParams.set("action", "query");
    url.searchParams.set("generator", "search");
    url.searchParams.set("gsrsearch", query);
    url.searchParams.set("gsrnamespace", "6"); // File namespace
    url.searchParams.set("gsrlimit", "5");
    url.searchParams.set("prop", "imageinfo");
    url.searchParams.set("iiprop", "url|mime");
    url.searchParams.set("format", "json");
    url.searchParams.set("origin", "*");

    const res = await fetch(url.toString(), { next: { revalidate: 86400 } });
    if (!res.ok) return null;

    const data = await res.json() as {
      query?: { pages?: Record<string, { imageinfo?: Array<{ url: string; mime: string }> }> };
    };
    const pages = data.query?.pages ?? {};

    for (const page of Object.values(pages)) {
      const info = page.imageinfo?.[0];
      if (
        info?.url &&
        (info.mime === "image/jpeg" ||
          info.mime === "image/png" ||
          info.mime === "image/svg+xml") &&
        info.url.startsWith("https://upload.wikimedia.org/")
      ) {
        return info.url;
      }
    }
    return null;
  } catch {
    return null;
  }
}
