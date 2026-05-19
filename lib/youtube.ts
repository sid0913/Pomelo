export type VideoResult = {
  id: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
};

export async function searchYouTube(
  query: string,
  maxResults = 2
): Promise<VideoResult[]> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return [];

  try {
    const url = new URL("https://www.googleapis.com/youtube/v3/search");
    url.searchParams.set("part", "snippet");
    url.searchParams.set("q", query);
    url.searchParams.set("maxResults", String(maxResults));
    url.searchParams.set("type", "video");
    url.searchParams.set("safeSearch", "strict");
    url.searchParams.set("key", key);

    const res = await fetch(url.toString(), { next: { revalidate: 86400 } });
    if (!res.ok) return [];

    const data = await res.json();
    return (data.items ?? []).map(
      (item: {
        id: { videoId: string };
        snippet: {
          title: string;
          channelTitle: string;
          thumbnails?: { medium?: { url: string } };
        };
      }) => ({
        id: item.id.videoId,
        title: item.snippet.title,
        channelTitle: item.snippet.channelTitle,
        thumbnailUrl: item.snippet.thumbnails?.medium?.url ?? "",
      })
    );
  } catch {
    return [];
  }
}
